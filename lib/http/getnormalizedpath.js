var pronto = require('pronto');

/**
 * Params:
 * - baseURI
 */

function GetNormalizedPath() {
}
pronto.inheritsCommand(GetNormalizedPath);
module.exports = GetNormalizedPath;

GetNormalizedPath.prototype.execute = function (cxt, params) {
  var baseURI = params.baseURI || '';
  var req = cxt.getDatasource('request');
  var path = req.parsedUrl.pathname;

  var newPath = GetNormalizedPath.normalize(path, baseURI);

  console.log("Original: %s, Normalized path: %s", path, newPath);
  this.done(newPath);
}

GetNormalizedPath.normalize = function (path, base) {
  var relative = path;
  if (path.indexOf(base) == 0) {
    relative = path.substring(base.length - 1);
  }

  return relative;
}
