var pronto = require('pronto');
var SwiftBridge = require('./swiftbridge');
/**
 * Load the swift bridge.
 *
 * Params:
 * -identity
 * -region
 * -endpoint
 * -container (OPTIONAL)
 * -baseURI (OPTIONAL)
 */
function LoadSwiftBridge(){}
pronto.inheritsCommand(LoadSwiftBridge);
module.exports = LoadSwiftBridge;

LoadSwiftBridge.prototype.execute = function (cxt, params) {
  this.required(params, ['identity', 'region', 'endpoint']);

  var req = cxt.datasource('request');
  var identity = params.identity;
  var endpoint = params.endpoint;
  var region = params.region;
  var container = params.container || '';
  var baseURI = params.baseURI || this.buildBaseURI(identity, container);

  var bridge = new SwiftBridge(identity, endpoint, baseURI, region, container);
  bridge.setContext(cxt);

  this.done(bridge);
}


LoadSwiftBridge.prototype.buildBaseURI = function (identity, container) {
  var tid = identity.tenantId();
  if (!tid) {
    return '/';
  }

  var url = "/" + tid + "/";
  if (container && container.length > 0) {
    url += container + "/";
  }
  return url;
}
