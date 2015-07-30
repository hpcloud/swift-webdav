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
// HTTP handlers
exports.HandleOptions = require('./handleoptions');
exports.HandleGet = require('./handleget');
exports.HandlePut = require('./handleput');
exports.HandleHead= require('./handlehead');
exports.HandleDelete = require('./handledelete');
exports.HandlePropfind = require('./handlepropfind');
exports.HandleProppatch = require('./handleproppatch');
exports.HandleMkcol = require('./handlemkcol');
exports.HandleReport = require('./handlereport');
exports.HandleCopy = require('./handlecopy');
exports.HandleMove = require('./handlemove');
exports.HandleLock = require('./handlelock');
exports.HandleUnlock = require('./handleunlock');

// Utilities
exports.ValidateDestination = require('./validatedestination');
exports.MethodBasedRequestResolver = require('./methodbasedrequestresolver');
exports.GetNormalizedPath = require('./getnormalizedpath');
exports.StreamedHTTPResponse = require('./streamedhttpresponse');
exports.VerifyPreconditions = require('./verifypreconditions');
exports.BasicAuthentication = require('./basicauthentication');
exports.KeepConnectionAlive = require('./keepconnectionalive');
exports.PropfindMacHack = require('./propfindmachack');
