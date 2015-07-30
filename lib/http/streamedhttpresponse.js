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
 * This is a variation of the HTTPResponse from Pronto.
 */
var util = require('util');
var pronto = require('pronto');
var Buffer = require('buffer').Buffer;


/**
 * Issue an HTTP response to a client.
 *
 * This handles an individual response case
 * for an HTTP request. Standard IO like writing
 * headers and body data are handled here.
 *
 * Params:
 * - code: The HTTP response code (default: 200)
 * - contentType: The MIME type of the returned content. (Default: text/plain)
 * - headers: An object containing the headers as name/value pairs.
 * - stream: The stream to write to the body.
 * - encoding: The character encoding used to write the body. This data is not 
 *    used in the request. (Default: utf8)
 */
function StreamedHTTPResponse() {
  
}
util.inherits(StreamedHTTPResponse, pronto.Command);
module.exports = StreamedHTTPResponse;

StreamedHTTPResponse.prototype.execute = function(cxt, params) {
  var code = params.code || 200;
  var headers = params.headers || {};
  var encoding = params.encoding || 'utf8'; // Unused

  var contentType = params.contentType;
  var contentLength = params.contentLength;
  var stream = params.stream;
  
  //var req = cxt.getDatasource('request');
  var response = cxt.getDatasource('response');

  if (contentType != undefined) {
    headers['Content-Type'] = contentType;
  }
  else if (headers['Content-Type'] == undefined) {
    headers['Content-Type'] = 'text/plain';
  }
  if (contentLength) {
    headers['Content-Length'] = contentLength;
  }

  response.writeHead(code, headers);

  // Okay... now it's time to push out the data
  // as fast as possible.
  if (stream && stream.pipe) {
    // pronto.streams.BufferedReader
    if (stream.open) {
      stream.open();
    }
    // socket and http.IncommingMessage, among
    // others.
    else if (stream.resume) {
      stream.resume();
    }
    // Stream in the background.
    stream.pipe(response);
  }
  else {
    response.end();
  }
  this.done();
}
