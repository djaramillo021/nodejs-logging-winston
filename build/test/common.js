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
const nodeutil = require("util");
const proxyquire = require("proxyquire");
mocha_1.describe('logging-common', () => {
    let fakeLogInstance;
    let fakeLoggingOptions_;
    let fakeLogName_;
    let fakeLogOptions_;
    function fakeLogging(options) {
        fakeLoggingOptions_ = options;
        return {
            log: (logName, logOptions) => {
                fakeLogName_ = logName;
                fakeLogOptions_ = logOptions;
                return fakeLogInstance;
            },
        };
    }
    class FakeTransport {
        constructor(...args) {
            this.transportCalledWith_ = args;
        }
    }
    const fakeWinston = {
        transports: {},
        Transport: FakeTransport,
    };
    const loggingCommonLib = proxyquire('../src/common', {
        '@google-cloud/logging': {
            Logging: fakeLogging,
        },
        winston: fakeWinston,
    });
    // loggingCommon is loggingCommon namespace which cannot be determined type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let loggingCommon;
    const OPTIONS = {
        logName: 'log-name',
        levels: {
            one: 1,
        },
        resource: {},
        serviceContext: {
            service: 'fake-service',
        },
    };
    mocha_1.beforeEach(() => {
        fakeLogInstance = {};
        fakeLoggingOptions_ = null;
        fakeLogName_ = null;
        loggingCommon = new loggingCommonLib.LoggingCommon(OPTIONS);
    });
    mocha_1.describe('instantiation', () => {
        mocha_1.it('should default to logging.write scope', () => {
            assert.deepStrictEqual(fakeLoggingOptions_.scopes, [
                'https://www.googleapis.com/auth/logging.write',
            ]);
        });
        mocha_1.it('should initialize Log instance using provided scopes', () => {
            const fakeScope = 'fake scope';
            const optionsWithScopes = Object.assign({}, OPTIONS);
            optionsWithScopes.scopes = fakeScope;
            new loggingCommonLib.LoggingCommon(optionsWithScopes);
            assert.deepStrictEqual(fakeLoggingOptions_, optionsWithScopes);
        });
        mocha_1.it('should localize inspectMetadata to default value', () => {
            assert.strictEqual(loggingCommon.inspectMetadata, false);
        });
        mocha_1.it('should localize the provided options.inspectMetadata', () => {
            const optionsWithInspectMetadata = Object.assign({}, OPTIONS, {
                inspectMetadata: true,
            });
            const loggingCommon = new loggingCommonLib.LoggingCommon(optionsWithInspectMetadata);
            assert.strictEqual(loggingCommon.inspectMetadata, true);
        });
        mocha_1.it('should localize provided levels', () => {
            assert.strictEqual(loggingCommon.levels, OPTIONS.levels);
        });
        mocha_1.it('should default to npm levels', () => {
            const optionsWithoutLevels = Object.assign({}, OPTIONS);
            delete optionsWithoutLevels.levels;
            const loggingCommon = new loggingCommonLib.LoggingCommon(optionsWithoutLevels);
            assert.deepStrictEqual(loggingCommon.levels, {
                error: 3,
                warn: 4,
                info: 6,
                verbose: 7,
                debug: 7,
                silly: 7,
            });
        });
        mocha_1.it('should localize Log instance using default name', () => {
            const logName = 'log-name-override';
            const optionsWithLogName = Object.assign({}, OPTIONS);
            optionsWithLogName.logName = logName;
            const loggingCommon = new loggingCommonLib.LoggingCommon(optionsWithLogName);
            const loggingOptions = Object.assign({}, fakeLoggingOptions_);
            delete loggingOptions.scopes;
            assert.deepStrictEqual(loggingOptions, optionsWithLogName);
            assert.strictEqual(fakeLogName_, logName);
            assert.strictEqual(loggingCommon.logName, logName);
        });
        mocha_1.it('should set removeCircular to true', () => {
            new loggingCommonLib.LoggingCommon(OPTIONS);
            assert.deepStrictEqual(fakeLogOptions_, {
                removeCircular: true,
                maxEntrySize: 250000,
            });
        });
        mocha_1.it('should localize the provided resource', () => {
            assert.strictEqual(loggingCommon.resource, OPTIONS.resource);
        });
        mocha_1.it('should localize the provided service context', () => {
            assert.strictEqual(loggingCommon.serviceContext, OPTIONS.serviceContext);
        });
    });
    mocha_1.describe('log', () => {
        const LEVEL = Object.keys(OPTIONS.levels)[0];
        const STACKDRIVER_LEVEL = 'alert'; // (code 1)
        const MESSAGE = 'message';
        const METADATA = {
            value: () => { },
        };
        mocha_1.beforeEach(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fakeLogInstance.entry = (() => { });
            loggingCommon.stackdriverLog.emergency = () => { };
            loggingCommon.stackdriverLog[STACKDRIVER_LEVEL] = () => { };
        });
        mocha_1.it('should throw on a bad log level', () => {
            assert.throws(() => {
                loggingCommon.log('non-existent-level', MESSAGE, METADATA, assert.ifError);
            }, /Unknown log level: non-existent-level/);
        });
        mocha_1.it('should not throw on `0` log level', () => {
            const options = Object.assign({}, OPTIONS, {
                levels: {
                    zero: 0,
                },
            });
            loggingCommon = new loggingCommonLib.LoggingCommon(options);
            loggingCommon.log('zero', 'test message');
        });
        mocha_1.it('should properly create an entry', done => {
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
        });
        mocha_1.it('should append stack when metadata is an error', done => {
            const error = {
                stack: 'the stack',
            };
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(data, {
                    message: MESSAGE + ' ' + error.stack,
                    metadata: error,
                    serviceContext: OPTIONS.serviceContext,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, error, assert.ifError);
        });
        mocha_1.it('should use stack when metadata is err without message', done => {
            const error = {
                stack: 'the stack',
            };
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(data, {
                    message: error.stack,
                    metadata: error,
                    serviceContext: OPTIONS.serviceContext,
                });
                done();
            };
            loggingCommon.log(LEVEL, '', error, assert.ifError);
        });
        mocha_1.it('should inspect metadata when inspectMetadata is set', done => {
            loggingCommon.inspectMetadata = true;
            loggingCommon.stackdriverLog.entry = (_, data) => {
                const expectedWinstonMetadata = {};
                for (const prop of Object.keys(METADATA)) {
                    // metadata does not have index signature.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    expectedWinstonMetadata[prop] =
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        nodeutil.inspect(METADATA[prop]);
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                assert.deepStrictEqual(data.metadata, expectedWinstonMetadata);
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
        });
        mocha_1.it('should promote httpRequest property to metadata', done => {
            const HTTP_REQUEST = {
                statusCode: 418,
            };
            const metadataWithRequest = Object.assign({
                httpRequest: HTTP_REQUEST,
            }, METADATA);
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                    httpRequest: HTTP_REQUEST,
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, metadataWithRequest, assert.ifError);
        });
        mocha_1.it('should promote timestamp property to metadata', done => {
            const date = new Date();
            const metadataWithRequest = Object.assign({
                timestamp: date,
            }, METADATA);
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                    timestamp: date,
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, metadataWithRequest, assert.ifError);
        });
        mocha_1.it('should promote labels from metadata to log entry', done => {
            const LABELS = { labelKey: 'labelValue' };
            const metadataWithLabels = Object.assign({ labels: LABELS }, METADATA);
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                    labels: LABELS,
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, metadataWithLabels, assert.ifError);
        });
        mocha_1.it('should promote prefixed trace property to metadata', done => {
            const metadataWithTrace = Object.assign({}, METADATA);
            const loggingTraceKey = loggingCommonLib.LOGGING_TRACE_KEY;
            // metadataWithTrace does not have index signature.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadataWithTrace[loggingTraceKey] = 'trace1';
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                    trace: 'trace1',
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, metadataWithTrace, assert.ifError);
        });
        mocha_1.it('should set trace metadata from agent if available', done => {
            const oldTraceAgent = global._google_trace_agent;
            global._google_trace_agent = {
                getCurrentContextId: () => {
                    return 'trace1';
                },
                getWriterProjectId: () => {
                    return 'project1';
                },
            };
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                    trace: 'projects/project1/traces/trace1',
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
                done();
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
            global._google_trace_agent = oldTraceAgent;
        });
        mocha_1.it('should leave out trace metadata if trace unavailable', () => {
            loggingCommon.stackdriverLog.entry = (entryMetadata, data) => {
                assert.deepStrictEqual(entryMetadata, {
                    resource: loggingCommon.resource,
                });
                assert.deepStrictEqual(data, {
                    message: MESSAGE,
                    metadata: METADATA,
                });
            };
            const oldTraceAgent = global._google_trace_agent;
            global._google_trace_agent = {};
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
            global._google_trace_agent = {
                getCurrentContextId: () => {
                    return null;
                },
                getWriterProjectId: () => {
                    return null;
                },
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
            global._google_trace_agent = {
                getCurrentContextId: () => {
                    return null;
                },
                getWriterProjectId: () => {
                    return 'project1';
                },
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
            global._google_trace_agent = {
                getCurrentContextId: () => {
                    return 'trace1';
                },
                getWriterProjectId: () => {
                    return null;
                },
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
            global._google_trace_agent = oldTraceAgent;
        });
        mocha_1.it('should write to the log', done => {
            const entry = {};
            loggingCommon.stackdriverLog.entry = () => {
                return entry;
            };
            loggingCommon.stackdriverLog[STACKDRIVER_LEVEL] = (entry_, callback) => {
                assert.strictEqual(entry_, entry);
                callback(); // done()
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, done);
        });
    });
    mocha_1.describe('label and labels', () => {
        const LEVEL = Object.keys(OPTIONS.levels)[0];
        const MESSAGE = 'message';
        const PREFIX = 'prefix';
        const LABELS = { label1: 'value1' };
        const METADATA = { value: () => { }, labels: { label2: 'value2' } };
        mocha_1.beforeEach(() => {
            const opts = Object.assign({}, OPTIONS, {
                prefix: PREFIX,
                labels: LABELS,
            });
            loggingCommon = new loggingCommonLib.LoggingCommon(opts);
        });
        mocha_1.it('should properly create an entry with labels and [prefix] message', done => {
            loggingCommon.stackdriverLog.entry = (entryMetadata1, data1) => {
                assert.deepStrictEqual(entryMetadata1, {
                    resource: loggingCommon.resource,
                    // labels should have been merged.
                    labels: {
                        label1: 'value1',
                        label2: 'value2',
                    },
                });
                assert.deepStrictEqual(data1, {
                    message: `[${PREFIX}] ${MESSAGE}`,
                    metadata: METADATA,
                });
                const metadataWithoutLabels = Object.assign({}, METADATA);
                delete metadataWithoutLabels.labels;
                loggingCommon.stackdriverLog.entry = (entryMetadata2, data2) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    console.log(entryMetadata2.labels);
                    assert.deepStrictEqual(entryMetadata2, {
                        resource: loggingCommon.resource,
                        labels: { label1: 'value1' },
                    });
                    assert.deepStrictEqual(data2, {
                        message: `[${PREFIX}] ${MESSAGE}`,
                        metadata: METADATA,
                    });
                    done();
                };
                loggingCommon.log(LEVEL, MESSAGE, metadataWithoutLabels, assert.ifError);
            };
            loggingCommon.log(LEVEL, MESSAGE, METADATA, assert.ifError);
        });
    });
});
//# sourceMappingURL=common.js.map