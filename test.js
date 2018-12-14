// const runner = require('./');
const deserializeError = require('deserialize-error');
// process.env.DEBUG = '*';

// runner({
//   action: 'start'
// });

var errObjectOriginal = {
  name: 'Error',
  message: '222failed to start mongod with options --bind_ip=localhost,--port=27017,--storageEngine,--dbpath=/home/addison/.mongodb/data/standalone,--logpath=/home/addison/.mongodb/runner/standalone.log\n2018-12-14T10:10:54.488-0600 I CONTROL  [main] log file \"/home/addison/.mongodb/runner/standalone.log\" exists; moved to \"/home/addison/.mongodb/runner/standalone.log.2018-12-14T16-10-54\".\n\nstderr:',
  stack: 'Error: 222failed to start mongod with options --bind_ip=localhost,--port=27017,--storageEngine,--dbpath=/home/addison/.mongodb/data/standalone,--logpath=/home/addison/.mongodb/runner/standalone.log\n2018-12-14T10:10:54.488-0600 I CONTROL  [main] log file \"/home/addison/.mongodb/runner/standalone.log\" exists; moved to \"/home/addison/.mongodb/runner/standalone.log.2018-12-14T16-10-54\".\n\nstderr:\n    at ChildProcess.<anonymous> (/mnt/d/Users/addis/Documents/NodeJS/Linux/runner/node_modules/mongodb-topology-manager/lib/server.js:405:15)\n    at ChildProcess.emit (events.js:180:13)\n    at maybeClose (internal/child_process.js:936:16)\n    at Socket.stream.socket.on (internal/child_process.js:353:11)\n    at Socket.emit (events.js:180:13)\n    at Pipe._handle.close [as _onclose] (net.js:541:12)'
};

var errString = JSON.stringify(errObjectOriginal);

var errObject = JSON.parse(errString);

// console.log(errString);
// console.log(typeof(errObjectOriginal));
// console.log(typeof(errString));
// console.log(typeof(errObject));
// console.log(typeof(new TypeError()));

var x = new TypeError();
// Object.assign(x, errObject);
// x.name = 'TypeError';
// x.message = 'woahhhh';
x['message'] = 'woahhh';

// console.error(new TypeError('Failed to do stuff'));
// console.error(x);

console.log(new TypeError('Failed to do stuff'));
console.log(x);

// console.error(errObject);
// console.error(deserializeError(errObject));

// errObject = JSON.parse(errString);
// console.log(typeof(errObject));
