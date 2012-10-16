/**
 * Handle a WebDAV OPTIONS request.
 *
 * Params:
 * - resource: The requested resource. If none is specified, we assume
 *   there is no resource at this path (which means we will add MKCOL
 *   to the list off allowed methods.) (OPTIONAL)
 * - methods: Override the default list of methods. (OPTIONAL)
 * - features: Override the default class/feature list. (OPTIONAL)
 */

var pronto = require('pronto');

function HandleOptions () {
  // Default methods.
  this.methods = [
    'OPTIONS', 'GET', 'HEAD', 'DELETE', 'PROPFIND', 
    'PUT','PROPPATCH','COPY','MOVE','REPORT'
  ];
  // Default features.
  this.features = [
    '1', '3' //, 'extended-mkcol'
  ];
}
pronto.inheritsCommand(HandleOptions);
module.exports = HandleOptions;

HandleOptions.prototype.execute = function (cxt, params) {
  var resource = params.resource;
  var methods = params.methods || this.methods;
  var features = params.features || this.features;

  if (resource == undefined || resource == null) {
    methods.push('MKCOL');
  }

  var headers = {
    'Allow': methods.join(', '),
    'DAV': features.join(', '),
    'X-WebDAV-Provider': 'Pronto-WebDAV', // made up.
    'Accept-Ranges': 'bytes',
    'Content-Length': 0,
    //'Content-Type': 'application/xml',
    'MS-Author-Via': 'DAV'
  }


  // XXX: Do we remove MKCOL when the request URI points to a resource?

  this.done(headers);
}
