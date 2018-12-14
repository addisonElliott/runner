#!/usr/bin/env node
const debug = require('debug')('mongodb-runner:bin:mongodb-runner-worker.js');
const args = require('minimist')(process.argv.slice(2), {});
const startWorker = require('../lib/worker');
const serializeError = require('serialize-error');

debug('Starting...');

startWorker(args).then(function() {
  debug('MongoDB process spawned successfully!');

  process.on('SIGTERM', function() {
    debug('Stopping `%s` server, received SIGTERM', args.name);
    args.server.stop();
  });
}).catch(function(err) {
  process.send({
    event: 'error',
    err: JSON.stringify(serializeError(err))
  });
});

// startWorker(args, function(err, opts) {
//   /* eslint no-console:0 */
//   if (err) {
//     console.error(
//       'mongodb-runner:bin:mongodb-runner-worker.js Unexpected error. Exiting.',
//       err
//     );
//     process.send({
//       event: 'error',
//       opts: opts
//     });
//     setTimeout(function() {
//       process.exit(1);
//     }, 500);
//     return;
//   }

//   debug('MongoDB processes spawned successfully!');

//   debug(
//     'Remaining alive in the background to await control commands from parent process...'
//   );

//   function onServerStopped() {
//     debug('`%s` stopped', opts.name);
//     server = null;
//     opts = null;
//     debug('goodbye');

//     process.exit(0);
//   }

//   /**
//    * When this process receives a SIGTERM, this stops the server processes
//    * by calling `mongodb-tools`'s stop function.
//    */
//   process.on('SIGTERM', function() {
//     debug('stopping `%s`...', opts.name);
//     opts.server.stop({ signal: 9 }, onServerStopped);
//   });
// });
