import { middleware as commonMiddleware } from '@google-cloud/logging';
import * as winston from 'winston';
import { LoggingWinston, Options } from '../index';
export declare const REQUEST_LOG_SUFFIX = "_reqlog";
declare type Middleware = ReturnType<typeof commonMiddleware.express.makeMiddleware>;
export declare function makeMiddleware(logger: winston.Logger, transport: LoggingWinston): Promise<Middleware>;
export declare function makeMiddleware(logger: winston.Logger, options?: Options): Promise<Middleware>;
export {};
