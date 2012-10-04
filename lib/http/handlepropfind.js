var pronto = require('pronto');
var HTTPUtil = require('./util');
var Property = require('./property');
var MultiStatus = require('./multistatus');
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
  this.cxt = cxt;
  this.path = params.path;
  this.resource = params.resource;
  var cmd = this;
  var xml = params.xml;
  var features = params.features || this.features;

  var justNames = xml && xml.getElementsByTagNameNS('DAV:', 'propname').length > 0
  this.request = cxt.getDatasource('request');

  // The Depth header. Values are 0, 1, infinity.
  // Spec says default for propfind is infinity.
  this.depth = this.request.headers.depth || 'infinity';

  // Assemble the list of property names to check:
  this.props = this.getProperties(xml, justNames);

  // Response headers
  var headers = {
    // Spec requires application/xml, not text/xml
    'Content-Type': 'application/xml; charset=utf-8',
    // Apparently required by iCal?
    'DAV': features.join(', ')
  }


  // These are each responsible for finishing a request.
  if (justNames) {
    // THIS IS NOT FINISHED
    this.handlePropname(headers);
    return;
  }
  else {
    this.handleProps(headers);
    return;
  }
}

HandlePropfind.prototype.handlePropname = function (headers) {
  //this.cxt.add('httpHeaders', headers);
  this.error('Not implemented');
}

HandlePropfind.prototype.handleProps = function (headers) {
  this.cxt.add('httpHeaders', headers);

  var multistatus = new MultiStatus();
  this.lookupProperties();

  this.cxt.log(this.props, 'debug');

  // Fake a status:
  multistatus.addProperties('/baz/', this.props);

  this.done(multistatus.toXML());
}

HandlePropfind.prototype.lookupProperties = function () {
  for (var i = 0; i < this.props.length; ++i) {
    this.props[i].status = 200;
    this.props[i].value = 'foo';
  }
}

/**
 * Get the properties that we should look up.
 */
HandlePropfind.prototype.getProperties = function (xml, justNames) {
  if (!xml) {
    return this.defaultProperties();
  }

  var propsNl = xml.getElementsByTagNameNS('DAV:', 'prop');
  if(propsNl.length > 0) {
    return this.extractProps(propsNl.item(0).childNodes);
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

    // supported-report-set?
  }
  return props;
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
    if (node.nodeType == 1) {
      console.log(node.tagName);
      props.push(new Property(node.namespaceURI, node.localName));
    }
  }


  return props;
}

