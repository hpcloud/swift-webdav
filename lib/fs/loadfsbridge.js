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
  var baseURI = params.baseURI || '/';
  var req = cxt.getDatasource('request');

  var propStore = cxt.getDatasource('properties');
  if (!propStore) {
    cxt.log("Could not initialize datasource 'properties'", "fatal");
    this.error("Failed to load required datasource.");
  }

  var bridge = new FSBridge(root, baseURI, cxt, propStore);
  this.done(bridge);
}
