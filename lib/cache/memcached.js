var pronto = require('pronto');
var Memcached = require('memcached');

/**
 * Setup Memcached and add it to the context.
 *
 * Params:
 * - settings: The memcached settings (REQUIRED). This is an object with the
 *   servers and the options.
 * 
 * For more details on config see https://github.com/3rd-Eden/node-memcached
 */
function setupMemcached () {
}
pronto.inheritsCommand(setupMemcached);
module.exports = setupMemcached;

setupMemcached.prototype.execute = function (cxt, params) {
	this.required(params, ['settings']);
	var servers = params.settings.servers;
	var config = params.settings.config;

	if (!config) {
		config = {};
	}

	var cache = new Memcached(servers, config);

	// Add logging to our log.
	cache.on('issue', this.eventOnIssue);
	cache.on('failure', this.eventOnFailure);
	cache.on('reconnecting', this.eventOnReconnecting);
	cache.on('reconnected', this.eventOnReconnected);
	cache.on('remove', this.eventOnRemove);


	return this.done(cache);

}

setupMemcached.prototype.eventOnIssue = function (issue) {
	var format = "\033[1;35m[%s]\033[0m Issue occured on memcached server %s, %s attempts left until failure. Message: %s.";
	var date = new Date().toUTCString();

	cxt.log(format, date, issue.server, issue.retries, issue.messages.join( '' ), 'warning');
}

setupMemcached.prototype.eventOnFailure = function (issue) {
	var format = "\033[1;35m[%s]\033[0m Connecting to memcached server %s failed. Message: %s.";
	var date = new Date().toUTCString();

	cxt.log(format, date, issue.server, issue.messages.join( '' ), 'error');
}

setupMemcached.prototype.eventOnReconnecting = function (issue) {
	var format = "\033[1;35m[%s]\033[0m Attempting to reconnect to memcached server %s. Message %s.";
	var date = new Date().toUTCString();

	cxt.log(format, date, issue.server, issue.messages.join( '' ), 'info');
}

setupMemcached.prototype.eventOnReconnected = function (issue) {
	var format = "\033[1;35m[%s]\033[0m Reconnected to memcached server %s. Message: %s.";
	var date = new Date().toUTCString();

	cxt.log(format, date, issue.server, issue.messages.join( '' ), 'info');
}

setupMemcached.prototype.eventOnRemove = function (issue) {
	var format = "\033[1;35m[%s]\033[0m Removing memcached server %s from use. Message: %s.";
	var date = new Date().toUTCString();

	cxt.log(format, date, issue.server, issue.messages.join( '' ), 'error');
}

