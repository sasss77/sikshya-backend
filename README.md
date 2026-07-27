# Sikshya Backend

A Node.js + TypeScript backend for the Sikshya tutoring marketplace. This API provides user authentication, role-based access control, student and tutor profile management, booking and payment processing, real-time chat, notifications, AI-powered assistance, and admin tools.

## Key Features

- JWT-based authentication and authorization
- Google login support
- Role management: `student`, `tutor`, `admin`, and `unassigned`
- Student verification flow for booking tutors
- Tutor profile management, course creation, module/content management, and public tutor discovery
- Booking workflows for students and tutors
- Stripe checkout integration with webhook handling
- Real-time messaging using Socket.IO
- Notification management for users and tutors
- AI assistant and MCQ generation using Groq
- Google OAuth setup route for Calendar API refresh token generation
- Static file serving for uploaded profile and course files

## Project Structure

- `index.ts` - Application bootstrap, Socket.IO configuration, and server startup
- `src/app.ts` - Express application setup, route registration, middleware, and error handling
- `src/database/mongodb.ts` - MongoDB connection setup
- `src/routes/` - Express route definitions for each functional area
- `src/controllers/` - Request handlers and response formatting
- `src/services/` - Business logic and integrations
- `src/repositories/` - Database access and query helpers
- `src/models/` - Mongoose schemas and models
- `src/middlewares/` - Authentication, authorization, file upload, and request validation
- `src/seed.ts` - Seed script for creating a default admin user
- `uploads/` - User-uploaded images and course files

## Deployment

- Backend is deployed at: `https://sikshya-backend.onrender.com`

## Prerequisites

- Node.js 18+ (or compatible current LTS version)
- npm
- MongoDB instance
- Stripe account for payment integration
- Groq API key for AI features
- Google Cloud project credentials for Google Calendar / OAuth integration

## Installation

1. Clone the repository:

```bash
git clone https://github.com/sasss77/sikshya-backend.git
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the project root and configure environment variables.

## Environment Variables

Create a `.env` file with the following settings:

```env
PORT=5000
CLIENT_URL=http://localhost:3000
SERVER_URL=http://localhost:5000
MONGODB_URI=mongodb://localhost:27017/sikshya
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
ADMIN_EMAIL=admin@sikshya.com
ADMIN_PASSWORD=Admin@123
ADMIN_NAME=Sikshya Admin
GROQ_API_KEY=your_groq_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
GOOGLE_CALENDAR_ID=primary
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Notes:
- `GOOGLE_REFRESH_TOKEN` is generated via the `/api/google/auth-url` and `/api/google/callback` flow.
- `STRIPE_WEBHOOK_SECRET` is required for webhook verification when using Stripe webhooks.

## Running the Project

Start the backend in development mode:

```bash
npm run dev
```

If you need to create the default admin user, run:

```bash
npm run seed
```

## API Overview

### Health Check

- `GET /` — Returns a simple health check response.

### User Authentication

- `POST /api/users/register` — Register a new user
- `POST /api/users/login` — Login with email and password
- `POST /api/users/google-login` — Login with Google ID token
- `POST /api/users/set-role` — Set role for an authenticated user
- `GET /api/users/whoami` — Get current authenticated user profile
- `PATCH /api/users/update-profile` — Update profile fields and upload profile image
- `PATCH /api/users/profile-update` — Alias for updating user profile

### Student Routes

- `POST /api/students/verify` — Verify student profile
- `GET /api/students/profile` — Get verified student profile
- `GET /api/students/dashboard` — Student dashboard data
- `GET /api/students/:id` — Get a student by ID

### Tutor Routes

- `GET /api/tutors` — Public tutor listing with search and filtering
- `GET /api/tutors/my-profile` — Get authenticated tutor profile
- `PUT /api/tutors/profile` — Save or update tutor profile
- `GET /api/tutors/courses` — List tutor courses
- `POST /api/tutors/courses` — Add a course
- `PUT /api/tutors/courses/:courseId` — Update a course
- `DELETE /api/tutors/courses/:courseId` — Delete a course
- `POST /api/tutors/courses/:courseId/modules` — Add a module
- `DELETE /api/tutors/courses/:courseId/modules/:moduleIndex` — Delete a module
- `POST /api/tutors/courses/:courseId/modules/:moduleIndex/contents` — Add module content
- `DELETE /api/tutors/courses/:courseId/modules/:moduleIndex/contents/:contentIndex` — Delete module content
- `POST /api/tutors/upload-content` — Upload course file
- `GET /api/tutors/:id/booked-slots` — Get booked slots for a tutor
- `GET /api/tutors/:id` — Public tutor profile by ID

### Booking Routes

- `POST /api/bookings` — Create a new booking (verified students only)
- `GET /api/bookings` — Get bookings for authenticated user
- `GET /api/bookings/learnings` — Get student learning history
- `PATCH /api/bookings/learnings/:enrollmentId/topic` — Toggle lesson topic completion
- `POST /api/bookings/enroll` — Enroll student manually into a course
- `GET /api/bookings/learnings/:enrollmentId` — Get enrollment detail
- `PATCH /api/bookings/learnings/:enrollmentId/module` — Mark module read/unread
- `PATCH /api/bookings/:id/status` — Update booking status (accept/decline/cancel/complete)

### Notification Routes

- `GET /api/notifications` — Get notifications for authenticated user
- `PATCH /api/notifications/read-all` — Mark all notifications as read
- `DELETE /api/notifications/clear-all` — Clear all notifications
- `PATCH /api/notifications/:id/read` — Mark a notification as read
- `GET /api/notifications/my-students` — Get tutor's students
- `POST /api/notifications/send` — Send a notification to a student

### Chat Routes

- `GET /api/chat/search` — Search users for messaging
- `GET /api/chat/rooms` — List chat rooms for authenticated user
- `POST /api/chat/rooms` — Create or get a chat room with another user
- `GET /api/chat/rooms/:roomId/messages` — Get messages for a room

### AI Routes

- `POST /api/ai/chat` — AI chat assistant powered by Groq
- `POST /api/ai/mcq` — Generate multiple-choice questions from AI

### Google OAuth Routes

- `GET /api/google/auth-url` — Get URL to authorize Google Calendar access
- `GET /api/google/callback` — Exchange authorization code for refresh token

### Payment Routes

- `POST /api/payments/create-checkout-session` — Create a Stripe checkout session
- `POST /api/payments/webhook` — Receive Stripe webhook events
- `GET /api/payments/session/:sessionId` — Retrieve Stripe checkout session details

### Admin Routes

- `GET /api/v1/admin/users` — List all users
- `GET /api/v1/admin/users/:id` — Get user by ID
- `POST /api/v1/admin/users` — Create a user
- `PATCH /api/v1/admin/users/:id` — Update a user
- `PUT /api/v1/admin/users/:id` — Update a user
- `DELETE /api/v1/admin/users/:id` — Delete a user
- `GET /api/v1/admin/users/stats` — Get admin statistics
- `GET /api/v1/admin/users/requests` — Get admin user requests
- `PATCH /api/v1/admin/users/:id/verify-admin` — Verify a user as admin
- `POST /api/v1/admin/users/notifications/send` — Send an admin notification
- `GET /api/v1/admin/users/courses` — Get all tutor courses
- `GET /api/v1/admin/users/courses/:id` — Get course details by ID

## Socket.IO Events

The backend exposes a Socket.IO server on the same port as the Express app.

Supported events:

- `join_room` — Join a chat room
- `send_message` — Send a chat message
- `typing` — Typing indicator
- `mark_read` — Mark room messages as read
- `user_online` — Broadcast when a user comes online
- `user_offline` — Broadcast when a user disconnects
- `receive_message` — Receive a message in the room
- `new_message_notification` — Notify recipient of a new message
- `messages_read` — Notify room when messages have been read
- `typing_update` — Notify others that a user is typing

Authentication for Socket.IO connections is performed with a JWT token sent in `socket.handshake.auth.token`.

## Static Assets

Uploaded files are served from the `uploads/` directory at `/uploads`.

## Notes

- Stripe webhook requests require the raw request body; this is configured in `src/app.ts`.
- The seed script will create a default admin account if it does not already exist.
- The project currently does not include automated tests.

## License

This project is licensed under the ISC License.
