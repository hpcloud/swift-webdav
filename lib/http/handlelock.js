var pronto = require('pronto');
/**
 * Handle WebDAV LOCK requests.
 */
function HandleLock() {}
pronto.inheritsCommand(HandleLock);
module.exports = HandleLock;

HandleLock.prototype.execute = function (cxt, params) {
}

HandleLock.prototype.refreshLock = function () {
}

HandleLock.prototype.createLock = function () {
}
