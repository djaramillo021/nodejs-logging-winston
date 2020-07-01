import { protos, ServiceContext, Log } from '@google-cloud/logging';
import { Options } from '.';
declare type Callback = (err: Error | null, apiResponse?: {}) => void;
export declare type MonitoredResource = protos.google.api.MonitoredResource;
export interface StackdriverData {
    serviceContext?: ServiceContext;
    message?: string;
    metadata?: Metadata;
}
export interface Metadata {
    stack?: string;
    httpRequest?: protos.google.logging.type.IHttpRequest;
    labels?: {};
    [key: string]: any;
}
/*!
 * Log entry data key to allow users to indicate a trace for the request.
 */
export declare const LOGGING_TRACE_KEY = "logging.googleapis.com/trace";
export declare class LoggingCommon {
    readonly logName: string;
    private inspectMetadata;
    private levels;
    stackdriverLog: Log;
    private resource;
    private serviceContext;
    private prefix;
    private labels;
    static readonly LOGGING_TRACE_KEY = "logging.googleapis.com/trace";
    constructor(options?: Options);
    log(level: string, message: string, metadata: MetadataArg | undefined, callback: Callback): void;
}
declare type MetadataArg = {
    stack?: {};
    /**
     * set httpRequest to a http.clientRequest object to log it
     */
    httpRequest?: protos.google.logging.type.IHttpRequest;
    labels?: {};
    timestamp?: {};
    logName?: string;
} & {
    [key: string]: string | {};
};
export {};
