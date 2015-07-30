/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

