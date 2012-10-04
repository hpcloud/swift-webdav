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

  //console.log("Original: %s, Normalized path: %s", path, newPath);

  var msg = '===> ' + req.method + ' ' + req.url + ' (normalized: ' + newPath + ')';
  cxt.log(msg, 'debug');
  cxt.log(JSON.stringify(req.headers), 'debug');
  this.done(newPath);
}

GetNormalizedPath.normalize = function (path, base) {
  var relative = path;
  if (path.indexOf(base) == 0) {
    relative = path.substring(base.length);
  }

  return relative;
}
