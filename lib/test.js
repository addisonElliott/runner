// This file will be used for testing and learning stuff about MongoDB, NodeJS and much more!

var Server = require('mongodb-topology-manager').Server;
var VersionManager = require('mongodb-version-manager');
var debug = require('debug')('mongodb-runner:test');
var untildify = require('untildify');
var format = require('util').format;
var util = require('util');

process.env.DEBUG = '*';

module.exports = function(opts) {
  var server;

  debug('Initializing test with opts:' + JSON.stringify(opts));

  var serverOpts = {
    bind_ip: 'localhost',
    port: opts.port,
    // storageEngine: opts.storage_engine,
    dbpath: opts.dbpath,
    logpath: opts.logpath
  };

  server = new Server(opts.mongodBin, serverOpts);

  // TODO: I guess this is a hack?
  opts.server = server;

  debug('Starting standalone topology...');

  util.promisify(VersionManager.use)({
    version: opts.version
  }).then(function() {
    if (opts.purge) {
      return server.purge();
    }

    return null;
  }).then(function() {
    return server.start();
  }).then(function() {
    debug('Okay, worked!');
    return server.stop();
  }).catch(function(err) {
    debug('Errr: ', err, err.stderr);
  });
};

// Testing here
module.exports({
  topology: 'standalone',
  name: 'standalone',
  logpath: untildify(format('~/.mongodb/runner/%s.log', 'standalone')),
  pidpath: untildify('~/.mongodb/runner/pid'),
  dbpath: untildify('~/.mongodb/data/standalone'),
  port: 27017,
  mongodBin: 'mongod',
  mongosBin: 'mongos',
  auth_mechanism: 'none',
  purge: true,
  version: 'stable'
});

// var defaults = require('lodash.defaults');

// console.log(defaults({
//   version: 1
// }, {
//   version: 12,
//   storageEngine: 'testing'
// }, {
//   anotherTest: 'tessss'
// }));

// opts = {
//   test: 2
// }

// if (opts.version < '3.0') {
//   console.log('yes');
// } else {
//   console.log('no');
// }

// Run:
// DEBUG=* node lib/test.js
//
// Test if started:
// ps -aux | grep mongodb
//
// Also tests:
// netstat | grep 27017
//
// Result:
// Unhandled rejection Error: [object Object]
// at ChildProcess.<anonymous> (/home/addison/Desktop/NodeJS/runner/node_modules/mongodb-topology-manager/lib/server.js:397:18)
// at emitOne (events.js:116:13)
// at ChildProcess.emit (events.js:211:7)
// at Process.ChildProcess._handle.onexit (internal/child_process.js:196:12)
// at onErrorNT (internal/child_process.js:372:16)
// at _combinedTickCallback (internal/process/next_tick.js:138:11)
// at process._tickCallback (internal/process/next_tick.js:180:9)

// TODO Make change to mongodb-topology-manager, server.js line 404:
//               new Error(f('failed to start mongod with options %s\n%s\n%s', commandOptions, stdout, stderr))

// Seems to be working, have to run with sudo :/, not spawning. I guess that is how it should work though! Right or no?
// I think the blocking fact is intentional because resolve is not called until it is closed.

// Fixed the issue with the standalone path being root only. Deleted the folder and got it to recreate itself.
// Issue with this is that if you start with sudo once, that folder is owned/grouped to root automatically. Then if you try to
// run without sudo, it will fail because you can't write to the directory.
// TODO Fix this bug
// Not sure there is any way to fix it besides just not doing that?

// TODO Need to make some changes to mongodb-topology-manager first before I can alter runner
