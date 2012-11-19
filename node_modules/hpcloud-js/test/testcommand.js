/**
 * Unit test support.
 */

var pronto = require('pronto');
module.exports = TestCommand;
function TestCommand(){}
pronto.inheritsCommand(TestCommand);

/**
 * Execute a single test.
 *
 * Usage:
 *
 * runner.doCommand(TestCommand, 'myTest').using('fn', function(context, params, testStatus) {
 *   assert.ok(true);
 *   testStatus.passed('It passed!')
 *
 *   // Or...
 *   testStatus.failed('Bummer.');
 * });
 *
 * Note that passing merely indicates that the next text should run. It doesn't suggest that
 * all of the assertions you wrote have passed.
 *
 * Failure causes the test chain to stop.
 */
TestCommand.prototype.execute = function(context, params) {
  var format = {
    // Yellow
    status: '\033[00;33m%s\033[0m',
    // Red
    error: '\033[00;31m%s\033[0m',
    // Green
    ok: '\033[00;32m%s\033[0m',
    missed: '\033[00;36m%s\033[0m'
  };

  this.required(params, ['fn']);
  console.log(format.status, '==> Running ' + this.name);

  var fn = params.fn;
  var cmd = this;

  var result = {
      passed: function (msg) {
        var message = msg || '';
        console.log(format.ok, '<== Completed test ' + cmd.name + '. ' + message);
        cmd.done();
      },
      failed: function(msg) {
        var message = msg || '';
        console.log(format.error, '<<< FAILED test ' + cmd.name + '. ' + message);
        cmd.stop();
      },
      skipped: function(msg) {
        var message = msg || '';
        console.log(format.missed, '<<< SKIPPED test ' + cmd.name + '. ' + message);
        cmd.done();
      }

  }

  fn(context, params, result);
}
