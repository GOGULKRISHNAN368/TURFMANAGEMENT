const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname);
const dbPath = path.join(dataDir, 'db.json');
const seedPath = path.join(dataDir, 'seed.json');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureStore() {
  if (!fs.existsSync(dbPath)) {
    fs.copyFileSync(seedPath, dbPath);
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function writeStore(next) {
  ensureStore();
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(next, null, 2));
  fs.renameSync(temp, dbPath);
  return next;
}

function updateStore(mutator) {
  const db = readStore();
  const result = mutator(db) || db;
  return writeStore(result);
}

module.exports = { clone, readStore, writeStore, updateStore, dbPath };
