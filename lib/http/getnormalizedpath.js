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
var Path = require('path');

/**
 * Params:
 * - baseURI
 * - path: If this is set, this path will be normalized. Otherwise the
 *   request path will be normalized.
 */

function GetNormalizedPath() {
}
pronto.inheritsCommand(GetNormalizedPath);
module.exports = GetNormalizedPath;

GetNormalizedPath.prototype.execute = function (cxt, params) {
  var baseURI = params.baseURI || '';
  var req = cxt.getDatasource('request');
  var path = params.path || req.parsedUrl.pathname;

  var newPath = GetNormalizedPath.normalize(path, baseURI);

  //console.log("Original: %s, Normalized path: %s", path, newPath);

  this.done(newPath);
}

GetNormalizedPath.normalize = function (path, base) {
  var relative = path;
  if (path.indexOf(base) == 0) {
    relative = path.substring(base.length);
  }

  // Make sure nobody tries to sneak in `../`.
  // This is sort brute force, and should probably be fixed:
  relative = Path.normalize(relative.replace(/(\.\.\/)/g,''));

  return relative;
}
