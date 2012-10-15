var pronto = require('pronto');
var Property = require('./property');
var MultiStatus = require('./multistatus');
var dom = require('xmldom');
/**
 * Handle PROPPATCH  method.
 *
 * This is defined in RFC 4918 9.2
 *
 * Params:
 *
 * - resource
 * - xml
 */
function HandleProppatch () {
  // Properties protected by default.
  this.protectedProperties = [
    'creationdate', 'getcontentlength', 'getcontenttype', 'getetag',
    'getlastmodified', 'lockdiscovery', 'resourcetype', 'supportedlock',
    'quota-used-bytes', 'quota-available-bytes'
  ];
}
pronto.inheritsCommand(HandleProppatch);
module.exports = HandleProppatch;

HandleProppatch.prototype.execute = function (cxt, params) {
  this.required(params, ['resourceBridge']);
  this.resource = params.resource;
  this.bridge = params.resourceBridge;
  this.cxt = cxt;

  var xml = params.xml;

  if (!this.resource) {
    this.reroute('@404', cxt);
    return;
  }

  this.cxt.add('httpHeaders', {
    'Content-Type': 'application/xml; charset=utf-8',
  });

  // No XML means malformed.
  if (!xml) {
    this.reroute('@400', cxt);
    return;
  }
  var update = xml.getElementsByTagNameNS('DAV:', 'propertyupdate');
  if (update.length == 0) {
    this.reroute('@400', cxt);
    return;
  }
  var updatesNL = update.item(0).childNodes;

  if (!updatesNL) {
    console.log(update);
    this.reroute('@500', cxt);
    return;
  }

  var cmd = this;
  this.handleUpdates(updatesNL);
  // Nothing below here.
}

HandleProppatch.prototype.handleUpdates = function (updatesNL) {
  var self = this;
  var queue = [];
  var resource = this.resource;
  var bridge = this.bridge;
  var href = this.resource.name();
  var existingProperties = resource.properties() || [];
  var validationError = false;

  // Get a queue of commands and properties.
  for (var i = 0; i < updatesNL.length; ++i) {
    var node = updatesNL.item(i);

    // SKip non-elements.
    if (node.nodeType != 1) continue;

    var cmd = node.localName;
    var propsNL = node.getElementsByTagNameNS('DAV:', 'prop').item(0).childNodes;
    var properties = this.extractProperties(propsNL);

    // We need to extract all of the properties even if some of them
    // fail. So we validate now, but don't do anything about it until
    // all of the properties are loaded.
    if(this.validateProperties(properties, cmd)) validationError = true;

    queue.push({cmd: cmd, props: properties});
    //for (var j = 0; j < properties.length; ++j) {
    //  queue.push({cmd: cmd, prop: properties[j]});
    //}
  }

  // If there's an error, we're done.
  if (validationError) {
    this.handleError(href, queue);
    return;
  }

  // Process the queue.
  multistatus = this.mergeProperties(resource, queue);

  // Save the properties.
  bridge.saveProperties(resource, function (e, res) {
    if (e) {
      // XXX: This does not seem like the best solution.
      // We don't have any view into the ResourceBridge, so we give a
      // general error. Do we return just an error? Or do we return a
      // 207 with everything set to 424?
      self.cxt.log("A bad thing happened to our properties: ", e.message, "error");
      //multistatus[0].status = e.status || 500;
      //this.handleError(resource.name(), queue);
      self.reroute('@500', self.cxt);
      return;
    }

    var ms = new MultiStatus();
    console.log(multistatus);
    ms.addProperties(href, multistatus);
    self.done(ms.toXML());
  });

}

HandleProppatch.prototype.handleError = function (href, queue) {

  // Any property that doesn't already have an error code must be given
  // a 424 (Failed Dependency) code. See RFC 4918 9.2.2
  var multistatus = [];
  for (var i = 0; i < queue.length; ++i) {
    var cmdProps = queue[i].props;
    for (var j = 0; j < cmdProps.length; ++j) {
      var prop = cmdProps[j];
      if (!prop.status || prop.status == 200) {
        prop.status = 424;
      }
      multistatus.push(prop);
    }
  }

  // SPIT IT OUT!
  var ms = new MultiStatus();
  ms.addProperties(href, multistatus);
  this.done(ms.toXML());
}

/**
 * Extract properties and possibly their values.
 */
HandleProppatch.prototype.extractProperties = function (propsNL) {
  var props = [];
  for (var i = 0; i < propsNL.length; ++i) {
    var node = propsNL.item(i);
    if (node.nodeType != 1) continue;

    var p = new Property(node.namespaceURI, node.localName);
    var content = '';
    for (var j = 0; j < node.childNodes.length; ++j) {
      var kid = node.childNodes.item(j);
      if (kid.nodeType == 1) {
        p.valueType = Property.XML_VALUE
        content += new dom.XMLSerializer().serializeToString(kid);
      }
      else {
        content += kid.nodeValue;
      }
    }
    p.value = content;
    props.push(p);
  }
  return props;
}

HandleProppatch.prototype.validateProperties = function (properties, verb) {
  var validationError = false;
  for (var i = 0; i < properties.length; ++i) {
    var p = properties[i];
    var cname = p.clarkName();
    // Empty NS is illegal.
    if (!p.ns || p.ns.length == 0) {
      p.status = 400;
      validationError = true;
    }
    if (this.protectedProperties.indexOf(cname) >= 0) {
      // FAIL
      p.status = 403;
      validationError = true;
    }
    // 80kb is standard, I guess.
    else if (p.value && p.value.length > 1024 * 80) {
      p.status = 507;
      validationError = true;
    }

  }
  return validationError;
}

/**
 * Merge all if the properties into the resource.
 *
 * This handles set and remove operations on a resource's existing
 * (DEAD) properties.
 *
 * It returns a list of all of the properties. This can be used
 * for generating a multistatus.
 *
 * @return {Array}
 *   An array of Property objects. An individual property may or may not
 *   have a status on it. Absence of a status does not mean that the
 *   properties can be stored -- that is handled by the property
 *   storage.
 */
HandleProppatch.prototype.mergeProperties = function (resource, queue) {
  var modifiedProps = [];
  // We get a queue of operations (save, remove), each of which may have
  // one or more properties. These must be executed in the order
  // provided.
  for (var i = 0; i < queue.length; ++i) {
    var verb = queue[i].cmd.toLowerCase();
    if (verb == 'set') {
      this.setProperties(resource, queue[i].props);
    }
    else if (verb == 'remove') {
      this.removeProperties(resource, queue[i].props);
    }
    else {
      // What? Ignore? Fail?
      this.cxt.log("Unknown proppatch verb: %s", verb, 'info');
    }
    modifiedProps.concat(queue[i]);
  }
  return modifiedProps;
}

HandleProppatch.prototype.setProperties = function (resource, properties) {
  // XXX: This is inefficient and ugly.

  var oldProps = resource.properties();

  // Iterate new properties.
  for (var i = 0; i < properties.length; ++i) {
    var found = false;
    var property = properties[i];
    var cname = property.clarkName();
    this.cxt.log("Setting %s", cname, 'debug');
    // Look through old properties to see if we're replacing.
    for (var j = 0; j < oldProps.length; ++j) {
      if (oldProps[j].clarkName() == cname) {
        found = true;
        oldProps[j] = property;
      }
    }
    // If we're not replacing, add to the end.
    if (!found) {
      oldProps.push(property);
    }
  }

  // Set the properties.
  resource.setProperties(oldProps);
}

HandleProppatch.prototype.removeProperties = function (resource, properties) {
  // XXX: This is inefficient and ugly.

  var oldProps = resource.properties();
  var toDelete = [];
  var newProps = [];

  // Get a list of things we want to delete.
  for (var i = 0; i < properties.length; ++i) {
    toDelete.push(properties[i].clarkName());
  }

  // Create a new list that excludes things we want to delete.
  for (var j = 0; j < oldProps.length; ++j) {
    if (!toDelete.indexOf(oldProps[j].clarkName())) {
      newProps.push(oldProps[j]);
    }
  }

  resource.setProperties(newProps);
}
