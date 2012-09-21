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
  var responseHeaders = this.httpHeaders(resource, cxt);

  if (statusCode != 200) {
    cxt.add('httpHeaders', responseHeaders);
    this.done(statusCode);
    return;
  }


  // FIXME: Need to add support for RANGE operations


  cxt.add('httpHeaders', responseHeaders);
  this.done(statusCode);
}

HandleGet.prototype.httpHeaders = function (resource, cxt) {
  // We don't set Content-Length so that Node uses chunked encoding.
  var responseHeaders = {
    'Content-Type': resource.contentType(),
    'Last-Modified': (new Date(resource.lastModified())).toUTCString(),
    'X-Chicken-Class': 'Funky'
  }

  var etag = resource.etag();
  if (etag) {
    responseHeaders['ETag'] = etag;
  }

  return responseHeaders;
}

