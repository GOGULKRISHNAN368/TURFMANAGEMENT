const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname);
const dbPath = path.join(dataDir, 'db.json');
const seedPath = path.join(dataDir, 'seed.json');
const resourceCollections = ['admins', 'registrations', 'teams', 'fixtures', 'matches', 'standings', 'auditLogs', 'footballEvents', 'cricketDeliveries', 'counters'];
let cache = null;
let mongoCollection = null;
let storageMode = 'json';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  if (!fs.existsSync(dbPath)) {
    fs.copyFileSync(seedPath, dbPath);
  }
}

function readStore() {
  if (!cache) { ensureStore(); cache = JSON.parse(fs.readFileSync(dbPath, 'utf8')); }
  return cache;
}

function writeStore(next) {
  cache = next;
  ensureStore();
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2));
  fs.renameSync(temp, dbPath);
  persistMongo(next).catch((error) => console.warn(`MongoDB write skipped: ${error.message}`));
  return next;
}

function updateStore(mutator) {
  const db = readStore();
  const result = mutator(db) || db;
  return writeStore(result);
}

async function connectStore() {
  ensureStore();
  cache = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  if (!process.env.MONGODB_URI) return { mode:storageMode, message:'MONGODB_URI not configured; using local JSON store.' };
  let MongoClient;
  try { ({ MongoClient } = require('mongodb')); } catch { return { mode:storageMode, message:'MongoDB URI found, but the mongodb package is not installed; using local JSON store.' }; }
  try {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS:5000 });
    await client.connect();
    mongoCollection = client.db().collection('nightleague_records');
    const docs = await mongoCollection.find({}).toArray();
    if (docs.length) {
      const fromMongo = clone(cache);
      for (const type of resourceCollections) if (Array.isArray(fromMongo[type])) fromMongo[type] = [];
      for (const doc of docs) {
        if (doc.type === 'tournament') fromMongo.tournament = doc.data;
        else if (Array.isArray(fromMongo[doc.type])) fromMongo[doc.type].push(doc.data);
        else if (doc.type === 'counters') fromMongo.counters = doc.data;
      }
      cache = fromMongo; writeLocal(cache);
    } else await persistMongo(cache);
    storageMode = 'mongodb';
    return { mode:storageMode, message:'MongoDB Atlas connected.' };
  } catch (error) {
    mongoCollection = null;
    return { mode:'json', message:`MongoDB connection unavailable; using local JSON store. ${error.message}` };
  }
}

function writeLocal(next) {
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2));
  fs.renameSync(temp, dbPath);
}

async function persistMongo(state) {
  if (!mongoCollection) return;
  const records = [{ type:'tournament', key:state.tournament.id, data:state.tournament }, ...resourceCollections.flatMap((type) => {
    const value = state[type];
    if (Array.isArray(value)) return value.map((data, index) => ({ type, key:String(data.id || index), data }));
    return [{ type, key:type, data:value }];
  })];
  for (const type of ['tournament', ...resourceCollections]) {
    await mongoCollection.deleteMany({ type });
  }
  if (records.length) await mongoCollection.insertMany(records);
}

module.exports = { clone, readStore, writeStore, updateStore, connectStore, dbPath, getStorageMode:() => storageMode };
