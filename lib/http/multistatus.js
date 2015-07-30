/**
 * (c) Copyright 2015 Hewlett-Packard Development Company, L.P.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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

/**
 *
 * @param {boolean} skipVals
 *   IF skipVals is truthy, no values will be serialized. This is used
 *   for 'PROPFIND allnames' requests.
 * @param {boolean} skipErrors
 *   On allprops, no 404 elements should be returned.
 */
MultiStatus.prototype.toXML = function (skipVals, skipErrors) {
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
    if (stat.props && stat.props.length > 0) {
      this._serializeProps(resEle, stat.props, skipVals, skipErrors);
    }
    // Status (e.g. DELETE, COPY, MOVE multistatus)
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
MultiStatus.prototype._serializeProps = function (parent, props, skipVals, skipErrors) {
  var doc = parent.ownerDocument;

  var codeGroups = {};
  for (var i = 0; i < props.length; ++i) {
    var property = props[i];

    if (!codeGroups[property.status]) {
      codeGroups[property.status] = doc.createElementNS('DAV:', 'D:prop');
    }

    property.toXML(codeGroups[property.status], skipVals);

  }

  // Don't report 404s.
  if(skipErrors && codeGroups['404']) {
    delete codeGroups['404'];
  }

  for (var statEle in codeGroups) {
    this._serializePropstat(statEle, codeGroups[statEle], parent, doc);
  }
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
  switch (parseInt(code)) {
    case 200:
      return prefix + '200 OK';
    case 403:
      return prefix + '403 Forbidden';
    case 404:
      return prefix + '404 Not Found';
    case 423:
      return prefix + '423 Locked';
    case 424:
      return prefix + '424 Failed Dependency';
    default:
      return prefix + code + ' Error';
  }

}
