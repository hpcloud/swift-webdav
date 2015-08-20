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
var posix = require('posix');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Syslogger;

function Syslogger(logger, options) {
  options = options || {};
  var facility = options.facility || "local7";
  var f = options.priorities || ["warning", "error", "fatal", "info", "debug", "access", "custom"];

  // Open the syslog, but defer the actual connection until the first
  // message is written.
  posix.openlog("swift-webdav", {odelay: true, pid: true}, facility);


  // Add an event listener for each facility.
  for (var i = 0; i < f.length; ++i) {
    logger.on(f[i], function (level, msg) {
      Syslogger.write(options, level, msg);
    });
  }

}

Syslogger.write = function (options, level, msg) {
  switch (level) {
    // Eponymous
    case "warning":
    case "info":
    case "debug":
      posix.syslog(level, msg);
      break;


    // Directly correlated
    case "fatal":
      posix.syslog("alert", msg);
      break;
    case "error":
      posix.syslog("err", msg);
      break;


    // No good fit.
    case "access":
    case "custom":
    default:
      posix.syslog("info", msg);
      break;

  }
}
