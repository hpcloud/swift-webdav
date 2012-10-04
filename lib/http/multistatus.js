//var dom = require('xmldom/dom');
var DOMParser = require('xmldom').DOMParser;

/**
 * A MultiStatus message.
 * 
 * See RFC 4918, section 13.
 */
function MultiStatus() {
  this.stats = [];
}
module.exports = MultiStatus;

/**
 * Add a properties status (PROPFIND).
 */
MultiStatus.prototype.addProperties = function (href, properties) {
  this.stats.push({
    href: href,
    //status: this.statusFromCode(statusCode),
    props: properties
  });
}

/**
 * Add an href status (DELETE, etc.)
 */
MultiStatus.prototype.addStatus = function (href, status) {
  this.stats.push({href: href, status: status});
}

MultiStatus.prototype.toXML = function () {
  var D = 'DAV:';

  // This does not work according to spec.
  //var dom = require('xmldom/dom');
  //var domFactory = new dom.DOMImplementation();
  //var doc = domFactory.createDocument(D, 'D:multistatus', '<?xml version="1.0" ?>');
  //doc.documentElement.setAttribute('xml:D', D);

  // This is an annoying hack:
  var doc = new DOMParser().parseFromString(
    '<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"/>'
  );

  var msEle = doc.documentElement;//.createElementNS(D, 'multistatus');

  for (var i = 0; i < this.stats.length; ++i) {
    var stat = this.stats[i];

    var resEle = doc.createElementNS(D, 'D:response');
    var hrefEle = doc.createElementNS(D, 'D:href');

    // <href>http://foo</href>
    hrefEle.appendChild(doc.createTextNode(stat.href));
    resEle.appendChild(hrefEle);
    msEle.appendChild(resEle);

    // Propstats (e.g. PROPFIND multistatus)
    if (stat.props.length > 0) {
      this._serializeProps(resEle, stat.props)
    }
    // Status (e.g. DELETE multistatus)
    else if (stat.status) {
      var statusEle = doc.createElementNS(D, 'D:status');
      var msg = this.statusFromCode(stat.status);
      statusEle.appendChild(doc.createTextNode(msg));
      resEle.appendChild(statusEle);
    }

  }

  return doc;
}

/**
 * INTERNAL: Serialize properties for PROPFIND.
 */
MultiStatus.prototype._serializeProps = function (parent, props) {
  var doc = parent.ownerDocument;

  var notFound = doc.createElementNS('DAV:', 'D:prop');
  var ok = doc.createElementNS('DAV:', 'D:prop');

  for (var i = 0; i < props.length; ++i) {
    var property = props[i];
    if (property.status == 200) {
      property.toXML(ok);
    }
    else {
      property.toXML(notFound);
    }
  }

  this._serializePropstat(200, ok, parent, doc)
  this._serializePropstat(404, notFound, parent, doc)

}

/**
 * INTERNAL: Create propstat element.
 */
MultiStatus.prototype._serializePropstat = function (status, props, parent, doc) {
  if (props.hasChildNodes() == false) {
    return;
  }

  var statusMsg = this.statusFromCode(status);
  var propstat = doc.createElementNS('DAV:', 'D:propstat');
  var stat = doc.createElementNS('DAV:', 'D:status');

  stat.appendChild(doc.createTextNode(statusMsg));
  propstat.appendChild(props);
  propstat.appendChild(stat);
  parent.appendChild(propstat);

}

/**
 * Utility for converting an HTTP code to a status message.
 */
MultiStatus.prototype.statusFromCode = function (code) {
  var prefix = 'HTTP/1.1 ';
  switch (code) {
    case 200:
      return prefix + '200 OK';
    case 403:
      return prefix + '403 Forbidden';
    case 404:
      return prefix + '404 Not Found';
    case 423:
      return prefix + '423 Locked';
    default:
      return prefix + ' ' + code ' Error';
  }

}
