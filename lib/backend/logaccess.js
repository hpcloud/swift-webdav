var pronto = require('pronto');

/**
 * Log an access.
 *
 * This logs a request.
 *
 * params:
 *
 * - level: The log level. Default is 'access'. (OPTIONAL)
 * - format: The log format string. (OPTIONAL)
 */
function LogAccess() {}
pronto.inheritsCommand(LogAccess);
module.exports = LogAccess;

LogAccess.prototype.execute = function (cxt, params) {

  var format = "\033[1;35m[%s]\033[1;36m===> %s\033[0m %s (%s)";
  var level = params.level || 'access';
  var request = cxt.datasource('request');
  var headers = request.headers;
  var date = new Date().toUTCString();
  var host = headers.host || request.parsedURL.host || 'no host';

  cxt.log(format, date, request.method, request.url, host, level);
  //cxt.log('headers: %j', req.headers, 'debug');

  // Log the Litmus test.
  if (headers['x-litmus']) {
    cxt.log("Litmus \033[1;33m%s\033[0m", headers['x-litmus'], 'debug');
  }

  //var msg = '===> ' + req.method + ' ' + req.url + ' (normalized: ' + newPath + ')';
  //cxt.log(msg, 'debug');
  //var fmt = '\033[1;35m===> %s\033[0m %s (normalized: %s)';
  //cxt.log(fmt, req.method, req.url, newPath, 'debug');
  //cxt.log('headers: %j', req.headers, 'debug');
  this.done();
}
