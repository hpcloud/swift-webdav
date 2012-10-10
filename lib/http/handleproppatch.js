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
function HandleProppatch () {}
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

  for (var i = 0; i < updatesNL.length; ++i) {
    var node = updatesNL.item(i);

    // SKip non-elements.
    if (node.nodeType != 1) continue;

    var cmd = node.localName;
    var propsNL = node.getElementsByTagNameNS('DAV:', 'prop').item(0).childNodes;
    var properties = this.extractProperties(propsNL);
    //queue.push({cmd: cmd, props: properties});
    for (var j = 0; j < properties.length; ++j) {
      queue.push({cmd: cmd, prop: properties[j]});
    }
  }

  function _each(list, multistatus, fn, done) {
    if (list.length == 0) {
      done(false, multistatus);
      return;
    }
    var head = list.shift();
    self.cxt.log("_each(%j)", head, 'debug');
    fn(head, multistatus, function (e) {
      if (e) {
        //done(e, multistatus);
        _each(list, multistatus, _markError, done);
        return;
      }
      _each(list, multistatus, fn, done);
    });
  }

  function _markError(propdef, multistatus, fn) {
    propdef.prop.status = 424;
    multistatus.push(propdef.prop);
    fn(new Error('424'));
  }

  function _do(propdef, multistatus, fn) {
    var op = propdef.cmd.toLowerCase();
    if ( op == 'set') {
      bridge.setProperty(resource, propdef.prop, function(e) {
        self.cxt.log(propdef.prop, 'warning');
        if (e) {
          propdef.prop.status = e.status;
          propdef.prop.precondition = e.precondition;
        }
        multistatus.push(propdef.prop);
        fn(e, multistatus);
      });
    }
    else if (op == 'remove') {
      bridge.removeProperty(resource, propdef.prop, function(e) {
        if (e) {
          propdef.prop.status = e.status;
          propdef.prop.precondition = e.precondition;
        }
        multistatus.push(propdef.prop);
        fn(e, multistatus);
      });
    }
    else {
      fn(new Error('Unknown operation'), multistatus);
    }
  }

  _each(queue, [], _do, function (e, multistatus) {
    var ms = new MultiStatus();
    console.log(multistatus);
    ms.addProperties(href, multistatus);
    self.done(ms.toXML());
  });
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
        content += new XMLSerializer.serializeToString(kid);
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
