const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Backup directory resolution -- matches db.js / logger.js convention
let BACKUP_DIR;
if (process.env.BACKUP_DIR) {
  BACKUP_DIR = process.env.BACKUP_DIR;
} else if (fs.existsSync('/data')) {
  BACKUP_DIR = '/data/backups';
} else {
  BACKUP_DIR = './data/backups';
}

const KEEP_COUNT = 5;

function pruneOldBackups() {
  try {
    var files = fs.readdirSync(BACKUP_DIR).filter(function(f) {
      return f.match(/^intel-backup-.*\.db$/);
    });

    if (files.length <= KEEP_COUNT) return;

    // Sort by mtime descending (newest first)
    files = files
      .map(function(f) {
        var full = path.join(BACKUP_DIR, f);
        return { name: f, mtime: fs.statSync(full).mtime };
      })
      .sort(function(a, b) { return b.mtime - a.mtime; })
      .map(function(f) { return f.name; });

    var toDelete = files.slice(KEEP_COUNT);
    toDelete.forEach(function(f) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, f));
        logger.log('info', 'backup', 'BACKUP_PRUNED', 'Pruned old backup: ' + f, null);
      } catch (e) {
        logger.log('error', 'backup', 'BACKUP_PRUNE_FAILED', 'Could not prune ' + f + ': ' + e.message, null);
      }
    });
  } catch (e) {
    logger.log('error', 'backup', 'BACKUP_PRUNE_ERROR', e.message, null);
  }
}

function runBackup(dbPath) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    var timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\.\d+Z$/, 'Z');
    var filename = 'intel-backup-' + timestamp + '.db';
    var dest = path.join(BACKUP_DIR, filename);

    // Copy only the .db file -- not .db-shm or .db-wal
    fs.copyFileSync(dbPath, dest);

    logger.log('info', 'backup', 'BACKUP_COMPLETE', 'Backup created: ' + path.basename(dest), null);
    pruneOldBackups();
  } catch (e) {
    logger.log('error', 'backup', 'BACKUP_FAILED', e.message, null);
  }
}

function startBackupScheduler(dbPath) {
  var intervalHours = Math.max(1, parseInt(process.env.BACKUP_INTERVAL_HOURS) || 6);
  var intervalMs = intervalHours * 60 * 60 * 1000;

  logger.log('info', 'backup', 'SCHEDULER_STARTED', 'Backup interval: ' + intervalHours + ' hours', null);

  // Run once immediately at startup
  try { runBackup(dbPath); } catch (e) { /* already logged inside runBackup */ }

  setInterval(function() {
    try { runBackup(dbPath); } catch (e) { /* already logged inside runBackup */ }
  }, intervalMs);
}

module.exports = { startBackupScheduler, runBackup };
