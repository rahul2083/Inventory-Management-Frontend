const fs = require('fs');
const fsPromises = require('fs/promises');
const Module = require('module');

function cleanPath(p) {
  if (typeof p === 'string') {
    // 1. Remove null bytes (which are prepended to # by Vite/Rollup)
    p = p.replace(/\x00/g, '');
    // 2. Rewrite FULL-STACK-#1 -> FULL-STACK-1
    p = p.replace(/FULL-STACK-#1/gi, 'FULL-STACK-1');
  }
  return p;
}

// ── Patch CWD & Process Env ──────────────────────────────────────────────────
const origCwd = process.cwd;
process.cwd = function() {
  return cleanPath(origCwd.call(process));
};

if (process.env.PWD) {
  process.env.PWD = cleanPath(process.env.PWD);
}
if (process.env.INIT_CWD) {
  process.env.INIT_CWD = cleanPath(process.env.INIT_CWD);
}

// ── Patch Stats symbolic link bypass ─────────────────────────────────────────
function patchStats(stats) {
  if (stats && typeof stats.isSymbolicLink === 'function') {
    stats.isSymbolicLink = () => false;
  }
  return stats;
}

// ── Patch fs.realpathSync & fs.realpath ──────────────────────────────────────
const origRealpathSync = fs.realpathSync;
fs.realpathSync = function(path, options) {
  return cleanPath(origRealpathSync(path, options));
};
fs.realpathSync.native = origRealpathSync.native;

const origRealpath = fs.realpath;
fs.realpath = function(path, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = undefined;
  }
  return origRealpath(path, options, (err, resolvedPath) => {
    if (err) return callback(err);
    callback(null, cleanPath(resolvedPath));
  });
};
fs.realpath.native = origRealpath.native;

// ── Patch fs path-consuming functions ────────────────────────────────────────
const pathFunctions = [
  'readFile', 'readFileSync',
  'readdir', 'readdirSync',
  'access', 'accessSync',
  'open', 'openSync',
  'writeFile', 'writeFileSync',
  'mkdir', 'mkdirSync',
  'rm', 'rmSync',
  'unlink', 'unlinkSync'
];

pathFunctions.forEach(name => {
  if (fs[name]) {
    const orig = fs[name];
    fs[name] = function(path, ...args) {
      return orig.call(this, cleanPath(path), ...args);
    };
  }
  if (fsPromises && fsPromises[name]) {
    const orig = fsPromises[name];
    fsPromises[name] = function(path, ...args) {
      return orig.call(this, cleanPath(path), ...args);
    };
  }
  if (fs.promises && fs.promises[name]) {
    const orig = fs.promises[name];
    fs.promises[name] = function(path, ...args) {
      return orig.call(this, cleanPath(path), ...args);
    };
  }
});

// ── Patch fs stat and lstat functions ────────────────────────────────────────
const statFunctions = ['stat', 'lstat'];
statFunctions.forEach(name => {
  if (fs[name]) {
    const orig = fs[name];
    fs[name] = function(path, options, callback) {
      if (typeof options === 'function') {
        callback = options;
        options = undefined;
      }
      return orig.call(this, cleanPath(path), options, (err, stats) => {
        if (err) return callback(err);
        callback(null, patchStats(stats));
      });
    };
  }
  
  const syncName = name + 'Sync';
  if (fs[syncName]) {
    const orig = fs[syncName];
    fs[syncName] = function(path, options) {
      return patchStats(orig.call(this, cleanPath(path), options));
    };
  }
  
  if (fsPromises && fsPromises[name]) {
    const orig = fsPromises[name];
    fsPromises[name] = async function(path, options) {
      const stats = await orig.call(this, cleanPath(path), options);
      return patchStats(stats);
    };
  }
  
  if (fs.promises && fs.promises[name]) {
    const orig = fs.promises[name];
    fs.promises[name] = async function(path, options) {
      const stats = await orig.call(this, cleanPath(path), options);
      return patchStats(stats);
    };
  }
});

// ── Patch require cache for fs/promises ──────────────────────────────────────
const origRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  const exports = origRequire.apply(this, arguments);
  if (id === 'fs/promises' || id === 'node:fs/promises') {
    if (exports) {
      pathFunctions.forEach(name => {
        if (exports[name]) {
          const orig = exports[name];
          exports[name] = function(path, ...args) {
            return orig.call(this, cleanPath(path), ...args);
          };
        }
      });
      statFunctions.forEach(name => {
        if (exports[name]) {
          const orig = exports[name];
          exports[name] = async function(path, options) {
            const stats = await orig.call(this, cleanPath(path), options);
            return patchStats(stats);
          };
        }
      });
    }
  }
  return exports;
};

console.log('✅ Monkey-patched fs.realpath, process.cwd, path, and stats functions to resolve FULL-STACK-#1 -> FULL-STACK-1, strip null bytes, and bypass symlink check.');
