// This file will be used for testing and learning stuff about MongoDB, NodeJS and much more!

const Promise = require('bluebird');
var Server = require('mongodb-topology-manager').Server;
var VersionManager = require('mongodb-version-manager');
var debug = require('debug')('mongodb-runner:test');
var untildify = require('untildify');
var format = require('util').format;
var util = require('util');

module.exports = function(opts) {
  var server;
  var delay = 0;

  debug('Initializing test with opts:' + JSON.stringify(opts));

  var serverOpts = {
    bind_ip: 'localhost',
    port: opts.port,
    storageEngine: opts.storage_engine,
    dbpath: opts.dbpath,
    logpath: opts.logpath,
    rest: false,
    purge: opts.purge
  };

  server = new Server(opts.mongodBin, serverOpts);
  delay = 0;

  // TODO: I guess this is a hack?
  opts.server = server;

  debug('Starting standalone topology...');

  util.promisify(VersionManager.use)({
    version: opts.version
  }).then(function(result) {
    if (opts.purge) {
      return server.purge();
    }
    
    return null;
  }).then(server.start)/*.then(function() {
    debug('Purged it baby!');

    return server.start();
  })*/.then(function() {
    debug('Okay, worked!');
  }).catch(function(err) {
    debug('Errr: ', err);
  })

  // util.promisify(VersionManager.use)({
  //   version: opts.version
  // }).then(function(result) {
  //   if (opts.purge) {
  //     return server.purge();
  //   }

  //   return null;
  // }).then(server.start()).then(function() {
  //   debug('I started the server without auth!');
  // }).catch(function(err) {
  //   debug('Error while trying to start server');
  // });
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