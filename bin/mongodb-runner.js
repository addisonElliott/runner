#!/usr/bin/env node

var path = require('path');
var fs = require('fs');
var run = require('../');
var clui = require('clui');
var debug = require('debug')('mongodb-runner:bin:mongodb-runner.js');

var args = require('minimist')(process.argv.slice(2), {
  boolean: ['debug']
});

if (args.debug) {
  process.env.DEBUG = 'mongodb-runner*';
}

args.action = args.action || args._[0] || 'start';

if (args.help || args.h) {
  /* eslint no-sync:0 no-console:0 */
  var usage = fs.readFileSync(path.resolve(__dirname, '../usage.txt')).toString();

  console.log(usage);
  process.exit(1);
}

if (args.version) {
  var pkg = require('../package.json');

  console.log(pkg.version);
  process.exit(1);
}

debug('Running action `%s` with args %s...', args.action, args);

if (!process.env.CI) {
  if (args.action === 'start') {
    new clui.Spinner('Starting a MongoDB deployment to test against...').start();
  } else if (args.action === 'stop') {
    new clui.Spinner('Stopping any local MongoDB deployments...').start();
  }
}

run(args, function(err) {
  if (err) {
    console.error(err);
    process.exit(1);
    return;
  }

  debug('ran action `%s` successfully', args.action);
  process.exit(0);
});
