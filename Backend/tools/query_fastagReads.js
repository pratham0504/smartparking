// fetch last 10 fastag reads
const mongoose = require('mongoose');
const FastagRead = require('../src/models/fastagReadModel');

const MONGO = process.env.MONGO_ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/parkEz';

async function main(){
  await mongoose.connect(MONGO);
  const docs = await FastagRead.find({}).sort({createdAt:-1}).limit(10).exec();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
}

main().catch(e=>{console.error(e); process.exit(1);});
