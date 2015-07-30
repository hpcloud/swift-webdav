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
/**
 * A Collection resource.
 *
 * This resource represents a collection of File and Collection
 * resources. It is analogous to a file system directory. The term
 * 'Collection' comes from the WebDAV standard.
 */
var util = require('util');
var Resource = require('./resource');

function Collection(path) {
  this.isCollection = true;
  Resource.call(this, path);
}
module.exports = Collection;
util.inherits(Collection, Resource);

Collection.prototype.childExists = function (name, fn) {
}
Collection.prototype.getChild = function (name, fn) {
}
Collection.prototype.getChildren = function (fn) {
}
