var crypto = require('crypto');

/**
 * Create a new element and take care of the XMLNS.
 *
 * This creates a new element and sets the namespace. It sets a prefix
 * for DAV: elements and inlines the xmlns on others.
 */
exports.createNSElement= function (uri, lname, document) {
  // Leaving off a namespace is illegal, so we give a default.
  if (!uri || uri.length == 0) {
    //console.log('***** No NS for %s', lname);
    uri = 'DAV:';
  }
  var ele;
  if (uri == 'DAV:') {
    var name = 'D:' + lname;
    ele = document.createElementNS(uri, name);
    return ele;
  }
  else {
    ele = document.createElementNS(uri, lname);
    ele.setAttribute('xmlns', uri);
  }
  return ele;
}
