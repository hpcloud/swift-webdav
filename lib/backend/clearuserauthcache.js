var pronto = require('pronto');
var Buffer = require('buffer').Buffer;
var util = require('../http/util');

/**
 * This command clears the user auth cache (against memcache) for cached auth
 * information.
 *
 * Params:
 * - endpoint: URL to the IdentityServices endpoint. (REQUIRED)
 * - projectId: The project (tenant) ID. (OPTIONAL)
 */

function ClearUserAuthCache(){}
pronto.inheritsCommand(ClearUserAuthCache);
module.exports = ClearUserAuthCache;

ClearUserAuthCache.prototype.execute = function(cxt, params) {

	var memcached = cxt.getDatasource('memcached');
	var req = cxt.getDatasource('request');
	var endpoint = params.endpoint || '';

	if (req.headers.authorization) {
		var user = util.userFromAuthString(req.headers.authorization);
		if (user) {
			var cacheId = new Buffer(user.name + user.pass + endpoint + params.projectId, 'utf8').toString('base64');

			memcached.delete(cacheId, function(err, result) {

				if (err) {
	        // In case of an error we log it. Log all the things!
	        var date = new Date().toUTCString();
	        cxt.log("\033[1;35m[%s]\033[0m Error deleting %s from memcached. Message: %s", date, cacheId, err, "error");
	      }
	      else {
	      	cxt.log("Removed cacheId: %s", cacheId, "debug");
	      }
			});
		}
	}

}