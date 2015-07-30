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
var pronto = require('pronto');
var Memcached = require('memcached');
var Util = require('util');

// cmd is here so it can be available to the error event callbacks.
var cmd;

/**
 * Setup Memcached and add it to the context.
 *
 * Params:
 * - settings: The memcached settings (REQUIRED). This is an object with the
 *   servers and the options.
 * - name: The name of the datasource to add the cache to. (OPTIONAL)
 * 
 * For more details on config see https://github.com/3rd-Eden/node-memcached
 */
function setupMemcached () {
}
pronto.inheritsCommand(setupMemcached);
module.exports = setupMemcached;

setupMemcached.prototype.execute = function (cxt, params) {
	this.required(params, ['settings']);

  if (!params.settings.servers) {
    this.error("Cannot find Memcached settings.");
    return;
  }
	var servers = params.settings.servers;
	var config = params.settings.config;
	var name = params.name;

	if (!config) {
		config = {};
	}

	var cache = new Memcached(servers, config);

	// Add logging to our log.
	cache.on('issue', function (issue) {
		var format = "\033[1;35m[%s]\033[0m Issue occured on memcached server %s, %s attempts left until failure. Message: %s.";
		var date = new Date().toUTCString();
		cxt.log(format, date, issue.server, issue.retries, issue.messages.join( '' ), 'warning');
	});
	cache.on('failure', function (issue) {
		var format = "\033[1;35m[%s]\033[0m Connecting to memcached server %s failed. Message: %s.";
		var date = new Date().toUTCString();
		cxt.log(format, date, issue.server, issue.messages.join( '' ), 'error');
	});
	cache.on('reconnecting', function (issue) {
		var format = "\033[1;35m[%s]\033[0m Attempting to reconnect to memcached server %s. Message %s.";
		var date = new Date().toUTCString();
		cxt.log(format, date, issue.server, issue.messages.join( '' ), 'info');
	});
	cache.on('reconnected', function (issue) {
		var format = "\033[1;35m[%s]\033[0m Reconnected to memcached server %s. Message: %s.";
		var date = new Date().toUTCString();
		cxt.log(format, date, issue.server, issue.messages.join( '' ), 'info');
	});
	cache.on('remove', function (issue) {
		var format = "\033[1;35m[%s]\033[0m Removing memcached server %s from use. Message: %s.";
		var date = new Date().toUTCString();
		cxt.log(format, date, issue.server, issue.messages.join( '' ), 'error');
	});

	if (name) {
		cxt.addDatasource(name, cache);
	}

	return this.done(cache);

}
