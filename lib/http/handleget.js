/**
 * Handle HTTP GET requests in a WebDAV-specific way.
 */
var pronto = require('pronto');S
var HTTPUtil = require('./util');

function HandleGet() {
}
pronto.inheritsCommand(HandleGet);
module.exports = HandleGet;

HandleGet.prototype.execute = function (cxt, params) {

  var resource = params.resource;
  var request = cxt.getDatasource('request');

  if (!resource) {
    // FIXME: This is a hack to get a 404.
    this.error(new Error('Request not found'));
    return;
  }

  var statusCode = HTTPUtil.testCacheRules(request, resource);
}

