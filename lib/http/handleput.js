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
var pronto = require('pronto');
var HTTPUtil = require('./util');
/**
 * Handle HTTP PUT requests.
 *
 * In WebDAV, PUTs only work on files, not collections.
 * MKCOL is used to create a collection.
 *
 * Params:
 * - resourceBridge: The resource bridge (REQUIRED)
 * - path: The path to the resource (REQUIRED)
 * - readStream: The data to read off of the socket and write into
 *   the file. stream.resume() is called on this in case the
 *   stream is buffering. (REQUIRED)
 * - resource: The remote resource that that lives at the
 *   given path. (OPTIONAL)
 */
function HandlePut() {
}
pronto.inheritsCommand(HandlePut);
module.exports = HandlePut;

HandlePut.prototype.execute = function (cxt, params) {
  var cmd = this;

  this.required(params, ['resourceBridge', 'readStream', 'path']);

  var returnCode = 201;

  var resource = params.resource;
  var bridge = params.resourceBridge;
  var input = params.readStream;
  var path = params.path;

  var request = cxt.getDatasource('request');

  // I'm not sure if this ever actually happens, but SabreDAV
  // corrects for it, so I assume they know something we don't.
  if (request.headers['content-range']) {
    // Not allowed by draft-ietf-httpbis-p2-semantics-15
    // cf. RFC 2616, 9.6
    cxt.log('Content-Range in a PUT request.', 'warning');
    this.reroute('@501', cxt);
    return;
  }

  // If a 0-byte file is being sent, we need to kill the input stream.
  if (parseInt(request.headers['content-length']) == 0) {
    input = new pronto.streams.StringReader('');
  }

  // If the resource exists, see if we have conditions for not
  // replacing:
  if (resource) {
    if (resource.isCollection) {
      cxt.add('body', 'Cannot PUT a file over a collection.');
      this.reroute('@409', cxt);
      return;
    }
    var preconditions = HTTPUtil.checkPreconditions(request, resource);

    if (preconditions != 200) {
      // Preconditions can only return 412 from a PUT. 304 only
      // comes form a GET/HEAD
      cxt.log('info', 'PUT preconditions failed with code ' + preconditions);
      cxt.add('body', 'Failed to match preconditions. ');
      this.reroute('@412', cxt);
      return;
    }
    returnCode = 204;
  }
  // If we don't have a resource, we stub one out.
  else {
   resource = bridge.createFile(path);
   resource.isNew = true;
  }

  // We re-set these properties explicitly:
  resource.setContentType(request.headers['content-type'] || HTTPUtil.guessContentType(path, resource));
  var enc = HTTPUtil.guessContentEncoding(path);
  if (enc) {
    resource.setContentEncoding(enc);
  }

  bridge.save(resource, input, function (e, data) {
    if (e) {
      cxt.log('PUT failed: ' + e.message, 'info');
      if (e.status) {
        cmd.reroute('@' + e.status, cxt);
      } else {
        cmd.reroute('@500', cxt);
      }
      return;
    }

    var headers = {
      'Date': HTTPUtil.date(),
      'Content-Length': 0
    };

    if (data.etag) {
      headers['ETag'] = data.etag;
    }

    cxt.add('httpHeaders', headers);

    cmd.done(returnCode);
  });
}
