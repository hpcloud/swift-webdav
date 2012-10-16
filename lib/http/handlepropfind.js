var pronto = require('pronto');
var HTTPUtil = require('./util');
var XMLUtil = require('../xml/xmlutil');
var Property = require('./property');
var MultiStatus = require('./multistatus');
var Resource = require('../resource');
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
    '1', '2,', '3'// , 'extended-mkcol'
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

  this.propertyStore = cxt.getDatasource('properties');

  // This seems sorta risky. It's what the spec says to do, though I see
  // implementations setting depth to 1.
  if (this.depth == undefined) {
    this.depth = 'infinity';
  }

  // We can still access and modify these later if we need.
  this.cxt.add('httpHeaders', {
    // Spec requires application/xml, not text/xml
    'Content-Type': 'application/xml; charset=utf-8',
    // Apparently required by iCal?
    'DAV': features.join(', ')
  });

  // If the resource does not exist, this is a 404.
  if (!this.resource) {
    this.reroute('@404', cxt);
    return;
  }

  // The process for handling a propfind is something like this:
  //
  // 1. Look at the XML passed to us
  // 2. Figure out what kind of request it is
  // 3. Figure out what properties we need to know about
  // 4. Get a list of the resources we need to check
  // 5. Get the properties for each resource
  // 6. Store a multistatus response

  // This is an allprop request.
  if (!xml) {
    cxt.log("PROPFIND depth: %s (%s), type: %s", this.request.headers.depth, this.depth, 'allprop (assumed)', 'access');
    this.props = this.defaultProperties();
    this.handleProps();
    return;
  }
  // Make sure the client at least is trying to send good data. If not,
  // we give up now.
  else if (xml.getElementsByTagNameNS('DAV:', 'propfind').length == 0) {
    this.reroute('@400', cxt);
    return;
  }
  // Handle propname calls.
  else if (xml.getElementsByTagNameNS('DAV:', 'propname').length > 0) {
    cxt.log("PROPFIND depth: %s (%s), type: %s", this.request.headers.depth, this.depth, 'propname', 'access');
    this.handlePropname();
    return;
  }
  // Handle allprop calls.
  else if (xml.getElementsByTagNameNS('DAV:', 'allprop').length > 0) {
    cxt.log("PROPFIND depth: %s (%s), type: %s", this.request.headers.depth, this.depth, 'allprop', 'access');
    this.props = this.defaultProperties();
    this.includedProperties(xml, this.props);
    this.handleProps();
    return;
  }
  // Assume we are doing a prop call.
  else {
    cxt.log("PROPFIND depth: %s (%s), type: %s", this.request.headers.depth, this.depth, 'prop', 'access');
    this.props = this.extractProperties(xml);

    // If there were no properties, this is a malformed request.
    if (this.props.length == 0) {
      this.reroute('@400', cxt);
      return;
    }
    this.handleProps();
    return;
  }
}

/**
 * Handle propname operations.
 */
HandlePropfind.prototype.handlePropname = function () {
  //this.cxt.add('httpHeaders', headers);
  this.error('Not implemented');
}

/**
 * Handle a prop operation.
 */
HandlePropfind.prototype.handleProps = function () {

  var multistatus = new MultiStatus();

  // Just get props on the current item.
  if (this.depth == 0) {
    console.log("Depth 0 propfind on %s", this.resource.name(), 'debug');
    var props = this.lookupProperties(this.resource);
    multistatus.addProperties(this.resource.name(), props);
    this.done(multistatus.toXML());
  }
  // Get ancestor props for the collection.
  else if (this.resource.isCollection) {
    console.log("Depth %s propfind on %s", this.depth, this.resource.name(), 'debug');
    var deep = this.depth != 1;
    var self = this;
    this.bridge.listContents(this.resource, deep, function (e, resources) {
      // Loop through all the resources and add their properties.
      for (var i = 0; i < resources.length; ++i) {
        var props = this.lookupProperties(reources[i]);
        multistatus.addProperties(resources[i].name(), props);
      }
      this.done(multistatus.toXML());
    });
  }
  // Houston, we have a problem.
  else {
    this.cxt.log("Depth %s propfind on %s", this.depth, this.resource.name(), 'debug');
    // What do we do with a file and depth > 0?
    this.cxt.log('Got PROPFIND on a file, depth > 0', 'warning');
    //this.reroute('@400', this.cxt);
    var props = this.lookupProperties(this.resource);
    multistatus.addProperties(this.resource.name(), props);
    this.done(multistatus.toXML());
    return;
  }
}

/**
 * Given a resource, lookup all of the properties that the client asked
 * for.
 *
 * @param {Resource} resource
 *   The resource.
 * @return {Array}
 *   A list of Properties for that resource.
 */
HandlePropfind.prototype.lookupProperties = function (resource) {
  // Build a dictionary mapping of the properties we are looking for.
  var dict = Resource.propertyMap(this.props);
  // Get the dead properties for this resource. Any misses will remain
  // on the list with the status code 404 (or another more applicable
  // code).
  var propertiesForResource = resource.properties(dict);

  // Push any live properties. By doing this second, we make sure we
  // don't overwrite a live property with a dead property.
  for (var i = 0; i < propertiesForResource.length; ++i) {
    var prop = propertiesForResource[i];
    if (resource.isCollection) {
      this.collectionProperties(resource, prop);
    }
    else {
      this.fileProperties(resource, prop);
    }
  }

  return propertiesForResource;
}


/**
 * Given a file and a property, get the contents of that property.
 *
 * This JUST checks KNOWN LIVE PROPERTIES.
 */
HandlePropfind.prototype.fileProperties = function (file, property) {

  // DAV ones are shortened to the lname, while nonDAV are expanded to 
  // their clark notion ({uri}lname)
  var seekName = property.clarkName();

  switch (seekName) {
    case 'getlastmodified':
      property.value = HTTPUtil.isoDate(file.lastModified())
      property.status = 200;
      break;
    case 'getetag':
      property.value = file.etag();
      if (property.value) property.status = 200;
      break;
    case 'getcontenttype':
      property.value = file.contentType();
      property.status = 200;
      break;
    case 'creationdate':
      property.value = file.creationDate();
      if (property.value) property.status = 200;
      break;
  }
}

/**
 * Given a collection and a property, fill out the property.
 *
 * This JUST checks KNOWN LIVE PROPERTIES.
 */
HandlePropfind.prototype.collectionProperties = function (collection, property) {
  this.cxt.log("Adding properties to a collection.", 'debug');
  switch (property.name) {
    case 'getlastmodified':
      property.value = HTTPUtil.isoDate(collection.lastModified())
      property.status = 200;
      break;
    case 'resourcetype':
      property.value = '<D:collection/>';
      property.status = 200;
      property.valueType = Property.XML_VALUE;
  }
}

HandlePropfind.prototype.searchPropertyStorage = function(property, storedProperties) {
  var seekName = property.clarkName();
  // If there are stored properties, loop through them to see if there
  // are any that we need here.
  if (storedProperties) {
    for (var i = 0; i < storedProperties.length; ++i) {
      var p = storedProperties[i];
      if(p.clarkName() == seekName) {
        // If we find one, copy over the values.
        //property.value = p.value;
        //property.valueType = p.valueType;
        //property.protected = p.protected;
        p.status = 200;
      }
    }
  }
  return p;
}


/**
 * Get the list of default properties.
 *
 * Largely, these are divined from the WebDAV standard.
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
 * Extract all properties from XML.
 */
HandlePropfind.prototype.extractProperties = function (xml) {
  var propsNl = xml.getElementsByTagNameNS('DAV:', 'prop');
  var props = [];
  if (propsNl.length == 0) {
    return props;
  }
  var children = propsNl.item(0).childNodes;

  var len = children.length;
  for (var i = 0; i < len; ++i) {
    var node = children.item(i);
    if (node.nodeType == 1) {
      // Apparently this is enough to consider the entire request
      // malformed. Litmus requires that we throw a 400.
      if (!node.namespaceURI) {
        this.cxt.log('Encountered property with empty namespace', 'warning');
        return [];
      }
      this.cxt.log("Found {%s}%s", node.namespaceURI, node.tagName, 'debug');
      props.push(new Property(node.namespaceURI, node.localName));
    }
  }

  return props;
}

/**
 * Process <include/> properties for an allprop.
 */
HandlePropfind.prototype.includedProperties = function(xml, list) {
  var nl = xml.getElementsByTagNameNS('DAV:', 'include');
  if (nl.length == 0) {
    return;
  }
  var included = nl.item(0);
  for (var i = 0; i < included.childNodes.length; ++i) {
    var node = included.childNodes.item(i);
    if (node.nodeType == 1) {
      // Apparently this is enough to consider the entire request
      // malformed. Litmus requires that we throw a 400.
      if (!node.namespaceURI) {
        this.cxt.log('Encountered property with empty namespace', 'warning');
        return [];
      }
      this.cxt.log("Including {%s}%s", node.namespaceURI, node.tagName, 'debug');
      list.push(new Property(node.namespaceURI, node.localName));
    }
  }
}

