var pronto = require('pronto');
var HTTPUtil = require('./util');
var Property = require('./property');
/**
 * Handle HTTP PROPFINDrequests.
 *
 * PROPFIND is a WebDAV verb for learning about properties and
 * collections.
 *
 * See RFC 4918, section 9.1 
 * http://tools.ietf.org/html/rfc4918#page-35
 *
 * Params:
 *
 * - path: Path to the new collection (REQUIRED)
 * - resource: The existing Resource, if there is one (OPTIONAL)
 * - xml: The DOM of the XML body, if there is one (OPTIONAL)
 */
function HandlePropfind() {
  // Default features.
  this.features = [
    '1', '3', 'extended-mkcol'
  ];
}
pronto.inheritsCommand(HandlePropfind);
module.exports = HandlePropfind;

HandlePropfind.prototype.execute = function (cxt, params) {
  this.required(params, ['path']);
  var path = params.path;
  var resource = params.resource;
  var xml = params.xml;
  var features = params.features || this.features;

  var justNames = xml && xml.getElementsByTagNameNS('DAV:', 'propname').length > 0
  var request = cxt.getDatasource('request');

  // The Depth header. Values are 0, 1, infinity.
  var depth = request.headers.depth || 0;

  // Response headers
  var headers = {
    // Spec requires application/xml, not text/xml
    'Content-Type': 'application/xml; charset=utf-8',
    // Apparently required by iCal?
    'DAV': features.join(', ')
  }

  // First, we assemble the list of property names to check:
  var props = this.getProperties(xml, justNames);


  this.cxt.add('httpHeaders', headers);
  this.done(207);
}

/**
 * Get the properties that we should look up.
 */
HandlePropfind.prototype.getProperties = function (xml, justNames) {
  if (!xml) {
    return this.defaultProperties();
  }

  var propsNl = xml.getElementsByTagNameNS('DAV:', 'props');
  if(propsNl.length > 0) {
    return this.extractProps(propsNl);
  }

  // allprops or propname
  return this.defaultProperties(justNames);
}

/**
 * Default properties.
 *
 * Extra properties are added if namesOnly is true.
 */
HandlePropfind.prototype.defaultProperties = function (namesOnly) {
  var  props = [
    new Property('DAV:', 'creationdate'),
    new Property('DAV:', 'getcontentlength'),
    new Property('DAV:', 'getcontenttype'),
    new Property('DAV:', 'getetag'),
    new Property('DAV:', 'getlastmodified'),
    new Property('DAV:', 'resourcetype'),
  ];

  // RFC 4918 defines propnames, though I haven't found anything
  // that actually implements it.
  if (namesOnly) {
    // RFC 4331:
    // These carry a pretty heavy overhead, and are considered
    // to be live, so omit from allprops. RCF 4331 states that
    // they must be included in propname requests, though.
    props.push(new Property('DAV:', 'quota-used-bytes'));
    props.push(new Property('DAV:', 'quota-available-bytes'));
  }

}

/**
 * Extract all properties from a node list.
 */
HandlePropfind.prototype.extractProps = function (propsNl) {
  var props = [];
  if (propsNl.length == 0) {
    return props;
  }

  var len = propsNl.length;
  for (var i = 0; i < len; ++i) {
    var node = propsNl.item(i);
    console.log(node);
    if (node.nodeType == 1) {
      props.push(new Property(node.namespaceURI, node.localName));
    }
  }


  return props;
}
