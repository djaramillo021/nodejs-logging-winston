"use strict";
/*!
 * Copyright 2016 Google Inc. All Rights Reserved.
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
const uuid = require("uuid");
const errors_transport_1 = require("./errors-transport");
const proxyquire = require("proxyquire");
const winston = require("winston");
const logging_1 = require("@google-cloud/logging");
const logging = new logging_1.Logging();
const WRITE_CONSISTENCY_DELAY_MS = 90000;
const UUID = uuid.v4();
function logName(name) {
    return `${UUID}_${name}`;
}
mocha_1.describe('LoggingWinston', function () {
    this.timeout(WRITE_CONSISTENCY_DELAY_MS);
    const testTimestamp = new Date();
    // type TestData
    const commonTestData = [
        {
            args: ['first'],
            level: 'info',
            verify: (entry) => {
                assert.deepStrictEqual(entry.data, {
                    message: 'first',
                    metadata: {},
                });
            },
        },
        {
            args: ['second'],
            level: 'info',
            verify: (entry) => {
                assert.deepStrictEqual(entry.data, {
                    message: 'second',
                    metadata: {},
                });
            },
        },
        {
            args: ['third', { testTimestamp }],
            level: 'info',
            verify: (entry) => {
                assert.deepStrictEqual(entry.data, {
                    message: 'third',
                    metadata: {
                        testTimestamp: String(testTimestamp),
                    },
                });
            },
        },
    ];
    mocha_1.describe('log', () => {
        const LoggingWinston = proxyquire('../src/index', { winston }).LoggingWinston;
        mocha_1.it.skip('should properly write log entries', async () => {
            const testData = commonTestData.concat([
                {
                    args: [new Error('fourth')],
                    level: 'error',
                    verify: (entry) => {
                        assert(entry.data.message.startsWith('fourth Error:'));
                    },
                },
                {
                    args: [
                        {
                            level: 'error',
                            message: 'fifth message',
                            error: new Error('fifth'),
                        },
                    ],
                    level: 'log',
                    verify: (entry) => {
                        assert(entry.data.message.startsWith('fifth message'));
                    },
                },
            ]);
            const LOG_NAME = logName('logging_winston_system_tests_1');
            const logger = winston.createLogger({
                transports: [new LoggingWinston({ logName: LOG_NAME })],
            });
            const start = Date.now();
            testData.forEach(test => {
                // logger does not have index signature.
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                logger[test.level].apply(logger, test.args);
            });
            const entries = await pollLogs(LOG_NAME, start, testData.length, WRITE_CONSISTENCY_DELAY_MS);
            assert.strictEqual(entries.length, testData.length);
            entries.reverse().forEach((entry, index) => {
                const test = testData[index];
                test.verify(entry);
            });
        });
        mocha_1.it('should work correctly with winston formats', async () => {
            const MESSAGE = 'A message that should be padded';
            const start = Date.now();
            const LOG_NAME = logName('logging_winston_system_tests_2');
            const logger = winston.createLogger({
                transports: [new LoggingWinston({ logName: LOG_NAME })],
                format: winston.format.combine(winston.format.colorize(), winston.format.padLevels()),
            });
            logger.error(MESSAGE);
            const [entry] = await pollLogs(LOG_NAME, start, 1, WRITE_CONSISTENCY_DELAY_MS);
            const data = entry.data;
            assert.strictEqual(data.message, `   ${MESSAGE}`);
        });
    });
    mocha_1.describe('ErrorReporting', () => {
        const LOG_NAME = logName('logging_winston_error_reporting_system_tests');
        const ERROR_REPORTING_POLL_TIMEOUT = WRITE_CONSISTENCY_DELAY_MS;
        const errorsTransport = new errors_transport_1.ErrorsApiTransport();
        mocha_1.it('reports errors', async () => {
            const start = Date.now();
            const service = `logging-winston-system-test-winston3-${UUID}`;
            const LoggingWinston = proxyquire('../src/index', { winston })
                .LoggingWinston;
            const logger = winston.createLogger({
                transports: [
                    new LoggingWinston({
                        logName: LOG_NAME,
                        serviceContext: { service, version: 'none' },
                    }),
                ],
            });
            const message = `an error at ${Date.now()}`;
            logger.error(new Error(message));
            const errors = await errorsTransport.pollForNewEvents(service, start, ERROR_REPORTING_POLL_TIMEOUT);
            assert.strictEqual(errors.length, 1);
            const errEvent = errors[0];
            assert.strictEqual(errEvent.serviceContext.service, service);
            assert(errEvent.message.startsWith(message));
        });
    });
});
// polls for the entire array of entries to be greater than logTime.
function pollLogs(logName, logTime, size, timeout) {
    const p = new Promise((resolve, reject) => {
        const end = Date.now() + timeout;
        loop();
        function loop() {
            setTimeout(() => {
                logging.log(logName).getEntries({
                    pageSize: size,
                }, (err, entries) => {
                    if (!entries || entries.length < size)
                        return loop();
                    const { receiveTimestamp } = (entries[entries.length - 1].metadata ||
                        {});
                    const timeMilliseconds = receiveTimestamp.seconds * 1000 + receiveTimestamp.nanos * 1e-6;
                    if (timeMilliseconds >= logTime) {
                        return resolve(entries);
                    }
                    if (Date.now() > end) {
                        return reject(new Error('timeout'));
                    }
                    loop();
                });
            }, 500);
        }
    });
    return p;
}
//# sourceMappingURL=logging-winston.js.map