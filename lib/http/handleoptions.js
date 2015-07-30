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
 * Handle a WebDAV OPTIONS request.
 *
 * Params:
 * - resource: The requested resource. If none is specified, we assume
 *   there is no resource at this path (which means we will add MKCOL
 *   to the list off allowed methods.) (OPTIONAL)
 * - methods: Override the default list of methods. (OPTIONAL)
 * - features: Override the default class/feature list. (OPTIONAL)
 */

var pronto = require('pronto');

function HandleOptions () {
  // Default methods.
  this.methods = [
    'OPTIONS', 'GET', 'HEAD', 'DELETE', 'PROPFIND', 
    'PUT','PROPPATCH','COPY','MOVE','REPORT'
  ];
  // Default features.
  this.features = [
    '1', '2', '3' //, 'extended-mkcol'
  ];
}
pronto.inheritsCommand(HandleOptions);
module.exports = HandleOptions;

HandleOptions.prototype.execute = function (cxt, params) {
  var resource = params.resource;
  var methods = params.methods || this.methods;
  var features = params.features || this.features;

  if (resource == undefined || resource == null) {
    methods.push('MKCOL');
  }

  var headers = {
    'Allow': methods.join(', '),
    'DAV': features.join(', '),
    'X-WebDAV-Provider': 'Pronto-WebDAV', // made up.
    'Accept-Ranges': 'bytes',
    'Content-Length': 0,
    //'Content-Type': 'application/xml',
    'MS-Author-Via': 'DAV'
  }


  // XXX: Do we remove MKCOL when the request URI points to a resource?

  this.done(headers);
}
