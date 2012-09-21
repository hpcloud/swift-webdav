/**
 * Handle HTTP HEAD requests.
 *
 * HEAD requests are often used to verify file uploads.
 * So the emphasis here is on providing as much meaningful
 * information as possible.
 */
var pronto = require('pronto');
var HTTPUtil = require('./util');
var util = require('util');
var HandleGet = require('./handleget');

function HandleHead() {
}
util.inherits(HandleHead, HandleGet);
module.exports = HandleHead;

HandleHead.prototype.execute = function (cxt, params) {

  var resource = params.resource;
  var request = cxt.getDatasource('request');

  if (!resource) {
    this.done(404);
    return;
  }

  // RFC 4918 simply suggests that WebDAV adds nothing
  // new. We send a 200 because we are nice.
  if (resource.isCollection) {
    this.done(200);
    return;
  }

  // We don't set Content-Length so that Node uses chunked encoding.
  var responseHeaders = this.httpHeaders(resource, cxt);
  cxt.add('httpHeaders', responseHeaders);

  if (resource.length) {
    responseHeaders['Content-Length'] = resource.length;
  }

  this.done(200);
}

