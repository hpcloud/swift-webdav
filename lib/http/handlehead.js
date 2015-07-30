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

