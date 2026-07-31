require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  try {
    const db = mongoose.connection.db;
    await db.collection('enrollments').dropIndex('bookingId_1');
    console.log('Successfully dropped bookingId_1 index!');
  } catch (err) {
    console.error('Error dropping index (maybe it does not exist?):', err.message);
  }
  process.exit(0);
}

run();
