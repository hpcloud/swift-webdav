var pronto = require('pronto');

function HandleOptions () {
  // Default methods.
  this.methods = [
    'OPTIONS', 'GET', 'HEAD', 'DELETE', 'PROPFIND', 
    'MKCOL','PUT','PROPPATCH','COPY','MOVE','REPORT'
  ];
  // Default features.
  this.features = [
    '1', '3', 'extended-mkcol'
  ];
}
pronto.inheritsCommand(HandleOptions);
module.exports = HandleOptions;

HandleOptions.prototype.execute = function (cxt, params) {

  var methods = params.methods || this.methods;
  var features = params.features || this.features;

  var headers = {
    'Allow': methods.join(', '),
    'DAV': features.join(', '),
    'X-WebDAV-Provider': 'Pronto-WebDAV', // made up.
    'Accept-Ranges': 'bytes',
    'Content-Length': 0,
    'MS-Author-Via': 'DAV'
  }


  // XXX: Do we remove MKCOL when the request URI points to a resource?

  this.done(headers);
}
