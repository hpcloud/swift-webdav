var pronto = require('pronto');
var Path = require('path');

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

  //var msg = '===> ' + req.method + ' ' + req.url + ' (normalized: ' + newPath + ')';
  //cxt.log(msg, 'debug');
  var fmt = '\033[1;35m===> %s\033[0m %s (normalized: %s)';
  cxt.log(fmt, req.method, req.url, newPath, 'debug');
  cxt.log('headers: %j', req.headers, 'debug');
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
