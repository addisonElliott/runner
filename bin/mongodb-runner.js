#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const clui = require('clui');

// Process arguments, specifying that debug option is a boolean
var args = require('minimist')(process.argv.slice(2), {
  boolean: ['debug']
});

// Set debug env variable so debug commands are printed out
if (args.debug) {
  process.env.DEBUG = 'mongodb-runner*';
}

// Debug must come after DEBUG env variable is set
const debug = require('debug')('mongodb-runner:bin:mongodb-runner.js');
const run = require('../');

// Update action to be the specified action, first command given or start by default
args.action = args.action || args._[0] || 'start';

// Delete all unnamed arguments since they are not used (once action is read)
delete args._;

// Display help text and quit
if (args.help || args.h) {
  /* eslint no-sync:0 no-console:0 */
  var usage = fs.readFileSync(path.resolve(__dirname, '../usage.txt')).toString();

  console.log(usage);
  process.exit(1);
}

// Display version from package.json and quit
if (args.version) {
  var pkg = require('../package.json');

  console.log(pkg.version);
  process.exit(1);
}

debug('Running action `%s` with args', args.action, args);

// Display spinner if not running this in continuous integration
var spinner = null;
if (!process.env.CI) {
  if (args.action === 'start') {
    spinner = new clui.Spinner('Starting a MongoDB deployment to test against...');
    spinner.start();
  } else if (args.action === 'stop') {
    spinner = new clui.Spinner('Stopping any local MongoDB deployments...');
    spinner.start();
  }
}

setTimeout(function() {
  spinner.stop();
  debug('Ran action `%s` successfully', args.action);
  process.exit(0);
}, 2000);

// // Run with given arguments
// run(args).then(function() {
//   debug('Ran action `%s` successfully', args.action);
//   process.exit(0);
// }).catch(function(err) {
//   console.error(err);
//   process.exit(1);
// });
