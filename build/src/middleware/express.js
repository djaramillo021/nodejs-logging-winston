"use strict";
// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
const logging_1 = require("@google-cloud/logging");
const google_auth_library_1 = require("google-auth-library");
const common_1 = require("../common");
const index_1 = require("../index");
const make_child_logger_1 = require("./make-child-logger");
exports.REQUEST_LOG_SUFFIX = '_reqlog';
async function makeMiddleware(logger, optionsOrTransport) {
    let transport;
    // If a transport was not provided, instantiate one.
    if (!(optionsOrTransport instanceof index_1.LoggingWinston)) {
        const options = { logName: 'winston_log', ...optionsOrTransport };
        transport = new index_1.LoggingWinston(options);
        logger.add(transport);
    }
    else {
        transport = optionsOrTransport;
    }
    const auth = transport.common.stackdriverLog.logging.auth;
    const [env, projectId] = await Promise.all([
        auth.getEnv(),
        auth.getProjectId(),
    ]);
    // Unless we are running on Google App Engine or Cloud Functions, generate a
    // parent request log entry that all the request specific logs ("app logs")
    // will nest under. GAE and GCF generate the parent request logs
    // automatically.
    let emitRequestLogEntry;
    if (env !== google_auth_library_1.GCPEnv.APP_ENGINE && env !== google_auth_library_1.GCPEnv.CLOUD_FUNCTIONS) {
        const requestLogName = logging_1.Log.formatName_(projectId, `${transport.common.logName}${exports.REQUEST_LOG_SUFFIX}`);
        emitRequestLogEntry = (httpRequest, trace) => {
            logger.info({
                // The request logs must have a log name distinct from the app logs
                // for log correlation to work.
                logName: requestLogName,
                [common_1.LOGGING_TRACE_KEY]: trace,
                httpRequest,
                message: httpRequest.requestUrl || 'http request',
            });
        };
    }
    return logging_1.middleware.express.makeMiddleware(projectId, (trace) => make_child_logger_1.makeChildLogger(logger, trace), emitRequestLogEntry);
}
exports.makeMiddleware = makeMiddleware;
//# sourceMappingURL=express.js.map