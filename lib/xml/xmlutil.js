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

/**
 * Uses James Clark's original namespacing suggestion.
 *
 * Names are generated as `{nsurl}lname`. So <foo:bar xmlns:foo="baz:"/> has
 * the clark name {baz:}bar.
 *
 * http://www.jclark.com/xml/xmlns.htm
 *
 * This is much easier for comparisons.
 */
exports.clarkNS = function (ns, lname) {
  return '{' + ns + '}' + lname;
}
