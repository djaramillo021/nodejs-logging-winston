"use strict";
// Copyright 2016 Google LLC
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
const TransportStream = require("winston-transport");
const proxyquire = require("proxyquire");
mocha_1.describe('logging-winston', () => {
    let fakeLoggingOptions_;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lastFakeLoggingArgs = [];
    class FakeLogging {
        constructor(options) {
            fakeLoggingOptions_ = options;
        }
        log(level, message, metadata, callback) {
            // eslint-disable-next-line prefer-rest-params
            lastFakeLoggingArgs = arguments;
            if (callback)
                setImmediate(callback);
        }
    }
    class FakeTransport {
        constructor() {
            // eslint-disable-next-line prefer-rest-params
            this.transportCalledWith_ = arguments;
        }
    }
    const fakeWinston = {
        transports: {},
        Transport: FakeTransport,
    };
    const loggingWinstonLib = proxyquire('../src/index', {
        './common': { LoggingCommon: FakeLogging },
        winston: fakeWinston,
    });
    // loggingWinston is LoggingWinston namespace which cannot be determined type.
    // eslint-disable-next-line
    let loggingWinston;
    const OPTIONS = {
        logName: 'log-name',
        levels: {
            one: 1,
        },
        resource: {},
        serviceContext: {
            service: 'fake-service',
        },
        apiEndpoint: 'fake.local',
    };
    mocha_1.beforeEach(() => {
        fakeLoggingOptions_ = null;
        loggingWinston = new loggingWinstonLib.LoggingWinston(OPTIONS);
    });
    mocha_1.describe('instantiation/options', () => {
        mocha_1.it('should inherit from winston-transport.TransportStream', () => {
            const loggingWinston = new loggingWinstonLib.LoggingWinston(OPTIONS);
            assert.ok(loggingWinston instanceof TransportStream);
        });
        mocha_1.it('should initialize Log instance using provided scopes', () => {
            const fakeScope = 'fake scope';
            const optionsWithScopes = Object.assign({}, OPTIONS);
            optionsWithScopes.scopes = fakeScope;
            // tslint:disable-next-line:no-unused-expression
            new loggingWinstonLib.LoggingWinston(optionsWithScopes);
            assert.deepStrictEqual(fakeLoggingOptions_, optionsWithScopes);
        });
        mocha_1.it('should initialize Log instance using provided apiEndpoint', () => {
            const options = Object.assign({}, OPTIONS);
            new loggingWinstonLib.LoggingWinston(options);
            assert.deepStrictEqual(fakeLoggingOptions_, options);
        });
        mocha_1.it('should pass the provided options.inspectMetadata', () => {
            const optionsWithInspectMetadata = Object.assign({}, OPTIONS, {
                inspectMetadata: true,
            });
            // tslint:disable-next-line:no-unused-expression
            new loggingWinstonLib.LoggingWinston(optionsWithInspectMetadata);
            assert.strictEqual(fakeLoggingOptions_.inspectMetadata, true);
        });
        mocha_1.it('should pass provided levels', () => {
            assert.strictEqual(fakeLoggingOptions_.levels, OPTIONS.levels);
        });
        mocha_1.it('should pass Log instance using provided name', () => {
            const logName = 'log-name-override';
            const optionsWithLogName = Object.assign({}, OPTIONS);
            optionsWithLogName.logName = logName;
            // tslint:disable-next-line:no-unused-expression
            new loggingWinstonLib.LoggingWinston(optionsWithLogName);
            assert.strictEqual(fakeLoggingOptions_.logName, logName);
        });
        mocha_1.it('should pass the provided resource', () => {
            assert.strictEqual(fakeLoggingOptions_.resource, OPTIONS.resource);
        });
        mocha_1.it('should pass the provided service context', () => {
            assert.strictEqual(fakeLoggingOptions_.serviceContext, OPTIONS.serviceContext);
        });
    });
    mocha_1.describe('log', () => {
        const LEVEL = Object.keys(OPTIONS.levels)[0];
        const MESSAGE = 'message';
        const METADATA = { a: 1 };
        const loggingWinston = new loggingWinstonLib.LoggingWinston();
        mocha_1.beforeEach(() => {
            lastFakeLoggingArgs = [];
        });
        mocha_1.it('should properly call common.log', done => {
            const args = Object.assign({}, METADATA, {
                level: LEVEL,
                message: MESSAGE,
            });
            loggingWinston.log(args);
            const [level, message, meta] = lastFakeLoggingArgs;
            assert.strictEqual(level, 'one');
            assert.strictEqual(message, 'message');
            assert.deepStrictEqual(meta, { a: 1 });
            done();
        });
        mocha_1.it('should prefer Symbol for level', () => {
            const info = {
                ...METADATA,
                message: MESSAGE,
                level: `\u001b[34m${LEVEL}\u001b[39m`,
                [Symbol.for('level')]: LEVEL,
            };
            loggingWinston.log(info);
            const [level, message, meta] = lastFakeLoggingArgs;
            assert.strictEqual(level, 'one');
            assert.strictEqual(message, 'message');
            assert.deepStrictEqual(meta, { a: 1, [Symbol.for('level')]: LEVEL });
        });
    });
});
//# sourceMappingURL=index.js.map