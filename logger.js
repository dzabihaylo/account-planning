const fs = require('fs');
const path = require('path');

// Log path resolution -- matches db.js convention
let LOG_PATH;
if (process.env.LOG_PATH) {
  LOG_PATH = process.env.LOG_PATH;
} else if (fs.existsSync('/data')) {
  LOG_PATH = '/data/errors.log';
} else {
  LOG_PATH = './data/errors.log';
}

// Ensure data directory exists before first write
try {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
} catch (e) {
  // Directory already exists or creation failed -- fall back to console only
}

function rotateIfNeeded() {
  try {
    var stat = fs.statSync(LOG_PATH);
    if (stat.size >= 10 * 1024 * 1024) {
      var rotated = LOG_PATH + '.1';
      try { fs.unlinkSync(rotated); } catch (e) { /* no prior rotation */ }
      fs.renameSync(LOG_PATH, rotated);
    }
  } catch (e) {
    // File does not exist yet -- no rotation needed
  }
}

function log(level, endpoint, errorType, message, accountId) {
  var entry = {
    timestamp: new Date().toISOString(),
    level: level,
    endpoint: endpoint || null,
    error_type: errorType || null,
    message: message,
    account_id: accountId || null
  };

  var jsonString = JSON.stringify(entry);

  // Dual output to console
  if (level === 'error') {
    console.error('[' + level.toUpperCase() + ']', jsonString);
  } else {
    console.log('[' + level.toUpperCase() + ']', jsonString);
  }

  // Write to file -- never throws
  try {
    rotateIfNeeded();
    fs.appendFileSync(LOG_PATH, jsonString + '\n');
  } catch (e) {
    console.error('[LOGGER] File write failed:', e.message);
  }
}

module.exports = { log };
