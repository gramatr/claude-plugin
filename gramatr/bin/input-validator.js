#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// dist/hooks/generated/hook-timeouts.js
var HOOK_STDIN_DEFAULT_TIMEOUT_MS, HOOK_STATE_ABORT_TIMEOUT_MS;
var init_hook_timeouts = __esm({
  "dist/hooks/generated/hook-timeouts.js"() {
    "use strict";
    HOOK_STDIN_DEFAULT_TIMEOUT_MS = 2e3;
    HOOK_STATE_ABORT_TIMEOUT_MS = 5e3;
  }
});

// dist/config-runtime.js
function sanitizeEnvToken(raw) {
  if (!raw)
    return "";
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "null" || trimmed === "undefined")
    return "";
  return raw;
}
function getGramatrTokenFromEnv() {
  const current = sanitizeEnvToken(process.env.GRAMATR_TOKEN);
  if (current)
    return current;
  const legacy = sanitizeEnvToken(process.env.AIOS_MCP_TOKEN);
  if (legacy)
    return legacy;
  return null;
}
function getGramatrUrlFromEnv() {
  const url = process.env.GRAMATR_URL;
  return url && url.length > 0 ? url : null;
}
function getGramatrDirFromEnv() {
  const dir = process.env.GRAMATR_DIR;
  return dir && dir.length > 0 ? dir : null;
}
function getHomeDir() {
  const home = process.env.HOME;
  if (home && home.length > 0)
    return home;
  const userProfile = process.env.USERPROFILE;
  if (userProfile && userProfile.length > 0)
    return userProfile;
  return "";
}
var init_config_runtime = __esm({
  "dist/config-runtime.js"() {
    "use strict";
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf) Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb) process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : (function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb) cb(er);
            });
          }
          if (Object.setPrototypeOf) Object.setPrototypeOf(rename, fs$rename);
          return rename;
        })(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : (function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf) Object.setPrototypeOf(read, fs$read);
        return read;
      })(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ (function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      })(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback) callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback) callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb) cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb) cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb) process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig) return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig) return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig) return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er)) er = null;
            if (cb) cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig) return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er)) throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig) return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0) stats.uid += 4294967296;
              if (stats.gid < 0) stats.gid += 4294967296;
            }
            if (cb) cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig) return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0) stats.uid += 4294967296;
            if (stats.gid < 0) stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream)) return new ReadStream(path, options);
        Stream.call(this);
        var self = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding) this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self.emit("error", err);
            self.readable = false;
            return;
          }
          self.fd = fd;
          self.emit("open", fd);
          self._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream)) return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// ../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "../../node_modules/.pnpm/graceful-fs@4.2.11/node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = Symbol.for("graceful-fs.queue");
      previousSymbol = Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = (function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      })(fs.close);
      fs.closeSync = (function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      })(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open;
      function open(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry_operation.js
var require_retry_operation = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry_operation.js"(exports2, module2) {
    function RetryOperation(timeouts, options) {
      if (typeof options === "boolean") {
        options = { forever: options };
      }
      this._originalTimeouts = JSON.parse(JSON.stringify(timeouts));
      this._timeouts = timeouts;
      this._options = options || {};
      this._maxRetryTime = options && options.maxRetryTime || Infinity;
      this._fn = null;
      this._errors = [];
      this._attempts = 1;
      this._operationTimeout = null;
      this._operationTimeoutCb = null;
      this._timeout = null;
      this._operationStart = null;
      if (this._options.forever) {
        this._cachedTimeouts = this._timeouts.slice(0);
      }
    }
    module2.exports = RetryOperation;
    RetryOperation.prototype.reset = function() {
      this._attempts = 1;
      this._timeouts = this._originalTimeouts;
    };
    RetryOperation.prototype.stop = function() {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      this._timeouts = [];
      this._cachedTimeouts = null;
    };
    RetryOperation.prototype.retry = function(err) {
      if (this._timeout) {
        clearTimeout(this._timeout);
      }
      if (!err) {
        return false;
      }
      var currentTime = (/* @__PURE__ */ new Date()).getTime();
      if (err && currentTime - this._operationStart >= this._maxRetryTime) {
        this._errors.unshift(new Error("RetryOperation timeout occurred"));
        return false;
      }
      this._errors.push(err);
      var timeout = this._timeouts.shift();
      if (timeout === void 0) {
        if (this._cachedTimeouts) {
          this._errors.splice(this._errors.length - 1, this._errors.length);
          this._timeouts = this._cachedTimeouts.slice(0);
          timeout = this._timeouts.shift();
        } else {
          return false;
        }
      }
      var self = this;
      var timer = setTimeout(function() {
        self._attempts++;
        if (self._operationTimeoutCb) {
          self._timeout = setTimeout(function() {
            self._operationTimeoutCb(self._attempts);
          }, self._operationTimeout);
          if (self._options.unref) {
            self._timeout.unref();
          }
        }
        self._fn(self._attempts);
      }, timeout);
      if (this._options.unref) {
        timer.unref();
      }
      return true;
    };
    RetryOperation.prototype.attempt = function(fn, timeoutOps) {
      this._fn = fn;
      if (timeoutOps) {
        if (timeoutOps.timeout) {
          this._operationTimeout = timeoutOps.timeout;
        }
        if (timeoutOps.cb) {
          this._operationTimeoutCb = timeoutOps.cb;
        }
      }
      var self = this;
      if (this._operationTimeoutCb) {
        this._timeout = setTimeout(function() {
          self._operationTimeoutCb();
        }, self._operationTimeout);
      }
      this._operationStart = (/* @__PURE__ */ new Date()).getTime();
      this._fn(this._attempts);
    };
    RetryOperation.prototype.try = function(fn) {
      console.log("Using RetryOperation.try() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = function(fn) {
      console.log("Using RetryOperation.start() is deprecated");
      this.attempt(fn);
    };
    RetryOperation.prototype.start = RetryOperation.prototype.try;
    RetryOperation.prototype.errors = function() {
      return this._errors;
    };
    RetryOperation.prototype.attempts = function() {
      return this._attempts;
    };
    RetryOperation.prototype.mainError = function() {
      if (this._errors.length === 0) {
        return null;
      }
      var counts = {};
      var mainError = null;
      var mainErrorCount = 0;
      for (var i = 0; i < this._errors.length; i++) {
        var error = this._errors[i];
        var message = error.message;
        var count = (counts[message] || 0) + 1;
        counts[message] = count;
        if (count >= mainErrorCount) {
          mainError = error;
          mainErrorCount = count;
        }
      }
      return mainError;
    };
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry.js
var require_retry = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/lib/retry.js"(exports2) {
    var RetryOperation = require_retry_operation();
    exports2.operation = function(options) {
      var timeouts = exports2.timeouts(options);
      return new RetryOperation(timeouts, {
        forever: options && options.forever,
        unref: options && options.unref,
        maxRetryTime: options && options.maxRetryTime
      });
    };
    exports2.timeouts = function(options) {
      if (options instanceof Array) {
        return [].concat(options);
      }
      var opts = {
        retries: 10,
        factor: 2,
        minTimeout: 1 * 1e3,
        maxTimeout: Infinity,
        randomize: false
      };
      for (var key in options) {
        opts[key] = options[key];
      }
      if (opts.minTimeout > opts.maxTimeout) {
        throw new Error("minTimeout is greater than maxTimeout");
      }
      var timeouts = [];
      for (var i = 0; i < opts.retries; i++) {
        timeouts.push(this.createTimeout(i, opts));
      }
      if (options && options.forever && !timeouts.length) {
        timeouts.push(this.createTimeout(i, opts));
      }
      timeouts.sort(function(a, b) {
        return a - b;
      });
      return timeouts;
    };
    exports2.createTimeout = function(attempt, opts) {
      var random = opts.randomize ? Math.random() + 1 : 1;
      var timeout = Math.round(random * opts.minTimeout * Math.pow(opts.factor, attempt));
      timeout = Math.min(timeout, opts.maxTimeout);
      return timeout;
    };
    exports2.wrap = function(obj, options, methods) {
      if (options instanceof Array) {
        methods = options;
        options = null;
      }
      if (!methods) {
        methods = [];
        for (var key in obj) {
          if (typeof obj[key] === "function") {
            methods.push(key);
          }
        }
      }
      for (var i = 0; i < methods.length; i++) {
        var method = methods[i];
        var original = obj[method];
        obj[method] = function retryWrapper(original2) {
          var op = exports2.operation(options);
          var args = Array.prototype.slice.call(arguments, 1);
          var callback = args.pop();
          args.push(function(err) {
            if (op.retry(err)) {
              return;
            }
            if (err) {
              arguments[0] = op.mainError();
            }
            callback.apply(this, arguments);
          });
          op.attempt(function() {
            original2.apply(obj, args);
          });
        }.bind(obj, original);
        obj[method].options = options;
      }
    };
  }
});

// ../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/index.js
var require_retry2 = __commonJS({
  "../../node_modules/.pnpm/retry@0.12.0/node_modules/retry/index.js"(exports2, module2) {
    module2.exports = require_retry();
  }
});

// ../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/signals.js
var require_signals = __commonJS({
  "../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/signals.js"(exports2, module2) {
    module2.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module2.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module2.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  }
});

// ../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/index.js
var require_signal_exit = __commonJS({
  "../../node_modules/.pnpm/signal-exit@3.0.7/node_modules/signal-exit/index.js"(exports2, module2) {
    var process2 = global.process;
    var processOk = function(process3) {
      return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
    };
    if (!processOk(process2)) {
      module2.exports = function() {
        return function() {
        };
      };
    } else {
      assert = require("assert");
      signals = require_signals();
      isWin = /^win/i.test(process2.platform);
      EE = require("events");
      if (typeof EE !== "function") {
        EE = EE.EventEmitter;
      }
      if (process2.__signal_exit_emitter__) {
        emitter = process2.__signal_exit_emitter__;
      } else {
        emitter = process2.__signal_exit_emitter__ = new EE();
        emitter.count = 0;
        emitter.emitted = {};
      }
      if (!emitter.infinite) {
        emitter.setMaxListeners(Infinity);
        emitter.infinite = true;
      }
      module2.exports = function(cb, opts) {
        if (!processOk(global.process)) {
          return function() {
          };
        }
        assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
        if (loaded === false) {
          load();
        }
        var ev = "exit";
        if (opts && opts.alwaysLast) {
          ev = "afterexit";
        }
        var remove = function() {
          emitter.removeListener(ev, cb);
          if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
            unload();
          }
        };
        emitter.on(ev, cb);
        return remove;
      };
      unload = function unload2() {
        if (!loaded || !processOk(global.process)) {
          return;
        }
        loaded = false;
        signals.forEach(function(sig) {
          try {
            process2.removeListener(sig, sigListeners[sig]);
          } catch (er) {
          }
        });
        process2.emit = originalProcessEmit;
        process2.reallyExit = originalProcessReallyExit;
        emitter.count -= 1;
      };
      module2.exports.unload = unload;
      emit = function emit2(event, code, signal) {
        if (emitter.emitted[event]) {
          return;
        }
        emitter.emitted[event] = true;
        emitter.emit(event, code, signal);
      };
      sigListeners = {};
      signals.forEach(function(sig) {
        sigListeners[sig] = function listener() {
          if (!processOk(global.process)) {
            return;
          }
          var listeners = process2.listeners(sig);
          if (listeners.length === emitter.count) {
            unload();
            emit("exit", null, sig);
            emit("afterexit", null, sig);
            if (isWin && sig === "SIGHUP") {
              sig = "SIGINT";
            }
            process2.kill(process2.pid, sig);
          }
        };
      });
      module2.exports.signals = function() {
        return signals;
      };
      loaded = false;
      load = function load2() {
        if (loaded || !processOk(global.process)) {
          return;
        }
        loaded = true;
        emitter.count += 1;
        signals = signals.filter(function(sig) {
          try {
            process2.on(sig, sigListeners[sig]);
            return true;
          } catch (er) {
            return false;
          }
        });
        process2.emit = processEmit;
        process2.reallyExit = processReallyExit;
      };
      module2.exports.load = load;
      originalProcessReallyExit = process2.reallyExit;
      processReallyExit = function processReallyExit2(code) {
        if (!processOk(global.process)) {
          return;
        }
        process2.exitCode = code || /* istanbul ignore next */
        0;
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        originalProcessReallyExit.call(process2, process2.exitCode);
      };
      originalProcessEmit = process2.emit;
      processEmit = function processEmit2(ev, arg) {
        if (ev === "exit" && processOk(global.process)) {
          if (arg !== void 0) {
            process2.exitCode = arg;
          }
          var ret = originalProcessEmit.apply(this, arguments);
          emit("exit", process2.exitCode, null);
          emit("afterexit", process2.exitCode, null);
          return ret;
        } else {
          return originalProcessEmit.apply(this, arguments);
        }
      };
    }
    var assert;
    var signals;
    var isWin;
    var EE;
    var emitter;
    var unload;
    var emit;
    var sigListeners;
    var loaded;
    var load;
    var originalProcessReallyExit;
    var processReallyExit;
    var originalProcessEmit;
    var processEmit;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/mtime-precision.js
var require_mtime_precision = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/mtime-precision.js"(exports2, module2) {
    "use strict";
    var cacheSymbol = Symbol();
    function probe(file, fs, callback) {
      const cachedPrecision = fs[cacheSymbol];
      if (cachedPrecision) {
        return fs.stat(file, (err, stat) => {
          if (err) {
            return callback(err);
          }
          callback(null, stat.mtime, cachedPrecision);
        });
      }
      const mtime = new Date(Math.ceil(Date.now() / 1e3) * 1e3 + 5);
      fs.utimes(file, mtime, mtime, (err) => {
        if (err) {
          return callback(err);
        }
        fs.stat(file, (err2, stat) => {
          if (err2) {
            return callback(err2);
          }
          const precision = stat.mtime.getTime() % 1e3 === 0 ? "s" : "ms";
          Object.defineProperty(fs, cacheSymbol, { value: precision });
          callback(null, stat.mtime, precision);
        });
      });
    }
    function getMtime(precision) {
      let now = Date.now();
      if (precision === "s") {
        now = Math.ceil(now / 1e3) * 1e3;
      }
      return new Date(now);
    }
    module2.exports.probe = probe;
    module2.exports.getMtime = getMtime;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js
var require_lockfile = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/lockfile.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require_graceful_fs();
    var retry = require_retry2();
    var onExit = require_signal_exit();
    var mtimePrecision = require_mtime_precision();
    var locks = {};
    function getLockFile(file, options) {
      return options.lockfilePath || `${file}.lock`;
    }
    function resolveCanonicalPath(file, options, callback) {
      if (!options.realpath) {
        return callback(null, path.resolve(file));
      }
      options.fs.realpath(file, callback);
    }
    function acquireLock(file, options, callback) {
      const lockfilePath = getLockFile(file, options);
      options.fs.mkdir(lockfilePath, (err) => {
        if (!err) {
          return mtimePrecision.probe(lockfilePath, options.fs, (err2, mtime, mtimePrecision2) => {
            if (err2) {
              options.fs.rmdir(lockfilePath, () => {
              });
              return callback(err2);
            }
            callback(null, mtime, mtimePrecision2);
          });
        }
        if (err.code !== "EEXIST") {
          return callback(err);
        }
        if (options.stale <= 0) {
          return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
        }
        options.fs.stat(lockfilePath, (err2, stat) => {
          if (err2) {
            if (err2.code === "ENOENT") {
              return acquireLock(file, { ...options, stale: 0 }, callback);
            }
            return callback(err2);
          }
          if (!isLockStale(stat, options)) {
            return callback(Object.assign(new Error("Lock file is already being held"), { code: "ELOCKED", file }));
          }
          removeLock(file, options, (err3) => {
            if (err3) {
              return callback(err3);
            }
            acquireLock(file, { ...options, stale: 0 }, callback);
          });
        });
      });
    }
    function isLockStale(stat, options) {
      return stat.mtime.getTime() < Date.now() - options.stale;
    }
    function removeLock(file, options, callback) {
      options.fs.rmdir(getLockFile(file, options), (err) => {
        if (err && err.code !== "ENOENT") {
          return callback(err);
        }
        callback();
      });
    }
    function updateLock(file, options) {
      const lock2 = locks[file];
      if (lock2.updateTimeout) {
        return;
      }
      lock2.updateDelay = lock2.updateDelay || options.update;
      lock2.updateTimeout = setTimeout(() => {
        lock2.updateTimeout = null;
        options.fs.stat(lock2.lockfilePath, (err, stat) => {
          const isOverThreshold = lock2.lastUpdate + options.stale < Date.now();
          if (err) {
            if (err.code === "ENOENT" || isOverThreshold) {
              return setLockAsCompromised(file, lock2, Object.assign(err, { code: "ECOMPROMISED" }));
            }
            lock2.updateDelay = 1e3;
            return updateLock(file, options);
          }
          const isMtimeOurs = lock2.mtime.getTime() === stat.mtime.getTime();
          if (!isMtimeOurs) {
            return setLockAsCompromised(
              file,
              lock2,
              Object.assign(
                new Error("Unable to update lock within the stale threshold"),
                { code: "ECOMPROMISED" }
              )
            );
          }
          const mtime = mtimePrecision.getMtime(lock2.mtimePrecision);
          options.fs.utimes(lock2.lockfilePath, mtime, mtime, (err2) => {
            const isOverThreshold2 = lock2.lastUpdate + options.stale < Date.now();
            if (lock2.released) {
              return;
            }
            if (err2) {
              if (err2.code === "ENOENT" || isOverThreshold2) {
                return setLockAsCompromised(file, lock2, Object.assign(err2, { code: "ECOMPROMISED" }));
              }
              lock2.updateDelay = 1e3;
              return updateLock(file, options);
            }
            lock2.mtime = mtime;
            lock2.lastUpdate = Date.now();
            lock2.updateDelay = null;
            updateLock(file, options);
          });
        });
      }, lock2.updateDelay);
      if (lock2.updateTimeout.unref) {
        lock2.updateTimeout.unref();
      }
    }
    function setLockAsCompromised(file, lock2, err) {
      lock2.released = true;
      if (lock2.updateTimeout) {
        clearTimeout(lock2.updateTimeout);
      }
      if (locks[file] === lock2) {
        delete locks[file];
      }
      lock2.options.onCompromised(err);
    }
    function lock(file, options, callback) {
      options = {
        stale: 1e4,
        update: null,
        realpath: true,
        retries: 0,
        fs,
        onCompromised: (err) => {
          throw err;
        },
        ...options
      };
      options.retries = options.retries || 0;
      options.retries = typeof options.retries === "number" ? { retries: options.retries } : options.retries;
      options.stale = Math.max(options.stale || 0, 2e3);
      options.update = options.update == null ? options.stale / 2 : options.update || 0;
      options.update = Math.max(Math.min(options.update, options.stale / 2), 1e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const operation = retry.operation(options.retries);
        operation.attempt(() => {
          acquireLock(file2, options, (err2, mtime, mtimePrecision2) => {
            if (operation.retry(err2)) {
              return;
            }
            if (err2) {
              return callback(operation.mainError());
            }
            const lock2 = locks[file2] = {
              lockfilePath: getLockFile(file2, options),
              mtime,
              mtimePrecision: mtimePrecision2,
              options,
              lastUpdate: Date.now()
            };
            updateLock(file2, options);
            callback(null, (releasedCallback) => {
              if (lock2.released) {
                return releasedCallback && releasedCallback(Object.assign(new Error("Lock is already released"), { code: "ERELEASED" }));
              }
              unlock(file2, { ...options, realpath: false }, releasedCallback);
            });
          });
        });
      });
    }
    function unlock(file, options, callback) {
      options = {
        fs,
        realpath: true,
        ...options
      };
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        const lock2 = locks[file2];
        if (!lock2) {
          return callback(Object.assign(new Error("Lock is not acquired/owned by you"), { code: "ENOTACQUIRED" }));
        }
        lock2.updateTimeout && clearTimeout(lock2.updateTimeout);
        lock2.released = true;
        delete locks[file2];
        removeLock(file2, options, callback);
      });
    }
    function check(file, options, callback) {
      options = {
        stale: 1e4,
        realpath: true,
        fs,
        ...options
      };
      options.stale = Math.max(options.stale || 0, 2e3);
      resolveCanonicalPath(file, options, (err, file2) => {
        if (err) {
          return callback(err);
        }
        options.fs.stat(getLockFile(file2, options), (err2, stat) => {
          if (err2) {
            return err2.code === "ENOENT" ? callback(null, false) : callback(err2);
          }
          return callback(null, !isLockStale(stat, options));
        });
      });
    }
    function getLocks() {
      return locks;
    }
    onExit(() => {
      for (const file in locks) {
        const options = locks[file].options;
        try {
          options.fs.rmdirSync(getLockFile(file, options));
        } catch (e) {
        }
      }
    });
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.check = check;
    module2.exports.getLocks = getLocks;
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/adapter.js
var require_adapter = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/lib/adapter.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    function createSyncFs(fs2) {
      const methods = ["mkdir", "realpath", "stat", "rmdir", "utimes"];
      const newFs = { ...fs2 };
      methods.forEach((method) => {
        newFs[method] = (...args) => {
          const callback = args.pop();
          let ret;
          try {
            ret = fs2[`${method}Sync`](...args);
          } catch (err) {
            return callback(err);
          }
          callback(null, ret);
        };
      });
      return newFs;
    }
    function toPromise(method) {
      return (...args) => new Promise((resolve2, reject) => {
        args.push((err, result) => {
          if (err) {
            reject(err);
          } else {
            resolve2(result);
          }
        });
        method(...args);
      });
    }
    function toSync(method) {
      return (...args) => {
        let err;
        let result;
        args.push((_err, _result) => {
          err = _err;
          result = _result;
        });
        method(...args);
        if (err) {
          throw err;
        }
        return result;
      };
    }
    function toSyncOptions(options) {
      options = { ...options };
      options.fs = createSyncFs(options.fs || fs);
      if (typeof options.retries === "number" && options.retries > 0 || options.retries && typeof options.retries.retries === "number" && options.retries.retries > 0) {
        throw Object.assign(new Error("Cannot use retries with the sync api"), { code: "ESYNC" });
      }
      return options;
    }
    module2.exports = {
      toPromise,
      toSync,
      toSyncOptions
    };
  }
});

// ../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js
var require_proper_lockfile = __commonJS({
  "../../node_modules/.pnpm/proper-lockfile@4.1.2/node_modules/proper-lockfile/index.js"(exports2, module2) {
    "use strict";
    var lockfile = require_lockfile();
    var { toPromise, toSync, toSyncOptions } = require_adapter();
    async function lock(file, options) {
      const release = await toPromise(lockfile.lock)(file, options);
      return toPromise(release);
    }
    function lockSync(file, options) {
      const release = toSync(lockfile.lock)(file, toSyncOptions(options));
      return toSync(release);
    }
    function unlock(file, options) {
      return toPromise(lockfile.unlock)(file, options);
    }
    function unlockSync(file, options) {
      return toSync(lockfile.unlock)(file, toSyncOptions(options));
    }
    function check(file, options) {
      return toPromise(lockfile.check)(file, options);
    }
    function checkSync(file, options) {
      return toSync(lockfile.check)(file, toSyncOptions(options));
    }
    module2.exports = lock;
    module2.exports.lock = lock;
    module2.exports.unlock = unlock;
    module2.exports.lockSync = lockSync;
    module2.exports.unlockSync = unlockSync;
    module2.exports.check = check;
    module2.exports.checkSync = checkSync;
  }
});

// dist/server/auth.js
var auth_exports = {};
__export(auth_exports, {
  _resetCacheForTest: () => _resetCacheForTest,
  getServerUrl: () => getServerUrl,
  getToken: () => getToken,
  refreshToken: () => refreshToken,
  renewToken: () => renewToken
});
function getConfigPath() {
  const gramatrDir = getGramatrDirFromEnv();
  if (gramatrDir) {
    return (0, import_node_path.join)((0, import_node_path.dirname)(gramatrDir), ".gramatr.json");
  }
  return (0, import_node_path.join)(getHomeDir(), ".gramatr.json");
}
function readConfig() {
  try {
    const raw = (0, import_node_fs.readFileSync)(getConfigPath(), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
function writeConfig(config) {
  try {
    (0, import_node_fs.writeFileSync)(getConfigPath(), JSON.stringify(config, null, 2), { mode: 384 });
  } catch {
  }
}
function isExpired(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt;
}
function isNearExpiry(expiresAt) {
  if (expiresAt === null)
    return false;
  return Date.now() >= expiresAt - RENEWAL_WINDOW_MS;
}
function getToken() {
  const envKey = sanitizeEnvToken(process.env.GRAMATR_API_KEY);
  if (envKey)
    return envKey;
  const envToken = getGramatrTokenFromEnv();
  if (envToken)
    return envToken;
  if (cachedToken && isExpired(cachedExpiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
  }
  if (!cachedToken) {
    refreshToken();
  }
  if (cachedToken && isNearExpiry(cachedExpiresAt) && !renewalInProgress) {
    const tokenSnap = cachedToken;
    if (!WARNED_EXPIRY.has(tokenSnap.slice(-8))) {
      WARNED_EXPIRY.add(tokenSnap.slice(-8));
      process.stderr.write("[gramatr] Token nearing expiry \u2014 renewing in background\n");
    }
    void renewTokenBackground();
  }
  return cachedToken;
}
function refreshToken() {
  const config = readConfig();
  if (!config?.token) {
    cachedToken = null;
    cachedExpiresAt = null;
    return null;
  }
  const expiresAt = config.token_expires_at ? Date.parse(config.token_expires_at) : null;
  if (isExpired(expiresAt)) {
    cachedToken = null;
    cachedExpiresAt = null;
    process.stderr.write("[gramatr] Stored token is expired \u2014 run `npx @gramatr/mcp login` to re-authenticate\n");
    return null;
  }
  cachedToken = config.token;
  cachedExpiresAt = expiresAt;
  return cachedToken;
}
async function renewToken() {
  const currentToken = cachedToken ?? readConfig()?.token;
  if (!currentToken)
    return null;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${currentToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok)
      return null;
    const body = await response.json();
    if (!body.access_token)
      return null;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    renewalInProgress = false;
    return cachedToken;
  } catch {
    return null;
  }
}
async function renewTokenBackground() {
  if (renewalInProgress || !cachedToken)
    return;
  renewalInProgress = true;
  try {
    const serverUrl = getServerUrl();
    const response = await fetch(`${serverUrl}/auth/token/renew`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cachedToken}` },
      signal: AbortSignal.timeout(1e4)
    });
    if (!response.ok) {
      process.stderr.write(`[gramatr] Token renewal failed (HTTP ${response.status}) \u2014 re-login may be required
`);
      return;
    }
    const body = await response.json();
    if (!body.access_token)
      return;
    const expiresIn = body.expires_in ?? 31536e3;
    const newExpiresAt = new Date(Date.now() + expiresIn * 1e3).toISOString();
    const config = readConfig() ?? {};
    config.token = body.access_token;
    config.token_expires_at = newExpiresAt;
    writeConfig(config);
    cachedToken = body.access_token;
    cachedExpiresAt = Date.parse(newExpiresAt);
    process.stderr.write("[gramatr] Token renewed successfully\n");
  } catch {
  } finally {
    renewalInProgress = false;
  }
}
function getServerUrl() {
  const envUrl = getGramatrUrlFromEnv();
  if (envUrl) {
    return envUrl.replace(/\/mcp\/?$/, "");
  }
  const config = readConfig();
  return (config?.server_url || "https://api.gramatr.com").replace(/\/mcp\/?$/, "");
}
function _resetCacheForTest() {
  cachedToken = null;
  cachedExpiresAt = null;
  renewalInProgress = false;
  WARNED_EXPIRY.clear();
}
var import_node_fs, import_node_path, WARNED_EXPIRY, RENEWAL_WINDOW_MS, cachedToken, cachedExpiresAt, renewalInProgress;
var init_auth = __esm({
  "dist/server/auth.js"() {
    "use strict";
    import_node_fs = require("node:fs");
    import_node_path = require("node:path");
    init_config_runtime();
    WARNED_EXPIRY = /* @__PURE__ */ new Set();
    RENEWAL_WINDOW_MS = 6 * 60 * 60 * 1e3;
    cachedToken = null;
    cachedExpiresAt = null;
    renewalInProgress = false;
  }
});

// dist/hooks/lib/hook-state.js
var hook_state_exports = {};
__export(hook_state_exports, {
  __testOnlyInsertOutboxRaw: () => __testOnlyInsertOutboxRaw,
  appendOpHistory: () => appendOpHistory,
  appendSessionLog: () => appendSessionLog,
  appendTurn: () => appendTurn,
  closeDb: () => closeDb,
  drainOutbox: () => drainOutbox,
  enqueueOutboxMutation: () => enqueueOutboxMutation,
  flushOpHistory: () => flushOpHistory,
  flushTurns: () => flushTurns,
  getCachedDirective: () => getCachedDirective,
  getCompactById: () => getCompactById,
  getGramatrStateDir: () => getGramatrStateDir,
  getLastSessionCommits: () => getLastSessionCommits,
  getLastSessionForProject: () => getLastSessionForProject,
  getLastSessionForProjectAsync: () => getLastSessionForProjectAsync,
  getLatestClassification: () => getLatestClassification,
  getLatestCompactForProject: () => getLatestCompactForProject,
  getLatestPacketAgeMs: () => getLatestPacketAgeMs,
  getLatestPacketForSession: () => getLatestPacketForSession,
  getLocalProjectByDirectory: () => getLocalProjectByDirectory,
  getLocalProjectByDirectoryAsync: () => getLocalProjectByDirectoryAsync,
  getLocalProjectBySlug: () => getLocalProjectBySlug,
  getOutboxPendingCount: () => getOutboxPendingCount,
  getPacket: () => getPacket,
  getProjectSessionCount: () => getProjectSessionCount,
  getRecentTurns: () => getRecentTurns,
  getSessionContext: () => getSessionContext,
  getSessionContextAsync: () => getSessionContextAsync,
  getSessionContextByProject: () => getSessionContextByProject,
  getSessionTurnCount: () => getSessionTurnCount,
  hydrateSessionContextFromServer: () => hydrateSessionContextFromServer,
  isDaemonActive: () => isDaemonActive,
  isFilesystemAvailable: () => isFilesystemAvailable,
  listLocalProjects: () => listLocalProjects,
  listOutboxEntries: () => listOutboxEntries,
  markClassificationFeedbackSubmitted: () => markClassificationFeedbackSubmitted,
  markSessionSynced: () => markSessionSynced,
  migrateProjectId: () => migrateProjectId,
  saveCompact: () => saveCompact,
  savePacket: () => savePacket,
  setCachedDirective: () => setCachedDirective,
  setLatestClassification: () => setLatestClassification,
  setSessionContext: () => setSessionContext,
  upsertLocalProject: () => upsertLocalProject,
  upsertSessionsFromServer: () => upsertSessionsFromServer
});
function getGramatrDir() {
  return getGramatrDirFromEnv() ?? (0, import_node_path2.join)(getHomeDir(), ".gramatr");
}
async function serializedWrite(fn) {
  if (getDbPath() === ":memory:") {
    fn();
    return;
  }
  const lockfile = await Promise.resolve().then(() => __toESM(require_proper_lockfile(), 1));
  const lockPath = (0, import_node_path2.join)(getGramatrDir(), "db-write.lock");
  try {
    if (!(0, import_node_fs2.existsSync)(lockPath))
      (0, import_node_fs2.writeFileSync)(lockPath, "");
  } catch {
    fn();
    return;
  }
  const release = await lockfile.default.lock(lockPath, {
    retries: { retries: 10, minTimeout: 10, maxTimeout: 200 },
    stale: 5e3
  });
  try {
    fn();
  } finally {
    await release();
  }
}
function isDaemonActive() {
  return false;
}
function p(obj) {
  return obj;
}
function getDbPath() {
  if (process.env.GRAMATR_STATE_DB)
    return process.env.GRAMATR_STATE_DB;
  const dir = getGramatrDirFromEnv() || (0, import_node_path2.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path2.join)(dir, "state.db");
}
function getGramatrStateDir() {
  const dir = getGramatrDirFromEnv() || (0, import_node_path2.join)(getHomeDir(), ".gramatr");
  return (0, import_node_path2.join)(dir, ".state");
}
function getDb() {
  if (_db)
    return _db;
  const path = getDbPath();
  if (path !== ":memory:") {
    try {
      const dir = (0, import_node_path2.dirname)(path);
      if (!(0, import_node_fs2.existsSync)(dir))
        (0, import_node_fs2.mkdirSync)(dir, { recursive: true });
    } catch {
      _filesystemAvailable = false;
    }
  }
  try {
    _db = new Database(_filesystemAvailable ? path : ":memory:");
    if (_filesystemAvailable && path !== ":memory:") {
      try {
        (0, import_node_fs2.chmodSync)(path, 384);
      } catch {
      }
    }
  } catch {
    _filesystemAvailable = false;
    _db = new Database(":memory:");
  }
  _db.exec("PRAGMA journal_mode = WAL");
  _db.exec("PRAGMA synchronous = NORMAL");
  _db.exec("PRAGMA wal_autocheckpoint = 1000");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS session_context (
      session_id        TEXT PRIMARY KEY,
      user_id           TEXT,
      project_id        TEXT,
      interaction_id    TEXT,
      entity_id         TEXT,
      project_name      TEXT,
      git_root          TEXT,
      git_branch        TEXT,
      git_remote        TEXT,
      working_directory TEXT,
      session_start     TEXT,
      updated_at        TEXT NOT NULL,
      client_type       TEXT,
      agent_name        TEXT
    );

    CREATE TABLE IF NOT EXISTS turns (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id        TEXT NOT NULL,
      client_session_id TEXT,
      project_id        TEXT,
      agent_name        TEXT,
      turn_number       INTEGER,
      timestamp         TEXT,
      prompt            TEXT,
      effort_level      TEXT,
      intent_type       TEXT,
      confidence        REAL,
      tokens_saved      INTEGER
    );

    CREATE TABLE IF NOT EXISTS directive_cache (
      key        TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      value_json TEXT NOT NULL,
      cached_at  TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      PRIMARY KEY (key, user_id)
    );

    CREATE TABLE IF NOT EXISTS mutation_outbox (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      tool_name     TEXT NOT NULL,
      args_json     TEXT NOT NULL,
      created_at    TEXT NOT NULL,
      replicated_at TEXT,
      attempts      INTEGER NOT NULL DEFAULT 0,
      last_error    TEXT
    );

    CREATE TABLE IF NOT EXISTS op_history (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id   TEXT NOT NULL,
      tool         TEXT,
      time_ms      INTEGER,
      tokens_saved INTEGER,
      timestamp    INTEGER
    );

    CREATE TABLE IF NOT EXISTS latest_classification (
      session_id            TEXT PRIMARY KEY,
      classifier_model      TEXT,
      classifier_time_ms    INTEGER,
      tokens_saved          INTEGER,
      savings_ratio         REAL,
      effort                TEXT,
      intent                TEXT,
      confidence            REAL,
      memory_delivered      INTEGER,
      downstream_model      TEXT,
      server_version        TEXT,
      stage_timing          TEXT,
      recorded_at           INTEGER NOT NULL,
      original_prompt       TEXT,
      pending_feedback      INTEGER DEFAULT 0,
      feedback_submitted_at TEXT,
      client_type           TEXT,
      agent_name            TEXT,
      memory_tier           TEXT,
      memory_scope          TEXT
    );

    CREATE TABLE IF NOT EXISTS session_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT,
      project_id     TEXT,
      ended_at       TEXT,
      reason         TEXT,
      commit_log     TEXT,
      interaction_id TEXT,
      entity_id      TEXT,
      client_type    TEXT,
      agent_name     TEXT,
      synced_at      TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS session_log_session_id
      ON session_log(session_id)
      WHERE session_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      git_remote TEXT,
      directory TEXT,
      org_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
    CREATE INDEX IF NOT EXISTS idx_projects_directory ON projects(directory);

    CREATE TABLE IF NOT EXISTS compacts (
      id          TEXT PRIMARY KEY,
      project_id  TEXT,
      session_id  TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      summary     TEXT,
      turns_json  TEXT,
      metadata_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_compacts_session ON compacts(session_id);
    CREATE INDEX IF NOT EXISTS idx_compacts_project ON compacts(project_id);

    CREATE TABLE IF NOT EXISTS packets (
      id          TEXT PRIMARY KEY,
      session_id  TEXT NOT NULL,
      project_id  TEXT,
      effort      TEXT,
      intent      TEXT,
      created_at  INTEGER NOT NULL,
      payload     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_packets_session ON packets(session_id, created_at DESC);
  `);
  const migrations = [
    "ALTER TABLE session_context ADD COLUMN entity_id TEXT",
    "ALTER TABLE session_context ADD COLUMN client_type TEXT",
    "ALTER TABLE session_context ADD COLUMN agent_name TEXT",
    "ALTER TABLE latest_classification ADD COLUMN original_prompt TEXT",
    "ALTER TABLE latest_classification ADD COLUMN pending_feedback INTEGER DEFAULT 0",
    "ALTER TABLE latest_classification ADD COLUMN feedback_submitted_at TEXT",
    "ALTER TABLE latest_classification ADD COLUMN client_type TEXT",
    "ALTER TABLE latest_classification ADD COLUMN agent_name TEXT",
    "ALTER TABLE latest_classification ADD COLUMN memory_tier TEXT",
    "ALTER TABLE latest_classification ADD COLUMN memory_scope TEXT",
    "ALTER TABLE session_log ADD COLUMN interaction_id TEXT",
    "ALTER TABLE session_log ADD COLUMN entity_id TEXT",
    "ALTER TABLE session_log ADD COLUMN client_type TEXT",
    "ALTER TABLE session_log ADD COLUMN agent_name TEXT",
    "ALTER TABLE session_log ADD COLUMN synced_at TEXT",
    // Unique index is safe to re-run (IF NOT EXISTS)
    "CREATE UNIQUE INDEX IF NOT EXISTS session_log_session_id ON session_log(session_id) WHERE session_id IS NOT NULL",
    "ALTER TABLE session_context ADD COLUMN user_id TEXT",
    "ALTER TABLE session_context ADD COLUMN platform TEXT",
    "ALTER TABLE session_context ADD COLUMN arch TEXT",
    // #1214: cross-agent fields on turns for local SQLite intelligence cache
    "ALTER TABLE turns ADD COLUMN project_id TEXT",
    "ALTER TABLE turns ADD COLUMN client_session_id TEXT",
    "ALTER TABLE turns ADD COLUMN agent_name TEXT",
    // Orchestration task assignment — set by session-start when a task is picked up
    "ALTER TABLE session_context ADD COLUMN orchestration_task_id TEXT",
    // Orchestration workspace isolation — set at pickup alongside task_id
    "ALTER TABLE session_context ADD COLUMN orch_access_scope TEXT",
    "ALTER TABLE session_context ADD COLUMN orch_dir TEXT",
    "ALTER TABLE session_context ADD COLUMN orch_working_dir TEXT"
  ];
  for (const sql of migrations) {
    try {
      _db.exec(sql);
    } catch {
    }
  }
  try {
    _db.prepare("DELETE FROM turns WHERE timestamp IS NOT NULL AND timestamp < datetime('now', '-7 days')").run();
  } catch {
  }
  return _db;
}
function closeDb() {
  if (_db) {
    try {
      _db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch {
    }
    _db.close();
    _db = null;
  }
}
function isFilesystemAvailable() {
  getDb();
  return _filesystemAvailable;
}
async function hydrateSessionContextFromServer(sessionId) {
  try {
    const { getServerUrl: getServerUrl2, getToken: getToken2 } = await Promise.resolve().then(() => (init_auth(), auth_exports));
    const serverUrl = getServerUrl2();
    const token = getToken2();
    const url = `${serverUrl}/api/v1/sessions?session_id=${encodeURIComponent(sessionId)}`;
    const headers = { Accept: "application/json" };
    if (token)
      headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(HOOK_STATE_ABORT_TIMEOUT_MS)
    });
    if (!response.ok)
      return;
    const data = await response.json();
    const session = data.sessions?.[0];
    if (!session)
      return;
    setSessionContext({
      session_id: session.client_session_id ?? sessionId,
      project_id: session.project_uuid ?? null,
      interaction_id: session.interaction_id ?? null,
      entity_id: null,
      project_name: null,
      git_root: null,
      git_branch: session.git_branch ?? null,
      git_remote: session.git_remote ?? null,
      working_directory: null,
      session_start: session.started_at ?? null,
      updated_at: session.updated_at ?? (/* @__PURE__ */ new Date()).toISOString(),
      client_type: session.client_type ?? null,
      agent_name: session.agent_name ?? null,
      platform: process.platform,
      arch: process.arch
    });
  } catch {
  }
}
function setSessionContext(ctx) {
  getDb().prepare(`
    INSERT OR REPLACE INTO session_context
      (session_id, user_id, project_id, interaction_id, entity_id, project_name, git_root,
       git_branch, git_remote, working_directory, session_start, updated_at,
       client_type, agent_name, platform, arch, orchestration_task_id,
       orch_access_scope, orch_dir, orch_working_dir)
    VALUES
      (@session_id, @user_id, @project_id, @interaction_id, @entity_id, @project_name, @git_root,
       @git_branch, @git_remote, @working_directory, @session_start, @updated_at,
       @client_type, @agent_name, @platform, @arch, @orchestration_task_id,
       @orch_access_scope, @orch_dir, @orch_working_dir)
  `).run(p({
    user_id: null,
    orchestration_task_id: null,
    orch_access_scope: null,
    orch_dir: null,
    orch_working_dir: null,
    ...ctx
  }));
}
function getSessionContext(sessionId) {
  const db = getDb();
  if (sessionId && sessionId !== "unknown") {
    const scoped = db.prepare("SELECT * FROM session_context WHERE session_id = ? ORDER BY updated_at DESC LIMIT 1").get(sessionId);
    if (scoped)
      return scoped;
  }
  const row = db.prepare("SELECT * FROM session_context ORDER BY updated_at DESC LIMIT 1").get();
  return row ?? null;
}
function getSessionContextByProject(projectId) {
  const row = getDb().prepare("SELECT * FROM session_context WHERE project_id = ? ORDER BY updated_at DESC LIMIT 1").get(projectId);
  return row ?? null;
}
async function appendTurn(turn) {
  await serializedWrite(() => {
    getDb().prepare(`
      INSERT INTO turns
        (session_id, client_session_id, project_id, agent_name,
         turn_number, timestamp, prompt, effort_level, intent_type, confidence, tokens_saved)
      VALUES
        (@session_id, @client_session_id, @project_id, @agent_name,
         @turn_number, @timestamp, @prompt, @effort_level, @intent_type, @confidence, @tokens_saved)
    `).run(p(turn));
  });
}
function flushTurns(sessionId) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM turns WHERE session_id = ? ORDER BY id").all(sessionId);
  db.prepare("DELETE FROM turns WHERE session_id = ?").run(sessionId);
  return rows;
}
async function appendOpHistory(op) {
  await serializedWrite(() => {
    getDb().prepare(`
      INSERT INTO op_history (session_id, tool, time_ms, tokens_saved, timestamp)
      VALUES (@session_id, @tool, @time_ms, @tokens_saved, @timestamp)
    `).run(p(op));
  });
}
function flushOpHistory(sessionId) {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM op_history WHERE session_id = ? ORDER BY id").all(sessionId);
  db.prepare("DELETE FROM op_history WHERE session_id = ?").run(sessionId);
  return rows;
}
function setLatestClassification(record) {
  getDb().prepare(`
    INSERT OR REPLACE INTO latest_classification
      (session_id, classifier_model, classifier_time_ms, tokens_saved, savings_ratio,
       effort, intent, confidence, memory_delivered, downstream_model,
       server_version, stage_timing, recorded_at,
       original_prompt, pending_feedback, feedback_submitted_at,
       client_type, agent_name, memory_tier, memory_scope)
    VALUES
      (@session_id, @classifier_model, @classifier_time_ms, @tokens_saved, @savings_ratio,
       @effort, @intent, @confidence, @memory_delivered, @downstream_model,
       @server_version, @stage_timing, @recorded_at,
       @original_prompt, @pending_feedback, @feedback_submitted_at,
       @client_type, @agent_name, @memory_tier, @memory_scope)
  `).run(p({
    ...record,
    pending_feedback: record.pending_feedback ? 1 : 0
  }));
}
function getLatestClassification(sessionId) {
  const row = getDb().prepare("SELECT * FROM latest_classification WHERE session_id = ?").get(sessionId);
  if (!row)
    return null;
  return { ...row, pending_feedback: row.pending_feedback === 1 };
}
function markClassificationFeedbackSubmitted(sessionId, submittedAt) {
  const ts = submittedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  getDb().prepare(`
    UPDATE latest_classification
    SET pending_feedback = 0, feedback_submitted_at = ?
    WHERE session_id = ?
  `).run(ts, sessionId);
}
function appendSessionLog(entry) {
  getDb().prepare(`
    INSERT INTO session_log
      (session_id, project_id, ended_at, reason, commit_log,
       interaction_id, entity_id, client_type, agent_name, synced_at)
    VALUES
      (@session_id, @project_id, @ended_at, @reason, @commit_log,
       @interaction_id, @entity_id, @client_type, @agent_name, @synced_at)
  `).run(p(entry));
}
function getLastSessionForProject(projectId) {
  const row = getDb().prepare(`
      SELECT session_id, interaction_id, entity_id, client_type, agent_name, ended_at
      FROM session_log
      WHERE project_id = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(projectId);
  return row ?? null;
}
function getLastSessionCommits() {
  const row = getDb().prepare(`SELECT commit_log FROM session_log
       WHERE commit_log IS NOT NULL
         AND ended_at >= datetime('now', '-1 day')
       ORDER BY id DESC LIMIT 1`).get();
  return row?.commit_log ?? null;
}
function upsertSessionsFromServer(sessions) {
  if (sessions.length === 0)
    return;
  const syncedAt = (/* @__PURE__ */ new Date()).toISOString();
  const stmt = getDb().prepare(`
    INSERT OR IGNORE INTO session_log
      (session_id, project_id, ended_at, reason, commit_log,
       interaction_id, entity_id, client_type, agent_name, synced_at)
    VALUES
      (@session_id, @project_id, @ended_at, @reason, @commit_log,
       @interaction_id, @entity_id, @client_type, @agent_name, @synced_at)
  `);
  for (const s of sessions) {
    stmt.run(p({
      session_id: s.client_session_id ?? s.id,
      project_id: null,
      ended_at: s.ended_at ?? null,
      reason: s.reason ?? null,
      commit_log: null,
      interaction_id: s.interaction_id ?? null,
      entity_id: null,
      client_type: s.client_type ?? null,
      agent_name: s.agent_name ?? null,
      synced_at: syncedAt
    }));
  }
}
function migrateProjectId(oldProjectId, newProjectId) {
  if (oldProjectId === newProjectId)
    return 0;
  const db = getDb();
  db.prepare("UPDATE session_log SET project_id = ? WHERE project_id = ?").run(newProjectId, oldProjectId);
  const row = db.prepare("SELECT changes() as changes").get();
  return row?.changes ?? 0;
}
function markSessionSynced(sessionId, syncedAt) {
  const ts = syncedAt ?? (/* @__PURE__ */ new Date()).toISOString();
  getDb().prepare("UPDATE session_log SET synced_at = ? WHERE session_id = ?").run(ts, sessionId);
}
function getProjectSessionCount(projectId) {
  const row = getDb().prepare("SELECT COUNT(*) as cnt FROM session_log WHERE project_id = ?").get(projectId);
  return row?.cnt ?? 0;
}
function upsertLocalProject(project) {
  getDb().prepare(`
    INSERT INTO projects (id, slug, git_remote, directory, org_id, updated_at)
    VALUES (@id, @slug, @git_remote, @directory, @org_id, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      git_remote = COALESCE(excluded.git_remote, projects.git_remote),
      directory = COALESCE(excluded.directory, projects.directory),
      org_id = COALESCE(excluded.org_id, projects.org_id),
      updated_at = datetime('now')
  `).run(p({
    id: project.id,
    slug: project.slug,
    git_remote: project.git_remote ?? null,
    directory: project.directory ?? null,
    org_id: project.org_id ?? null
  }));
}
function getLocalProjectBySlug(slug) {
  const row = getDb().prepare("SELECT * FROM projects WHERE slug = ? ORDER BY updated_at DESC LIMIT 1").get(slug);
  return row ?? null;
}
function getLocalProjectByDirectory(directory) {
  const row = getDb().prepare("SELECT * FROM projects WHERE directory = ? ORDER BY updated_at DESC LIMIT 1").get(directory);
  return row ?? null;
}
function setCachedDirective(key, userId, value, ttlHours = 24) {
  const now = /* @__PURE__ */ new Date();
  const expires = new Date(now.getTime() + ttlHours * 3600 * 1e3);
  getDb().prepare(`
    INSERT INTO directive_cache (key, user_id, value_json, cached_at, expires_at)
    VALUES (@key, @user_id, @value_json, @cached_at, @expires_at)
    ON CONFLICT(key, user_id) DO UPDATE SET
      value_json = excluded.value_json,
      cached_at  = excluded.cached_at,
      expires_at = excluded.expires_at
  `).run(p({
    key,
    user_id: userId,
    value_json: JSON.stringify(value),
    cached_at: now.toISOString(),
    expires_at: expires.toISOString()
  }));
}
function getCachedDirective(key, userId) {
  const row = getDb().prepare("SELECT value_json, expires_at FROM directive_cache WHERE key = ? AND user_id = ?").get(key, userId);
  if (!row)
    return null;
  const expiresMs = Date.parse(row.expires_at);
  if (Number.isFinite(expiresMs) && expiresMs <= Date.now())
    return null;
  try {
    return JSON.parse(row.value_json);
  } catch {
    return null;
  }
}
function enqueueOutboxMutation(toolName, args) {
  getDb().prepare(`
    INSERT INTO mutation_outbox (tool_name, args_json, created_at, attempts)
    VALUES (@tool_name, @args_json, @created_at, 0)
  `).run(p({
    tool_name: toolName,
    args_json: JSON.stringify(args),
    created_at: (/* @__PURE__ */ new Date()).toISOString()
  }));
}
async function drainOutbox(callTool) {
  const db = getDb();
  try {
    db.prepare("DELETE FROM mutation_outbox WHERE replicated_at IS NOT NULL AND replicated_at < datetime('now', '-7 days')").run();
  } catch {
  }
  const rows = db.prepare(`
      SELECT id, tool_name, args_json, attempts
      FROM mutation_outbox
      WHERE replicated_at IS NULL AND attempts < 3
      ORDER BY id
    `).all();
  const markSuccess = db.prepare("UPDATE mutation_outbox SET replicated_at = ?, attempts = attempts + 1, last_error = NULL WHERE id = ?");
  const markFailure = db.prepare("UPDATE mutation_outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?");
  for (const row of rows) {
    let args = {};
    try {
      args = JSON.parse(row.args_json);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      markFailure.run(`args_json parse error: ${detail}`, row.id);
      db.prepare("UPDATE mutation_outbox SET attempts = 3 WHERE id = ?").run(row.id);
      continue;
    }
    try {
      await callTool(row.tool_name, args);
      markSuccess.run((/* @__PURE__ */ new Date()).toISOString(), row.id);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      markFailure.run(detail, row.id);
    }
  }
}
function getOutboxPendingCount() {
  const row = getDb().prepare("SELECT COUNT(*) as cnt FROM mutation_outbox WHERE replicated_at IS NULL").get();
  return row?.cnt ?? 0;
}
function listOutboxEntries() {
  return getDb().prepare("SELECT id, tool_name, args_json, created_at, replicated_at, attempts, last_error FROM mutation_outbox ORDER BY id").all();
}
function __testOnlyInsertOutboxRaw(toolName, argsJsonLiteral) {
  const result = getDb().prepare(`
    INSERT INTO mutation_outbox (tool_name, args_json, created_at, attempts)
    VALUES (?, ?, ?, 0)
  `).run(toolName, argsJsonLiteral, (/* @__PURE__ */ new Date()).toISOString());
  return Number(result.lastInsertRowid);
}
function getSessionTurnCount(sessionId) {
  try {
    const row = getDb().prepare("SELECT COUNT(*) as n FROM turns WHERE session_id = ?").get(sessionId);
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
function getRecentTurns(sessionId, limit = 5) {
  try {
    return getDb().prepare("SELECT * FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?").all(sessionId, limit);
  } catch {
    return [];
  }
}
async function saveCompact(record) {
  const flat = {
    id: record.id,
    project_id: record.project_id ?? null,
    session_id: record.session_id,
    created_at: record.created_at,
    summary: record.summary ?? null,
    turns_json: JSON.stringify(record.turns),
    metadata_json: JSON.stringify(record.metadata)
  };
  try {
    await serializedWrite(() => {
      getDb().prepare(`
          INSERT OR REPLACE INTO compacts
            (id, project_id, session_id, created_at, summary, turns_json, metadata_json)
          VALUES
            (@id, @project_id, @session_id, @created_at, @summary, @turns_json, @metadata_json)
        `).run(p(flat));
    });
  } catch {
  }
}
function getLatestCompactForProject(projectId) {
  try {
    const row = getDb().prepare(`
        SELECT * FROM compacts WHERE project_id = ?
        ORDER BY created_at DESC LIMIT 1
      `).get(projectId);
    if (!row)
      return null;
    return {
      id: row.id,
      project_id: row.project_id,
      session_id: row.session_id,
      created_at: row.created_at,
      summary: row.summary,
      turns: row.turns_json ? JSON.parse(row.turns_json) : [],
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
    };
  } catch {
    return null;
  }
}
function getCompactById(id) {
  try {
    const row = getDb().prepare("SELECT * FROM compacts WHERE id = ?").get(id);
    if (!row)
      return null;
    return {
      id: row.id,
      project_id: row.project_id,
      session_id: row.session_id,
      created_at: row.created_at,
      summary: row.summary,
      turns: row.turns_json ? JSON.parse(row.turns_json) : [],
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : {}
    };
  } catch {
    return null;
  }
}
function listLocalProjects(limit = 20) {
  return getDb().prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT ?").all(Math.min(Math.max(1, limit), 50));
}
async function getSessionContextAsync(sessionId) {
  return getSessionContext(sessionId);
}
async function getLastSessionForProjectAsync(projectId) {
  return getLastSessionForProject(projectId);
}
async function getLocalProjectByDirectoryAsync(directory) {
  return getLocalProjectByDirectory(directory);
}
function savePacket(record) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO packets (id, session_id, project_id, effort, intent, created_at, payload)
    VALUES (@id, @session_id, @project_id, @effort, @intent, @created_at, @payload)
  `).run(p(record));
  db.prepare(`
    DELETE FROM packets WHERE session_id = @session_id AND id NOT IN (
      SELECT id FROM packets WHERE session_id = @session_id
      ORDER BY created_at DESC LIMIT 20
    )
  `).run(p({ session_id: record.session_id }));
}
function getPacket(id) {
  return getDb().prepare("SELECT * FROM packets WHERE id = ?").get(id) ?? null;
}
function getLatestPacketForSession(sessionId) {
  return getDb().prepare("SELECT * FROM packets WHERE session_id = ? ORDER BY created_at DESC LIMIT 1").get(sessionId) ?? null;
}
function getLatestPacketAgeMs(sessionId, nowMs = Date.now()) {
  try {
    const row = getDb().prepare("SELECT created_at FROM packets WHERE session_id = ? ORDER BY created_at DESC LIMIT 1").get(sessionId);
    if (!row)
      return void 0;
    return nowMs - row.created_at;
  } catch {
    return void 0;
  }
}
var import_node_sqlite, import_node_fs2, import_node_path2, Database, _db, _filesystemAvailable;
var init_hook_state = __esm({
  "dist/hooks/lib/hook-state.js"() {
    "use strict";
    import_node_sqlite = require("node:sqlite");
    import_node_fs2 = require("node:fs");
    import_node_path2 = require("node:path");
    init_config_runtime();
    init_hook_timeouts();
    Database = import_node_sqlite.DatabaseSync;
    _db = null;
    _filesystemAvailable = true;
  }
});

// dist/hooks/input-validator.js
var import_node_path3 = require("node:path");

// dist/hooks/generated/schema-constants.js
var EFFORT_LEVELS = ["instant", "fast", "standard", "extended", "deep", "advanced", "comprehensive"];
var INTENT_TYPES = ["search", "retrieve", "create", "update", "analyze", "generate"];
var ENTITY_TYPES = ["profile", "voice", "craft", "work_style", "memory", "relationship", "preference", "team_identity", "org_identity", "task", "milestone", "prd", "decision", "quality_gate", "qg_criterion", "steering_rule", "directive", "skill", "agent_definition", "agent", "playbook", "workflow", "standard", "guideline", "principle", "runbook", "reference", "blog_idea", "strategy", "pattern", "tool", "example", "template", "agent_diary", "session", "conversation", "turn", "classification_record", "classification_telemetry", "agent_execution", "intelligence_packet", "learning_signal", "learning_reflection", "usage_pattern", "learning_correction", "attachment", "execution_record", "model_evaluation", "benchmark", "external_connection", "infrastructure", "audit_log", "brand", "presentation", "slide_template", "email_template", "social_campaign", "content_asset", "cluster_label", "taxonomy_proposal"];
var WORK_STATUSES = ["open", "in_progress", "blocked", "review", "done"];
var EFFORT_LEVEL_SET = new Set(EFFORT_LEVELS);
var INTENT_TYPE_SET = new Set(INTENT_TYPES);
var ENTITY_TYPE_SET = new Set(ENTITY_TYPES);
var WORK_STATUS_SET = new Set(WORK_STATUSES);
var TOOL_INPUT_RULES = {
  create_entity: [
    { field: "name" },
    { field: "entity_type", validValues: ENTITY_TYPES },
    { field: "project_id" }
  ],
  update_entity: [
    { field: "entity_id" }
  ],
  add_observation: [
    { field: "entity_id" },
    { field: "content" }
  ],
  search_semantic: [
    { field: "query" }
  ],
  search_entities: [],
  // all fields optional
  create_relation: [
    { field: "source_entity_id" },
    { field: "target_entity_id" },
    { field: "relation_type" }
  ],
  mark_entity_inactive: [
    { field: "entity_id" }
  ],
  mark_observation_inactive: [
    { field: "observation_id" }
  ],
  reactivate_entity: [
    { field: "entity_id" }
  ],
  get_entities: [
    { field: "entity_ids" }
  ],
  list_entities: []
  // all fields optional
};

// dist/hooks/input-validator.js
init_hook_timeouts();
init_hook_state();
var CONTRACT_BANNED_PATTERNS = [
  {
    label: "hardcoded effort-level enum (instant/fast/standard/\u2026)",
    regex: /['"`]instant['"`]\s*,\s*['"`]fast['"`]\s*,\s*['"`]standard['"`]/,
    fix: "Import EFFORT_LEVELS from '@gramatr/mcp/hooks/generated/schema-constants.js' instead of hardcoding."
  },
  {
    label: "hardcoded intent-type enum array (search/retrieve/create/update/\u2026)",
    // Only flag when these four appear together as an array literal — not inside
    // switch/case or if/else where partial matches are legitimate.
    regex: /\[\s*['"`]search['"`]\s*,\s*['"`]retrieve['"`]\s*,\s*['"`]create['"`]\s*,\s*['"`]update['"`]/,
    fix: "Import INTENT_TYPES from '@gramatr/mcp/hooks/generated/schema-constants.js' instead of hardcoding."
  },
  {
    label: "hardcoded memory-tier enum (hot/warm/cold) \u2014 concept removed from contracts",
    // Flag any array literal that includes these three tier strings together.
    regex: /['"`]hot['"`]\s*,\s*['"`]warm['"`]\s*,\s*['"`]cold['"`]/,
    fix: "The hot/warm/cold memory-tier concept has been removed. Use MEMORY_SCOPES from schema-constants.js."
  },
  {
    label: "inline Zod enum that should import from generated contracts",
    // z.enum([ followed immediately by a string literal — catches inline enum
    // definitions that bypass the generated constants.
    regex: /z\.enum\(\s*\[\s*['"`]/,
    fix: "Use z.enum(EFFORT_LEVELS) / z.enum(INTENT_TYPES) / z.enum(ENTITY_TYPES) \u2014 import arrays from '@gramatr/mcp/hooks/generated/schema-constants.js'."
  }
];
function isEnforcedPath(filePath) {
  const p2 = filePath.replace(/\\/g, "/");
  if (!p2.endsWith(".ts"))
    return false;
  if (!/\/packages\/[^/]+\/src\//.test(p2))
    return false;
  if (/\/generated\//.test(p2))
    return false;
  if (/\.test\./.test(p2))
    return false;
  return true;
}
function checkContractViolations(filePath, content) {
  if (!isEnforcedPath(filePath))
    return void 0;
  const violations = [];
  for (const pattern of CONTRACT_BANNED_PATTERNS) {
    if (pattern.regex.test(content)) {
      violations.push(`  \u2022 ${pattern.label}
    Fix: ${pattern.fix}`);
    }
  }
  if (violations.length === 0)
    return void 0;
  return `[gramatr contract enforcement] Banned hardcoded enum pattern(s) detected in ${filePath}:
` + violations.join("\n") + "\n\nAll classifier enums must be imported from generated/schema-constants.js, not inlined.";
}
function extractWriteTarget(toolName, input) {
  const shortTool = toolName.split("__").pop() ?? toolName;
  if (shortTool === "Write") {
    const filePath = typeof input.file_path === "string" ? input.file_path : void 0;
    const content = typeof input.content === "string" ? input.content : void 0;
    if (filePath && content !== void 0)
      return { filePath, content };
  }
  if (shortTool === "Edit") {
    const filePath = typeof input.file_path === "string" ? input.file_path : void 0;
    const newString = typeof input.new_string === "string" ? input.new_string : void 0;
    if (filePath && newString !== void 0)
      return { filePath, content: newString };
  }
  return void 0;
}
function readStdin(timeoutMs) {
  return new Promise((resolve2) => {
    let data = "";
    const timer = setTimeout(() => resolve2(data), timeoutMs);
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve2(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve2(data);
    });
    process.stdin.resume();
  });
}
function extractToolShortName(fullName) {
  const parts = fullName.split("__");
  return parts.length >= 3 ? parts.slice(2).join("__") : fullName;
}
function validate(toolName, input) {
  const shortName = extractToolShortName(toolName);
  const rules = TOOL_INPUT_RULES[shortName];
  if (!rules || rules.length === 0)
    return { allow: true };
  for (const rule of rules) {
    const value = input[rule.field];
    if (value === void 0 || value === null || value === "") {
      return { allow: false, reason: `Missing required field "${rule.field}" for ${shortName}. Provide a non-empty value.` };
    }
    if (rule.validValues && typeof value === "string") {
      const validSet = rule.field === "entity_type" ? ENTITY_TYPE_SET : new Set(rule.validValues);
      if (!validSet.has(value)) {
        return { allow: false, reason: `Invalid ${rule.field}="${value}" for ${shortName}. Valid values: ${rule.validValues.join(", ")}` };
      }
    }
  }
  if ("entity_type" in input && typeof input.entity_type === "string" && !ENTITY_TYPE_SET.has(input.entity_type)) {
    return {
      allow: false,
      reason: `Invalid entity_type="${input.entity_type}". Call list_entity_types for the full list.`
    };
  }
  return { allow: true };
}
function validateContractCompliance(toolName, input) {
  const target = extractWriteTarget(toolName, input);
  if (!target)
    return { allow: true };
  const warning = checkContractViolations(target.filePath, target.content);
  if (!warning)
    return { allow: true };
  return { allow: true, reason: warning };
}
var WRITE_TOOLS = /* @__PURE__ */ new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
function checkOrchAccessScope(sessionId, toolName, toolInput) {
  if (!sessionId || !WRITE_TOOLS.has(toolName))
    return null;
  try {
    const { getSessionContext: getSessionContext2 } = (init_hook_state(), __toCommonJS(hook_state_exports));
    const ctx = getSessionContext2(sessionId);
    if (!ctx?.orch_access_scope || !ctx.orch_dir)
      return null;
    const scope = ctx.orch_access_scope;
    if (scope === "open")
      return null;
    const targetPath = toolInput["file_path"] ?? toolInput["path"] ?? toolInput["notebook_path"];
    if (!targetPath)
      return null;
    const absTarget = (0, import_node_path3.isAbsolute)(targetPath) ? targetPath : (0, import_node_path3.resolve)(process.cwd(), targetPath);
    const orchDir = ctx.orch_dir;
    const workingDir = ctx.orch_working_dir ?? null;
    if (absTarget.startsWith(orchDir + "/") || absTarget === orchDir)
      return null;
    if (scope === "read_only") {
      return `Access scope is read_only \u2014 writes blocked outside orchestration scratch dir (${orchDir}). Write notes to scratch/ or output/ instead.`;
    }
    if (scope === "working_dir_only" && workingDir) {
      if (absTarget.startsWith(workingDir + "/") || absTarget === workingDir)
        return null;
      return `Access scope is working_dir_only \u2014 write blocked outside ${workingDir} and ${orchDir}.`;
    }
  } catch {
  }
  return null;
}
var NEW_TOOL_PHASE_HINTS = {
  get_reverse_engineering: /* @__PURE__ */ new Set(["think", "plan"]),
  get_quality_gates: /* @__PURE__ */ new Set(["plan", "verify", "build"]),
  add_quality_gate_criteria: /* @__PURE__ */ new Set(["plan", "verify"]),
  get_composed_agent: /* @__PURE__ */ new Set(["plan", "build"])
};
function logPhaseAdvisory(toolName, sessionId) {
  const short = extractToolShortName(toolName);
  const expectedPhases = NEW_TOOL_PHASE_HINTS[short];
  if (!expectedPhases)
    return;
  if (!sessionId)
    return;
  try {
    const latest = getLatestClassification(sessionId);
    const effort = (latest?.effort ?? "").toLowerCase();
    if (effort === "instant" || effort === "fast") {
      process.stderr.write(`[gramatr advisory] ${short} called at effort=${effort} \u2014 enrichment tools have no payload for trivial requests.
`);
      return;
    }
    if (!effort) {
      process.stderr.write(`[gramatr advisory] ${short} called with no active packet \u2014 phase context unknown. Expected phases: ${[...expectedPhases].join(", ")}.
`);
    }
  } catch {
  }
}
function buildPreToolUseOutput(allow, reason) {
  if (allow) {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        // Include reason as an informational warning when present (allow + reason = warning)
        ...reason ? { permissionDecisionReason: reason } : {}
      }
    };
  }
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason || "Tool call blocked by gramatr input validation."
    }
  };
}
async function runInputValidatorHook(_args = []) {
  const raw = await readStdin(HOOK_STDIN_DEFAULT_TIMEOUT_MS);
  if (!raw.trim()) {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
    return 0;
  }
  try {
    const input = JSON.parse(raw);
    if (!input.tool_name || !input.tool_input) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
      return 0;
    }
    try {
      logPhaseAdvisory(input.tool_name, input.session_id);
    } catch {
    }
    const result = validate(input.tool_name, input.tool_input);
    if (!result.allow) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(false, result.reason)));
      return 0;
    }
    const contractResult = validateContractCompliance(input.tool_name, input.tool_input);
    if (!contractResult.allow) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(false, contractResult.reason)));
      return 0;
    }
    const scopeDeny = checkOrchAccessScope(input.session_id, input.tool_name, input.tool_input);
    if (scopeDeny) {
      process.stdout.write(JSON.stringify(buildPreToolUseOutput(false, scopeDeny)));
      return 0;
    }
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(contractResult.allow, contractResult.reason)));
  } catch {
    process.stdout.write(JSON.stringify(buildPreToolUseOutput(true)));
  }
  return 0;
}

// dist/bin/input-validator.js
if (process.env.GRAMATR_INPUT_VALIDATOR_NO_AUTOSTART !== "1") {
  runInputValidatorHook(process.argv.slice(2)).then((code) => process.exit(code)).catch(() => process.exit(0));
}
