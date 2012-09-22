var pronto = require('pronto');
var Directory = require('./directory');

/**
 * Params:
 * - path: The path to the directory. (REQUIRED)
 * - root: The root filesystem path to be prepended to `path` to locate
 *   the directory on the file system. (OPTIONAL, default: '.')
 */
function LoadDirectory() {
}
module.exports = LoadDirectory;
pronto.inheritsCommand(LoadDirectory);

LoadDirectory.prototype.execute = function (cxt, params) {
  this.required(params, ['path']);
  var path = params.path;
  var root = params.root || '.';
  var realPath = root + path;

  var dir = new Directory(realPath);

  this.done(dir);
}
