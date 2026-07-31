require('dotenv').config();
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const enrollmentTopicSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const enrollmentSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tutorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "TutorProfile.courses",
    },
    subject: { type: String, required: true, trim: true },
    totalSessions: { type: Number, default: 1, min: 0 },
    completedSessions: { type: Number, default: 0, min: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    nextSession: { type: String, default: null },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed"],
      default: "not_started",
    },
    topics: { type: [enrollmentTopicSchema], default: [] },
    completedModules: { type: [String], default: [] },
  },
  { timestamps: true }
);

const EnrollmentModel = mongoose.model("Enrollment", enrollmentSchema);

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  try {
    const doc = {
      studentId: new mongoose.Types.ObjectId('6a55af3cdd0799ce0b817734'),
      tutorId: new mongoose.Types.ObjectId('6a5729c5271998721ef7e983'),
      courseId: new mongoose.Types.ObjectId('6a69fdadb1f338b2f3ae840b'),
      subject: 'Physics',
      totalSessions: 0,
      nextSession: null,
      topics: [ { label: 'heat', done: false }, { label: 'force', done: false } ]
    };
    
    console.log('Creating...', doc);
    const result = await EnrollmentModel.create(doc);
    console.log('Success:', result);
  } catch (err) {
    console.error('Validation Error:', err);
  }
  process.exit(0);
}

run();
