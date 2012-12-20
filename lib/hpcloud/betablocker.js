var pronto = require('pronto');

function BetaBlocker(){}
pronto.inheritsCommand(BetaBlocker);
module.exports = BetaBlocker;

BetaBlocker.prototype.execute = function (cxt, params) {
  this.required(params, ['identity']);
  var grant = params.grant;
  var identity = params.identity;
  var name = identity.user().name;

  cxt.log("Checking for beta user %s", name, "debug");

  // If there is no list, or if the user is on the list, let the user
  // pass.
  if (!grant || grant[name]) {
    cxt.log("Granted to %s.", name, "debug")
    this.done();
    return;
  }

  // 403: Permission denied.
  cxt.log("User %s is not on the GRANT list.", name, "info");
  this.reroute('@403', cxt);
}
