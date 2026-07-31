require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const { EnrollmentModel } = require('./src/models/enrollment.model.ts'); // Need to use ts-node for this?
  
  process.exit(0);
}

run().catch(console.error);
