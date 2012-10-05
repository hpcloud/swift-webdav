var pronto = require('pronto');
var URL = require('url');
var GetNormalizedPath = require('./getnormalizedpath');

/**
 * Validate a Destination header.
 */
function ValidateDestination() {}
pronto.inheritsCommand(ValidateDestination);
module.exports = ValidateDestination;

ValidateDestination.prototype.execute = function (cxt, params) {
  var req = cxt.getDatasource('request');
  var dest = params.destination || req.headers.destination;

  // Check that the Destination is correct.
  if(!dest) {
    // 25 years of my life and still
    // Trying to get up this great big hill
    //   Of hope
    // For a destination.
    cxt.add('body', 'No Destination');
    this.reroute('@409', cxt);
    return;
  }

  var destUrl = URL.parse(dest);
  var thisHost = req.parsedUrl.host || req.headers.host;
  if (thisHost && destUrl.host != thisHost) {
    cxt.log(req.parsedUrl, 'debug');
    cxt.log('Host is %s, expected %s.', destUrl.host, thisHost);
    this.reroute('@502', cxt);
    return;
  }

  // We try to test to make sure the paths are not the same. The spec
  // says this should produce a 403.
  var destPath = GetNormalizedPath.normalize(destUrl.pathname).replace(/\/$/,'');
  var srcPath = GetNormalizedPath.normalize(req.parsedUrl.pathname).replace(/\/$/,'');
  cxt.log('Source: %s, Dest: %s', srcPath, destPath, 'debug');
  if (destPath == srcPath) {
    cxt.log('Cannot copy a resource onto itself.', 'debug');
    cxt.add('body', 'Cannot copy a resource to itself.');
    this.reroute('@403', cxt);
    return;
  }

  this.done(destUrl.pathname);

}

