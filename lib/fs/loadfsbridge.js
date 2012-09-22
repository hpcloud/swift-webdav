var pronto = require('pronto');
var FSBridge = require('./fsbridge');

/**
 * Params:
 * - root: The root filesystem path to be prepended to `path` to locate
 *   the directory on the file system. (OPTIONAL, default: '.')
 */
function LoadFSBridge() {
}
module.exports = LoadFSBridge;
pronto.inheritsCommand(LoadFSBridge);

LoadFSBridge.prototype.execute = function (cxt, params) {
  var root = params.root || '.';
  var bridge = new FSBridge(root);
  this.done(bridge);
}
