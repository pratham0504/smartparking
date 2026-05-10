// quick script to fetch last 10 passages from MongoDB from Backend context
const mongoose = require('mongoose');
// ensure related models are registered before populating
require('../src/models/cameraEventModel');
require('../src/models/fastagReadModel');
const Passage = require('../src/models/passageModel');

const MONGO = process.env.MONGO_ATLAS_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/parkEz';

async function main(){
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const docs = await Passage.find({}).sort({createdAt:-1}).limit(10).populate('cameraEvent').populate('fastagRead').exec();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
}

main().catch(e=>{console.error(e); process.exit(1);});
