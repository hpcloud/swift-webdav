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

  var cmd = this;
  var xml = params.xml;
  var features = params.features || this.features;

  this.cxt = cxt;
  this.path = params.path;
  this.resource = params.resource;
  this.request = cxt.getDatasource('request');
  this.depth = this.request.headers.depth;

  // This seems sorta risky. It's what the spec says to do, though I see
  // implementations setting depth to 1.
  if (this.depth == undefined) {
    this.depth = 'infinity';
  }

  var headers = {
    // Spec requires application/xml, not text/xml
    'Content-Type': 'application/xml; charset=utf-8',
    // Apparently required by iCal?
    'DAV': features.join(', ')
  }

  // Some misbehaving clients do not send bodies for allprops
  // requests.
  if (!xml) {
    this.props = this.defaultProperties();
    this.handleProps(headers);
    return;
  }

  // Make sure the client at least is trying to send good data:
  if (xml.getElementsByTagNameNS('DAV:', 'propfind').length == 0) {
    this.reroute('@400', cxt);
    return;
  }


  var justNames = xml.getElementsByTagNameNS('DAV:', 'propname').length > 0

  // The Depth header. Values are 0, 1, infinity.
  // Spec says default for propfind is infinity.
  cxt.log("PROPFIND depth: %s (%s), type: %s", this.request.headers.depth, this.depth, justNames? 'propname' : 'prop', 'access');


  // Assemble the list of property names to check:
  this.props = this.getProperties(xml, justNames);

  // Response headers


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
  if (!this.lookupProperties()) {
    // An error occured, and we trust that the lookupProperties function
    // correctly rerouted.
    return;
  }

  this.cxt.log(this.props, 'debug');

  // Fake a status:
  multistatus.addProperties('/baz/', this.props);

  this.done(multistatus.toXML());
}

HandlePropfind.prototype.lookupProperties = function () {
  for (var i = 0; i < this.props.length; ++i) {
    var prop = this.props[i];
    if (!prop.ns) {
      // Apparently this is enough to consider the entire request
      // malformed. Litmus requires that we throw a 400.
      this.cxt.log('Encountered property with empty namespace', 'warning');
      this.reroute('@400', this.cxt);
      return false;
    }
    prop.status = 200;
    prop.value = 'foo';
  }
  return true;
}

/**
 * Get the properties that we should look up.
 */
HandlePropfind.prototype.getProperties = function (xml, justNames) {
  if (!xml) {
    this.cxt.log('No XML body found, generating default properties.', 'debug');
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
      this.cxt.log("Found {%s}%s", node.namespaceURI, node.tagName, 'debug');
      props.push(new Property(node.namespaceURI, node.localName));
    }
  }


  return props;
}

