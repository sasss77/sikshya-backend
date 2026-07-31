require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  const tutorId = '6a5729c5271998721ef7e983';
  const profile = await mongoose.connection.db.collection('tutorprofiles').findOne({ userId: new mongoose.Types.ObjectId(tutorId) });
  console.dir(profile, { depth: null });
  process.exit(0);
}

run().catch(console.error);
