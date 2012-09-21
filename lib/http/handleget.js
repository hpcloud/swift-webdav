/**
 * Handle HTTP GET requests in a WebDAV-specific way.
 */
var pronto = require('pronto');
var HTTPUtil = require('./util');

function HandleGet() {
}
pronto.inheritsCommand(HandleGet);
module.exports = HandleGet;

HandleGet.prototype.execute = function (cxt, params) {

  var resource = params.resource;
  var request = cxt.getDatasource('request');

  if (!resource) {
    this.done(404);
    return;
  }

  // In WebDAV, directory listings are not implemented.
  // FIXME: Should add a handler to allow directory listings.
  if (resource.isCollection) {
    this.done(501);
    return;
  }

  var statusCode = HTTPUtil.checkPreconditions(request, resource)

  // We don't set Content-Length so that Node uses chunked encoding.
  var responseHeaders = {
    'Content-Type': resource.contentType(),
    'Last-Modified': resource.lastModified(),
    'ETag': resource.etag()
  }

  if (statusCode != 200) {
    cxt.add('httpHeaders');
    this.done(statusCode);
    return;
  }

  // FIXME: Need to add support for RANGE operations


  cxt.add('httpHeaders');
  this.done(statusCode);
}

