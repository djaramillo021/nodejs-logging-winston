"use strict";
// Copyright 2019 Google LLC
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
const proxyquire = require("proxyquire");
const winston = require("winston");
/**
 * Tests that ensure that getDefaultMetadataForTracing can be used for
 * trace-log correlation when Stackdriver Trace Agent is present. See
 * src/default-metadata.ts for an explanation on why this to exist.
 */
mocha_1.describe('Stackdriver Trace Log Correlation', () => {
    // Trace context IDs seen in logs so far in a test.
    const seenContextIds = [];
    // Set a trace context ID for all succeeding Winston logs.
    let setCurrentContextId;
    // The Stackdriver Logging Winston transport library.
    let loggingWinstonLib;
    class FakeLogging {
        constructor() { }
        log(data, callback) {
            if (typeof callback === 'function')
                setImmediate(callback);
            return this;
        }
        // Stub entry to record the incoming trace context ID.
        entry(metadata) {
            if (metadata.trace) {
                const traceId = metadata.trace.split('/')[3];
                assert.ok(traceId);
                seenContextIds.push(traceId);
            }
            else {
                seenContextIds.push('');
            }
            return {};
        }
        info(data, callback) {
            return this.log(data, callback);
        }
    }
    mocha_1.before(() => {
        loggingWinstonLib = proxyquire('../src/index', {
            '@google-cloud/logging': { '@global': true, Logging: FakeLogging },
        });
    });
    mocha_1.beforeEach(() => {
        seenContextIds.length = 0;
        setCurrentContextId = (() => {
            let currentContextId;
            global._google_trace_agent = {
                getCurrentContextId: () => {
                    return currentContextId;
                },
                getWriterProjectId: () => {
                    return 'project1';
                },
            };
            return (id) => {
                currentContextId = id;
            };
        })();
    });
    mocha_1.after(() => {
        delete global._google_trace_agent;
    });
    mocha_1.it('Works when using supporting default metadata', done => {
        const transport = new loggingWinstonLib.LoggingWinston();
        const logger = winston.createLogger({
            transports: [transport],
            defaultMeta: loggingWinstonLib.getDefaultMetadataForTracing(),
        });
        setCurrentContextId('1');
        logger.log({ level: 'info', message: 'hello' });
        setCurrentContextId('2');
        logger.log({ level: 'info', message: 'hello' });
        setCurrentContextId('3');
        setImmediate(() => {
            assert.strictEqual(seenContextIds.length, 2);
            assert.deepStrictEqual(seenContextIds, ['1', '2']);
            done();
        });
    });
    /**
     * This test is just like the previous one, but without using
     * getDefaultMetadataForTracing. The expected seen context IDs are ['1', '3'],
     * which are wrong.
     * If this test ever fails, that signals that getDefaultMetadataForTracing
     * may no longer be a necessary API, as Winston 3 has fixed its context
     * propagation issue.
     */
    mocha_1.it('Does not work without using supporting default metadata', done => {
        const transport = new loggingWinstonLib.LoggingWinston();
        const logger = winston.createLogger({
            transports: [transport],
        });
        setCurrentContextId('1');
        logger.log({ level: 'info', message: 'hello' });
        setCurrentContextId('2');
        logger.log({ level: 'info', message: 'hello' });
        setCurrentContextId('3');
        setImmediate(() => {
            assert.strictEqual(seenContextIds.length, 2);
            assert.throws(() => {
                assert.deepStrictEqual(seenContextIds, ['1', '2']);
            });
            done();
        });
    });
    [null, {}, { getWriterProjectId: () => 'project1' }].forEach(testCase => {
        mocha_1.it(`Doesn't crash when a non-compatible Trace Agent is present: ${testCase}`, done => {
            global._google_trace_agent = testCase;
            const transport = new loggingWinstonLib.LoggingWinston();
            const logger = winston.createLogger({
                transports: [transport],
                defaultMeta: loggingWinstonLib.getDefaultMetadataForTracing(),
            });
            setCurrentContextId('1');
            logger.log({ level: 'info', message: 'hello' });
            setCurrentContextId('2');
            logger.log({ level: 'info', message: 'hello' });
            setCurrentContextId('3');
            setImmediate(() => {
                assert.strictEqual(seenContextIds.length, 2);
                done();
            });
        });
    });
    [
        {
            getCurrentContextId: () => 'trace1',
            getWriterProjectId: () => null,
        },
        {
            getCurrentContextId: () => null,
            getWriterProjectId: () => 'project1',
        },
    ].forEach(testCase => {
        mocha_1.it(`Doesn't crash when a Trace Agent field is not present: ${testCase}`, done => {
            global._google_trace_agent = testCase;
            const transport = new loggingWinstonLib.LoggingWinston();
            const logger = winston.createLogger({
                transports: [transport],
                defaultMeta: loggingWinstonLib.getDefaultMetadataForTracing(),
            });
            setCurrentContextId('1');
            logger.log({ level: 'info', message: 'hello' });
            setCurrentContextId('2');
            logger.log({ level: 'info', message: 'hello' });
            setCurrentContextId('3');
            setImmediate(() => {
                assert.strictEqual(seenContextIds.length, 2);
                done();
            });
        });
    });
});
//# sourceMappingURL=stackdriver-trace-integration.js.map