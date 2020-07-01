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
const assert = require("assert");
const mocha_1 = require("mocha");
const google_auth_library_1 = require("google-auth-library");
const TransportStream = require("winston-transport");
const winston = require("winston");
const proxyquire = require("proxyquire");
// types-only import. Actual require is done through proxyquire below.
const FAKE_PROJECT_ID = 'project-🦄';
const FAKE_GENERATED_MIDDLEWARE = () => { };
const FAKE_ENVIRONMENT = 'FAKE_ENVIRONMENT';
let authEnvironment;
let passedOptions;
let transport;
class FakeLoggingWinston extends TransportStream {
    constructor(options) {
        super(options);
        transport = this;
        passedOptions.push(options);
        this.common = {
            stackdriverLog: {
                logging: {
                    auth: {
                        async getProjectId() {
                            return FAKE_PROJECT_ID;
                        },
                        async getEnv() {
                            return authEnvironment;
                        },
                    },
                },
            },
        };
    }
    log(info, cb) {
        cb();
    }
}
let passedProjectId;
let passedEmitRequestLog;
function fakeMakeMiddleware(projectId, makeChildLogger, emitRequestLog) {
    passedProjectId = projectId;
    passedEmitRequestLog = emitRequestLog;
    return FAKE_GENERATED_MIDDLEWARE;
}
const { makeMiddleware } = proxyquire('../../src/middleware/express', {
    '../index': { LoggingWinston: FakeLoggingWinston },
    '@google-cloud/logging': {
        middleware: { express: { makeMiddleware: fakeMakeMiddleware } },
    },
});
mocha_1.describe('middleware/express', () => {
    let logger;
    mocha_1.beforeEach(() => {
        logger = winston.createLogger();
        transport = undefined;
        passedOptions = [];
        passedProjectId = undefined;
        passedEmitRequestLog = undefined;
        authEnvironment = FAKE_ENVIRONMENT;
    });
    mocha_1.it('should create and return a middleware', async () => {
        const mw = await makeMiddleware(logger);
        assert.strictEqual(mw, FAKE_GENERATED_MIDDLEWARE);
    });
    mocha_1.it('should not allocate a transport when passed', async () => {
        const t = new FakeLoggingWinston({});
        assert.strictEqual(transport, t);
        await makeMiddleware(logger, t);
        assert.strictEqual(transport, t, 'makeMiddleware should not construct a transport');
    });
    mocha_1.it('should add a transport to the logger when not provided', async () => {
        await makeMiddleware(logger);
        assert.strictEqual(logger.transports.length, 1);
        assert.strictEqual(logger.transports[0], transport);
    });
    mocha_1.it('should create a transport with the correct logName', async () => {
        await makeMiddleware(logger);
        assert.ok(passedOptions);
        assert.strictEqual(passedOptions.length, 1);
        const [options] = passedOptions;
        assert.strictEqual(options.logName, 'winston_log');
    });
    mocha_1.it('should acquire the projectId and pass to makeMiddleware', async () => {
        await makeMiddleware(logger);
        assert.strictEqual(passedProjectId, FAKE_PROJECT_ID);
    });
    [google_auth_library_1.GCPEnv.APP_ENGINE, google_auth_library_1.GCPEnv.CLOUD_FUNCTIONS].forEach(env => {
        mocha_1.it(`should not generate the request logger on ${env}`, async () => {
            authEnvironment = env;
            await makeMiddleware(logger);
            assert.ok(passedOptions);
            assert.strictEqual(passedOptions.length, 1);
            // emitRequestLog parameter to makeChildLogger should be undefined.
            assert.strictEqual(passedEmitRequestLog, undefined);
        });
    });
});
//# sourceMappingURL=express.js.map