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
const winston = require("winston");
const common_1 = require("../../src/common");
const make_child_logger_1 = require("../../src/middleware/make-child-logger");
mocha_1.describe('makeChildLogger', () => {
    const FAKE_TRACE = '🤥';
    const LOGGER = winston.createLogger({
        transports: [new winston.transports.Console({ silent: true })],
    });
    const origWrite = LOGGER.write;
    mocha_1.afterEach(() => {
        LOGGER.write = origWrite;
    });
    mocha_1.it('should return a winston-like logger', () => {
        const child = make_child_logger_1.makeChildLogger(LOGGER, FAKE_TRACE);
        let logEntry;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        LOGGER.write = (logEntry_) => {
            logEntry = logEntry_;
        };
        child.info('hello');
        assert.strictEqual(logEntry.message, 'hello');
        assert.strictEqual(logEntry.level, 'info');
        child.error('👾', { key: '🎃' });
        assert.strictEqual(logEntry.message, '👾');
        assert.strictEqual(logEntry.level, 'error');
        assert.strictEqual(logEntry.key, '🎃');
        child.warn('hello %d', 56, { key: 'value' });
        assert.strictEqual(logEntry.message, 'hello %d');
        assert.strictEqual(logEntry.level, 'warn');
        assert.strictEqual(logEntry.key, undefined);
        child.log('silly', '🎈');
        assert.strictEqual(logEntry.message, '🎈');
        assert.strictEqual(logEntry.level, 'silly');
    });
    mocha_1.it('should override only the write function', () => {
        const child = make_child_logger_1.makeChildLogger(LOGGER, FAKE_TRACE);
        assert.strictEqual(child.warn, LOGGER.warn);
        assert.notStrictEqual(child.write, LOGGER.write);
    });
    mocha_1.it('should inject the LOGGING_TRACE_KEY into the metadata', () => {
        const child = make_child_logger_1.makeChildLogger(LOGGER, FAKE_TRACE);
        let trace;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        LOGGER.write = (info) => {
            trace = info[common_1.LOGGING_TRACE_KEY];
        };
        child.debug('hello world');
        assert.strictEqual(trace, FAKE_TRACE);
    });
    mocha_1.it('should not overwrite existing LOGGING_TRACE_KEY value', () => {
        const child = make_child_logger_1.makeChildLogger(LOGGER, FAKE_TRACE);
        let trace;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        LOGGER.write = (info) => {
            trace = info[common_1.LOGGING_TRACE_KEY];
        };
        child.debug('hello world', { [common_1.LOGGING_TRACE_KEY]: 'to-be-clobbered' });
        assert.notStrictEqual(trace, FAKE_TRACE);
    });
});
//# sourceMappingURL=make-child-logger.js.map