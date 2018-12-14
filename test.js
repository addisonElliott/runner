const runner = require('./');

process.env.DEBUG = '*';

runner({
  action: 'start'
});
