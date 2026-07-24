import Stripe from "stripe";
import { HttpException } from "../exceptions/http-exception";
import { BookingModel } from "../models/booking.model";
import { findTutorProfileByUserId } from "../repositories/tutor.repository";
import { findUserById } from "../repositories/user.repository";
import { createEnrollmentFromBooking } from "./enrollment.service";
import { notifyUser } from "./notification.service";

// NPR to USD conversion rate (fixed for now; can be updated to use a live rate API)
const NPR_TO_USD_RATE = 134;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);


/**
 * Convert NPR to USD, rounded to 2 decimal places
 */
export const convertNPRtoUSD = (amountNPR: number): number => {
  return Math.round((amountNPR / NPR_TO_USD_RATE) * 100) / 100;
};

/**
 * CREATE STRIPE CHECKOUT SESSION
 * Called when a student clicks "Book Session".
 * Returns a Stripe hosted checkout URL.
 */
export const createCheckoutSession = async (
  studentId: string,
  data: {
    tutorId: string;
    subject: string;
    day: string;
    time: string;
    duration?: string;
    notes?: string;
    courseId?: string;
  }
) => {
  // Validate tutor
  const tutor = await findUserById(data.tutorId);
  if (!tutor || tutor.role !== "tutor") {
    throw new HttpException(404, "Tutor not found");
  }

  const tutorProfile = await findTutorProfileByUserId(data.tutorId);
  if (!tutorProfile) {
    throw new HttpException(400, "This tutor has not set up their profile yet");
  }

  if (!tutorProfile.availDays.includes(data.day)) {
    throw new HttpException(
      400,
      `This tutor is not available on ${data.day}. Available days: ${tutorProfile.availDays.join(", ")}`
    );
  }

  if (studentId === data.tutorId) {
    throw new HttpException(400, "You cannot book yourself");
  }

  const student = await findUserById(studentId);
  if (!student) throw new HttpException(404, "Student not found");

  const priceNPR = tutorProfile.hourlyRate;
  const priceUSD = convertNPRtoUSD(priceNPR);
  // Stripe requires integer cents
  const priceInCents = Math.round(priceUSD * 100);

  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tutoring Session — ${data.subject}`,
            description: `1-hour session with ${tutor.fullName} on ${data.day} at ${data.time}`,
          },
          unit_amount: priceInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: student.email,
    success_url: `${CLIENT_URL}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${CLIENT_URL}/dashboard/payment-cancelled`,
    metadata: {
      studentId,
      tutorId: data.tutorId,
      subject: data.subject,
      day: data.day,
      time: data.time,
      duration: data.duration || "60 min",
      notes: data.notes || "",
      courseId: data.courseId || "",
      priceNPR: String(priceNPR),
      priceUSD: String(priceUSD),
    },
  });

  return { url: session.url, sessionId: session.id };
};

/**
 * HANDLE STRIPE WEBHOOK
 * Processes `checkout.session.completed` event.
 * Creates the booking in DB after payment is confirmed.
 */
export const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string
) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    throw new HttpException(400, `Webhook signature verification failed: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata!;

    // Prevent duplicate booking if webhook fires twice
    const existing = await BookingModel.findOne({
      stripeCheckoutSessionId: session.id,
    });
    if (existing) {
      console.log(`[Stripe] Duplicate webhook for session ${session.id}, skipping.`);
      return { received: true };
    }

    const booking = await BookingModel.create({
      studentId: meta.studentId,
      tutorId: meta.tutorId,
      subject: meta.subject,
      day: meta.day,
      time: meta.time,
      duration: meta.duration,
      price: Number(meta.priceNPR),
      priceUSD: Number(meta.priceUSD),
      notes: meta.notes || undefined,
      courseId: meta.courseId || undefined,
      status: "pending",
      paymentStatus: "paid",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.toString(),
    });

    // Notify the tutor about the new booking
    await notifyUser(
      meta.tutorId,
      "booking",
      "New Booking Request",
      `A student has requested a ${meta.duration} session for ${meta.subject} on ${meta.day} at ${meta.time}. Payment of $${meta.priceUSD} USD has been received.`
    );

    console.log(`[Stripe] Booking created: ${booking._id} for session ${session.id}`);
  }

  return { received: true };
};

/**
 * GET CHECKOUT SESSION DETAILS
 * Retrieves a session to show on the success page.
 */
export const getCheckoutSessionDetails = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const meta = session.metadata!;

  // Find the booking created by webhook
  let booking = await BookingModel.findOne({ stripeCheckoutSessionId: sessionId })
    .populate("tutorId", "fullName")
    .populate("studentId", "fullName");

  // Synchronous fallback: If webhook hasn't fired yet but payment succeeded, create booking now
  if (!booking && session.payment_status === "paid") {
    const newBooking = await BookingModel.create({
      studentId: meta.studentId,
      tutorId: meta.tutorId,
      subject: meta.subject,
      day: meta.day,
      time: meta.time,
      duration: meta.duration,
      price: Number(meta.priceNPR),
      priceUSD: Number(meta.priceUSD),
      notes: meta.notes || undefined,
      courseId: meta.courseId || undefined,
      status: "pending",
      paymentStatus: "paid",
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.toString(),
    });

    // Notify the tutor
    await notifyUser(
      meta.tutorId,
      "booking",
      "New Booking Request",
      `A student has requested a ${meta.duration} session for ${meta.subject} on ${meta.day} at ${meta.time}. Payment of $${meta.priceUSD} USD has been received.`
    );
    
    booking = await BookingModel.findById(newBooking._id)
      .populate("tutorId", "fullName")
      .populate("studentId", "fullName");
  }

  return {
    tutorName: (booking?.tutorId as any)?.fullName || "Your Tutor",
    subject: meta?.subject || "",
    day: meta?.day || "",
    time: meta?.time || "",
    priceUSD: meta?.priceUSD || "0",
    priceNPR: meta?.priceNPR || "0",
    bookingId: booking?._id?.toString() || null,
    paymentStatus: session.payment_status,
  };
};

/**
 * REFUND PAYMENT
 * Issues a Stripe refund for a cancelled booking.
 */
export const refundPayment = async (paymentIntentId: string) => {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });
    console.log(`[Stripe] Refund issued: ${refund.id} for payment intent ${paymentIntentId}`);
    return refund;
  } catch (error: any) {
    console.error(`[Stripe] Refund failed: ${error.message}`);
    throw new HttpException(400, `Refund failed: ${error.message}`);
  }
};

/**
 * CREATE PAYMENT INTENT (for flutter_stripe PaymentSheet)
 * Called by Flutter to get a clientSecret, ephemeralKey, and customerId.
 * The PaymentSheet collects card details natively inside the app.
 */
export const createPaymentIntent = async (
  studentId: string,
  data: {
    tutorId: string;
    subject: string;
    day: string;
    time: string;
    duration?: string;
    notes?: string;
    courseId?: string;
  }
) => {
  const tutor = await findUserById(data.tutorId);
  if (!tutor || tutor.role !== "tutor") {
    throw new HttpException(404, "Tutor not found");
  }

  const tutorProfile = await findTutorProfileByUserId(data.tutorId);
  if (!tutorProfile) {
    throw new HttpException(400, "This tutor has not set up their profile yet");
  }

  if (!tutorProfile.availDays.includes(data.day)) {
    throw new HttpException(
      400,
      `This tutor is not available on ${data.day}. Available days: ${tutorProfile.availDays.join(", ")}`
    );
  }

  if (studentId === data.tutorId) {
    throw new HttpException(400, "You cannot book yourself");
  }

  const student = await findUserById(studentId);
  if (!student) throw new HttpException(404, "Student not found");

  const priceNPR = tutorProfile.hourlyRate;
  const priceUSD = convertNPRtoUSD(priceNPR);
  const priceInCents = Math.round(priceUSD * 100);

  // Find or create a Stripe customer for this student
  let customerId: string;
  const existingCustomers = await stripe.customers.list({
    email: student.email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: student.email,
      name: student.fullName,
      metadata: { studentId },
    });
    customerId = customer.id;
  }

  // Create an ephemeral key for the customer
  const ephemeralKey = await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2024-12-18.acacia" }
  );

  // Create the Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: priceInCents,
    currency: "usd",
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: {
      studentId,
      tutorId: data.tutorId,
      subject: data.subject,
      day: data.day,
      time: data.time,
      duration: data.duration || "60 min",
      notes: data.notes || "",
      courseId: data.courseId || "",
      priceNPR: String(priceNPR),
      priceUSD: String(priceUSD),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    ephemeralKey: ephemeralKey.secret,
    customerId,
    paymentIntentId: paymentIntent.id,
    priceNPR,
    priceUSD,
  };
};

/**
 * CONFIRM BOOKING AFTER PAYMENT INTENT SUCCESS
 * Called by Flutter after PaymentSheet.present() succeeds.
 * Creates the booking in DB (same logic as webhook but called directly by Flutter).
 */
export const confirmBookingAfterPayment = async (
  studentId: string,
  paymentIntentId: string
) => {
  // Retrieve the payment intent to get metadata and verify payment succeeded
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new HttpException(400, `Payment not completed. Status: ${paymentIntent.status}`);
  }

  const meta = paymentIntent.metadata;

  // Prevent duplicate booking
  const existing = await BookingModel.findOne({ stripePaymentIntentId: paymentIntentId });
  if (existing) {
    return {
      bookingId: existing._id.toString(),
      subject: meta.subject,
      day: meta.day,
      time: meta.time,
      priceUSD: meta.priceUSD,
      priceNPR: meta.priceNPR,
    };
  }

  const booking = await BookingModel.create({
    studentId: meta.studentId || studentId,
    tutorId: meta.tutorId,
    subject: meta.subject,
    day: meta.day,
    time: meta.time,
    duration: meta.duration,
    price: Number(meta.priceNPR),
    priceUSD: Number(meta.priceUSD),
    notes: meta.notes || undefined,
    courseId: meta.courseId || undefined,
    status: "pending",
    paymentStatus: "paid",
    stripePaymentIntentId: paymentIntentId,
  });

  await notifyUser(
    meta.tutorId,
    "booking",
    "New Booking Request",
    `A student has requested a ${meta.duration} session for ${meta.subject} on ${meta.day} at ${meta.time}. Payment of $${meta.priceUSD} USD has been received.`
  );

  console.log(`[Stripe] Booking created via PaymentSheet: ${booking._id}`);

  return {
    bookingId: booking._id.toString(),
    subject: meta.subject,
    day: meta.day,
    time: meta.time,
    priceUSD: meta.priceUSD,
    priceNPR: meta.priceNPR,
  };
};

