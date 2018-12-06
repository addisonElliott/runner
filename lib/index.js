/* eslint complexity:0, no-shadow:0 */
/**
 * This module gets the ball rolling with the runner.
 * It puts together the relevant options and then passes them as command line
 * options to a worker process that it forks. That worker process is what
 * actually starts the mongodb deployments.
 */
const Promise = require('bluebird');
const fs = require('fs-extra');
const path = require('path');
const childProcess = require('child_process');
const format = require('util').format;
const untildify = require('untildify');
const defaults = require('lodash.defaults');
const mkdirp = require('mkdirp-promise');
const dbpath = require('mongodb-dbpath');
const async = require('async');
const debug = require('debug')('mongodb-runner');
const util = require('util');
const isMongodbRunning = require('is-mongodb-running/promise');

var getPIDPath = function(opts) {
  var pidPath = path.join(opts.pidpath, format('%s.pid', opts.name));
  debug('Process ID path is', pidPath);
  return pidPath;
};

var getPID = function(opts, done) {
  debug(
    'Looking for existing worker process ID to send control commands to...'
  );
  getPIDPath(opts, function(err, pidPath) {
    if (err) {
      return done(err);
    }

    fs.exists(pidPath, function(exists) {
      if (!exists) {
        debug(
          'No pid file found. Worker is orphaned or has not been started yet',
          pidPath
        );
        return done(null, -1);
      }

      fs.readFile(pidPath, 'utf-8', function(err, buf) {
        if (err) {
          return done(err);
        }
        debug('Found worker process ID', parseInt(buf, 10));
        done(null, parseInt(buf, 10));
      });
    });
  });
};

function removePIDFile(pidPath, done) {
  fs.remove(pidPath, done);
}

function kill(pid, done) {
  if (pid === -1) {
    debug('No worker process to kill. Noop.');
    return done();
  }

  debug('killing existing process', pid);
  try {
    process.kill(pid, 'SIGTERM');
  } catch (err) {
    debug('process kill failed?', err);
    if (err.code === 'ESRCH') {
      debug('orphaned pid file');
    } else {
      return done(err);
    }
  }
  done();
}

/**
 * @param {Object} opts
 * @param {Function} done
 * @api private
 */
function killIfRunning(opts, done) {
  debug('Killing worker processes for opts spec if they are running...');
  async.waterfall(
    [getPID.bind(null, opts), kill, getPIDPath.bind(null, opts), removePIDFile],
    done
  );
}

var setupAuthentication = function(opts) {
  return Promise.resolve();
  // done(null, opts);
  /**
   * @todo (imlucas): reimplement
   */
  // if (opts.secondUser) {
  //   db.addUser(opts.secondUser.username, opts.secondUser.password,
  //     {
  //       roles: opts.secondUser.roles
  //     }, function(err, result) {
  //       if (err) {
  //         db.close();
  //         return done(err, null);
  //       }
  //       debug('Create second user result `%j`', result);
  //
  //       if (opts.thirdUser) {
  //         db.addUser(opts.thirdUser.username, opts.thirdUser.password,
  //           {
  //             roles: opts.thirdUser.roles
  //           }, function(err, result) {
  //             if (err) {
  //               db.close();
  //               return done(err, null);
  //             }
  //             debug('Create third user result `%j`', result);
  //             db.close();
  //             return done(null, opts);
  //           });
  //       } else {
  //         db.close();
  //         return done(null, opts);
  //       }
  //     });
  // } else {
  //   db.close();
  //   return done(null, opts);
  // }
};

/**
 * This function starts a mongodb-runner-worker that is used to actually
 * start MongoDB deployments. This function by itself does NOT
 * start deployments. Rather, it takes the opts that it is passed,
 * and sends them as command line args to `../bin/mongodb-runner-worker.js`.
 * It then tries to connect to the MongoDB deployment to confirm that
 * it is up and running.
 * @param  {object}   opts user specified options
 */
var start = function(opts) {
  return new Promise(function(resolve, reject) {
    debug('Start function called');

    var bin = path.join(__dirname, '..', 'bin', 'mongodb-runner-worker.js');
    var args = [
      '--name=' + opts.name,
      '--dbpath=' + opts.dbpath,
      '--logpath=' + opts.logpath,
      '--port=' + opts.port,
      '--topology=' + opts.topology,
      '--mongodBin=' + opts.mongodBin,
      '--mongosBin=' + opts.mongosBin,
      '--purge=' + opts.purge,
      '--auth_mechanism=' + opts.auth_mechanism
    ];

    if (opts.bin) {
      args.push('--bin=' + opts.bin);
    }

    if (opts.auth_mechanism === 'MONGODB-CR' || opts.auth_mechanism === 'SCRAM-SHA-1') {
      args.push('--username=' + opts.username);
      args.push('--password=' + opts.password);
    }

    if (opts.storageEngine) {
      args.push('--storage_engine=' + opts.storageEngine);
    }

    if (opts.topology === 'replicaset') {
      args.push.apply(args, [
        '--arbiters=' + opts.arbiters,
        '--passives=' + opts.passives,
        '--secondaries=' + opts.secondaries
      ]);

      if (opts.auth_mechanism !== 'none') {
        args.push('--keyFile=' + opts.keyFile);
      }
    }

    if (opts.topology === 'cluster') {
      args.push.apply(args, [
        '--shards=' + opts.shards,
        '--mongoses=' + opts.mongoses,
        '--configs=' + opts.configs,
        '--shardPort=' + opts.shardPort,
        '--configPort=' + opts.configPort,
        '--arbiters=' + opts.arbiters,
        '--passives=' + opts.passives,
        '--secondaries=' + opts.secondaries
      ]);

      if (opts.auth_mechanism !== 'none') {
        args.push('--keyFile=' + opts.keyFile);
      }
    }

    isMongodbRunning().then(function(res) {
      if (res.length > 0) {
        // Already running, skip
        return Promise.reject(new Error('Unable to start MongoDB because it is already running: ' + res));
      }

      return null;
    }).then(function() {
      debug('Forking worker `%s` with args `%j`', bin, args);
      var proc = childProcess.fork(bin, args);

      proc.on('message', function(message) {
        debug('Received message from worker', message);

        if (!message.event) {
          throw new TypeError('Unknown message from worker ' + JSON.stringify(message, null, 2));
        }

        if (message.event === 'started') {
          setupAuthentication(opts).then(function() {
            return Promise.resolve(proc.pid);
          });
        }
      });

      proc.on('error', reject);

      debug('Worker process forked with PID', proc.pid);
      debug('Waiting for response from forked worker...');
    }).then(function(pid) {
      var pidPath = path.join(opts.pidpath, format('%s.pid', opts.name));

      return util.promisify(fs.writeFile)(pidPath, pid);
    }).then(resolve).catch(reject);
  });
};

/**
 * Cleans up artifacts from this specific run and then kills the process.
 *
 * @param {Object} opts
 * @param {Function} done
 * @api private
 */
function stop(opts, done) {
  debug('stopping...');

  killIfRunning(opts, function(err) {
    debug('Any running workers have been sent a stop command');
    done(err);
  });
}

/**
 * @param {Object} opts
 * @api private
 */
function getDbPath(opts) {
  return new Promise(function(resolve, reject) {
    // If dbpath is set, then do nothing
    if (opts.dbpath) {
      resolve();
      return;
    }

    // Otherwise get the dbpath and save it
    util.promisify(dbpath)(opts.name).then(function(path) {
      opts.dbpath = path;
      resolve();
    }).catch(reject);
  });
}

/**
 * @param {Object} opts
 * @api private
 */
function createLogsDirectory(opts) {
  return new Promise(function(resolve, reject) {
    // No directories are necessary for standalone server
    if (opts.topology === 'standalone') {
      resolve();
      return;
    }

    var directories = [opts.logpath];
    if (opts.topology === 'cluster') {
      directories.push(path.join(opts.logpath, 'configs'));
    }

    // Loop through directories and make each directory
    Promise.map(directories, function(directory) {
      return mkdirp(directory);
    }).then(resolve).catch(reject);
  });
}

/**
 * Populate `opts` as specified by environment specifies or defaults.
 *
 * TODO (imlucas): Document options.
 *
 * @param {Object} opts - user specified options
 * @api private
 */
function configure(opts) {
  return new Promise(function(resolve, reject) {
    // Update options to use defaults
    // Note: This is split into multiple defaults calls because the values from the defaults are used
    // in the later calls
    opts = defaults(opts, {
      topology: process.env.MONGODB_TOPOLOGY || 'standalone'
    });

    opts = defaults(opts, {
      name: opts.topology
    });

    opts = defaults(opts, {
      logpath: untildify(process.env.MONGODB_LOGPATH || format('~/.mongodb/runner/%s.log', opts.name)),
      pidpath: untildify(process.env.MONGODB_PIDPATH || '~/.mongodb/runner/pid'),
      port: Number(process.env.MONGODB_PORT) || 27017,
      mongodBin: process.env.MONGOD_BIN || 'mongod',
      mongosBin: process.env.MONGOS_BIN || 'mongos',
      storageEngine: process.env.MONGODB_STORAGE_ENGINE,
      auth_mechanism: process.env.MONGODB_AUTH_MECHANISM || 'none',
      purge: (process.env.MONGODB_PURGE === 'true') || true
    });

    // MongoDB < 3.0 doesn't understand the storageEngine argument and will fail to start if provided!
    if (opts.version < '3.0') {
      delete opts.storageEngine;
    }

    if (opts.topology === 'replicaset') {
      opts = defaults(opts, {
        arbiters: Number(process.env.MONGODB_ARBITERS) || 0,
        secondaries: Number(process.env.MONGODB_SECONDARIES) || 2,
        passives: Number(process.env.MONGODB_PASSIVES) || 0
      });
    }

    if (opts.topology === 'cluster') {
      opts = defaults(opts, {
        shards: Number(process.env.MONGODB_SHARDS) || 1, // -> replsets
        routers: Number(process.env.MONGODB_ROUTERS) || 1, // -> mongoses
        configs: Number(process.env.MONGODB_CONFIGS) || 1,
        shardPort: Number(process.env.MONGODB_SHARDS_PORT) || 31000, // -> replsetStartPort
        configPort: Number(process.env.MONGODB_CONFIGS_PORT) || 35000, // -> configStartPort
        arbiters: Number(process.env.MONGODB_ARBITERS) || 0,
        secondaries: Number(process.env.MONGODB_SECONDARIES) || 2,
        passives: Number(process.env.MONGODB_PASSIVES) || 0
      });
    }

    debug('Option defaults configured', opts);

    if (opts.action === 'stop') {
      // Nothing to configure for stopping server
      resolve();
    } else {
      // Create PID path, get dbPath if it doesnt exist, and create the necessary log directories
      mkdirp(opts.pidpath)
        .then(getDbPath)
        .then(createLogsDirectory)
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Starts or stops the runner. You provide options that tell it
 * what authentication mechanisms to use and whether to start or stop the
 * deployment.
 * ex:
 *  var opts = {
 *    action: 'start',
 *    name: 'mongodb-runner-test-cluster-user-pass',
 *    shardPort: 32000,
 *    configPort: 32100,
 *    port: 32200,
 *    shards: 3,
 *    auth_mechanism: ['SCRAM-SHA-1'],
 *    username: 'adminUser',
 *    password: 'adminPass',
 *    topology: 'cluster',
 *    keyFile: 'mongodb-keyfile',
 *  };
 *  run(opts, function(err) {
 *    if (err) return done(err);
 *    done();
 *  });
 *
 * @param {Object} opts - user specified options
 * @api public
 */
var exec = (module.exports = exports = function(opts) {
  return new Promise(function(resolve, reject) {
    opts.action = opts.action || 'start';
    opts.version = opts.version || process.env.MONGODB_VERSION;

    // Throw an error if the action is not a known value
    if (['install', 'start', 'stop'].indexOf(opts.action) === -1) {
      reject(new Error('Unknown action'));
      return;
    }

    var promise;

    // For all actions besides stop, install a
    // Install specified version of MongoDB server if action is not stop
    // Do nothing if the action is stop b/c we do not need MongoDB to stop the server
    if (opts.action !== 'stop') {
      debug('Retrieving MongoDB Server installation...');
      promise = util.promisify(require('mongodb-version-manager').use)({
        version: opts.version
      });
    } else {
      promise = Promise.resolve();
    }

    // Configure server and then call the appropriate function (start for start, stop for stop)
    promise.then(configure).then(function() {
      if (opts.action === 'install') {
        return null;
      } else if (opts.action === 'start') {
        return start(opts);
      } else if (opts.action === 'stop') {
        return stop(opts);
      }
    }).then(resolve).catch(reject);
  });
});

/**
 * @param {Object} opts
 * @param {Function} done
 * @api public
 */
exports.start = function(opts) {
  opts.action = 'start';
  return exec(opts);
};

/**
 * @param {Object} opts
 * @api public
 */
exports.status = function(opts) {
  return Promise.reject(new Error('Not implemented'));
};

/**
 * @param {Object} opts
 * @api public
 */
exports.stop = function(opts) {
  opts.action = 'stop';

  // TODO: look into me

  var t = setTimeout(function() {
    debug('resorting to kill-mongodb...');
    require('kill-mongodb')(function() {
      debug('kill-mongodb worked?', arguments);
    });
  }, 1000);
  exec(opts, function(err) {
    debug('stopped ok. clearing kill-mongodb waiter ');
    clearTimeout(t);
    done(err);
  });
};
