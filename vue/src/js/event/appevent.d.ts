type AppEventHandler = ((payload: any) => void) | null;

export declare class AppEvent {
    eventSocket: WebSocket | null;
    reconnectIntervalId: number | null;
    isLogEvents: boolean | undefined;

    onConnect: ((event: Event) => void) | null;
    onDisconnect: ((event: CloseEvent) => void) | null;

    onProjectAdd: AppEventHandler;
    onProjectDelete: AppEventHandler;
    onProjectUpdate: AppEventHandler;
    onGroupAdd: AppEventHandler;
    onGroupDelete: AppEventHandler;
    onGroupUpdate: AppEventHandler;
    onTaskAdd: AppEventHandler;
    onTaskDelete: AppEventHandler;
    onTaskUpdate: AppEventHandler;

    constructor();
    
    connect(): void;
    
    sendMessage(event: any): void;
    
    isConnected(): boolean;
    
    reconnect(): void;
    eventSocketOnMessage(event: MessageEvent): void;
    eventSocketOnClose(event: CloseEvent): void;
    eventSocketOnConnect(event: Event): void;
}