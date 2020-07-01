import * as common from '@google-cloud/common';
export interface ServiceContext {
    service: string;
    version: string;
    resourceType: string;
}
export interface ErrorEvent {
    eventTime: string;
    serviceContext: ServiceContext;
    message: string;
}
export interface ErrorGroupStats {
    group: {
        groupId: string;
    };
    affectedServices: ServiceContext[];
    representative: ErrorEvent;
    count: string;
}
export interface ApiResponse {
    body: {
        errorGroupStats: ErrorGroupStats[];
        errorEvents: ErrorEvent[];
    };
}
export declare class ErrorsApiTransport extends common.Service {
    constructor();
    request(options: common.DecorateRequestOptions): Promise<ApiResponse>;
    getAllGroups(): Promise<ErrorGroupStats[]>;
    getGroupEvents(groupId: string): Promise<ErrorEvent[]>;
    pollForNewEvents(service: string, time: number, timeout: number): Promise<ErrorEvent[]>;
}
