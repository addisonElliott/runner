// This file will be used for testing and learning stuff about MongoDB, NodeJS and much more!

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

  // TODO: Why this line?
  opts.purge = opts.purge === 'true';

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
  }).then(server.start()).then(function() {
    debug('I started the server without auth!');
  }, function(err) {
    debug('Error while trying to start server222', err);
  }).catch(function(err) {
    debug('Error while trying to start server', err);
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