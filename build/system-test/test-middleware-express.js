"use strict";
/*!
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const delay_1 = require("delay");
const uuid = require("uuid");
const index_1 = require("../src/index");
const winston = require("winston");
const express_1 = require("../src/middleware/express");
const logging_1 = require("@google-cloud/logging");
const logging = new logging_1.Logging();
const WRITE_CONSISTENCY_DELAY_MS = 20 * 1000;
const TEST_TIMEOUT = WRITE_CONSISTENCY_DELAY_MS + 10 * 1000;
const LOG_NAME = `winston-system-test-${uuid.v4()}`;
mocha_1.describe(__filename, () => {
    mocha_1.describe('global logger', () => {
        mocha_1.it('should properly write log entries', async () => {
            const logger = winston.createLogger();
            await index_1.express.makeMiddleware(logger, {
                logName: LOG_NAME,
                level: 'info',
            });
            const LOG_MESSAGE = `unique log message ${uuid.v4()}`;
            logger.info(LOG_MESSAGE);
            await delay_1.default(WRITE_CONSISTENCY_DELAY_MS);
            const log = logging.log(LOG_NAME);
            const entries = (await log.getEntries({ pageSize: 1 }))[0];
            assert.strictEqual(entries.length, 1);
            assert.strictEqual(LOG_MESSAGE, entries[0].data.message);
        }).timeout(TEST_TIMEOUT);
    });
    mocha_1.describe('request logging middleware', () => {
        mocha_1.it('should write request correlated log entries', () => {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve) => {
                const logger = winston.createLogger();
                const mw = await index_1.express.makeMiddleware(logger, {
                    logName: LOG_NAME,
                    level: 'info',
                });
                const LOG_MESSAGE = `correlated log message ${uuid.v4()}`;
                const fakeRequest = {
                    headers: {
                        'user-agent': 'Mocha/test-case',
                    },
                    statusCode: 200,
                    originalUrl: '/foo/bar',
                    method: 'PUSH',
                };
                const fakeResponse = {
                    getHeader: (name) => {
                        return name === 'Content-Length'
                            ? 4104
                            : `header-value-for-${name}`;
                    },
                };
                const next = async () => {
                    // At this point fakeRequest.log should have been installed.
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fakeRequest.log.info(LOG_MESSAGE);
                    await delay_1.default(WRITE_CONSISTENCY_DELAY_MS);
                    const appLog = logging.log(LOG_NAME);
                    const appLogEntries = (await appLog.getEntries({ pageSize: 1 }))[0];
                    assert.strictEqual(appLogEntries.length, 1);
                    const [appLogEntry] = appLogEntries;
                    assert.strictEqual(LOG_MESSAGE, appLogEntry.data.message);
                    assert(appLogEntry.metadata.trace, 'should have a trace property');
                    assert(appLogEntry.metadata.trace.match(/projects\/.*\/traces\/.*/));
                    assert.strictEqual(appLogEntry.metadata.severity, 'INFO');
                    const requestLog = logging.log(`${LOG_NAME}${express_1.REQUEST_LOG_SUFFIX}`);
                    const requestLogEntries = (await requestLog.getEntries({
                        pageSize: 1,
                    }))[0];
                    assert.strictEqual(requestLogEntries.length, 1);
                    const [requestLogEntry] = requestLogEntries;
                    assert.strictEqual(requestLogEntry.metadata.trace, appLogEntry.metadata.trace);
                    resolve();
                };
                // Call middleware with mocks.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mw(fakeRequest, fakeResponse, next);
            });
        }).timeout(TEST_TIMEOUT);
    });
});
//# sourceMappingURL=test-middleware-express.js.map