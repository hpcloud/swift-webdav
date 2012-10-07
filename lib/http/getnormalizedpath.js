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
