const fs = require('fs');
const path = require('path');

const seed = path.join(__dirname, 'data', 'seed.json');
const db = path.join(__dirname, 'data', 'db.json');
fs.copyFileSync(seed, db);
console.log('Local development store reset from seed.json');
