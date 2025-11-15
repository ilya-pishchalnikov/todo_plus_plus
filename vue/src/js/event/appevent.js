import { guid, getBrowserInstanceId } from '../utils/utils.js';
import { IndexedDBEventStore } from '../store/eventstore.js';

export class AppEvent {
    eventSocket;

    isLogEvents;

    onConnect = [];
    onDisconnect = [];
    onUnauthorizedDisconnect = [];

    onProjectAdd = [];
    onProjectDelete = [];
    onProjectUpdate = [];
    onGroupAdd = [];
    onGroupDelete = [];
    onGroupUpdate = [];
    onTaskAdd = [];
    onTaskDelete = [];
    onTaskUpdate = [];

    reconnectIntervalId;
    #store;

    constructor() {
        this.reconnect = this.reconnect.bind(this);
        this.connect();
        this.#store = new IndexedDBEventStore();
    }

    eventSocketOnMessage(event) {
        if (this.isLogEvents) {
            console.log(event.data);
        }

        var parsedEvent = JSON.parse(event.data);
        switch (parsedEvent.type) {
            case "project-add":
                this.executeHandlers(this.onProjectAdd, parsedEvent.payload);
                break;
            case "project-delete":
                this.executeHandlers(this.onProjectDelete, parsedEvent.payload);
                break;
            case "project-update":
                this.executeHandlers(this.onProjectUpdate, parsedEvent.payload);
                break;
            case "group-add":
                this.executeHandlers(this.onGroupAdd, parsedEvent.payload);
                break;
            case "group-delete":
                this.executeHandlers(this.onGroupDelete, parsedEvent.payload);
                break;
            case "group-update":
                this.executeHandlers(this.onGroupUpdate, parsedEvent.payload);
                break;
            case "task-add":                
                this.executeHandlers(this.onTaskAdd, parsedEvent.payload);
                break;
            case "task-delete":                
                this.executeHandlers(this.onTaskDelete, parsedEvent.payload);
                break;
            case "task-update":
                this.executeHandlers(this.onTaskUpdate, parsedEvent.payload);
                break;
        }
    }

    async send(data) {
        if (this.isConnected()) {
            this.eventSocket.send(data);
        } else {
            await this.#store.init();
            const storeEvent = { eventId: guid(), utc_time: Date.now().toString(), data: data }
            await this.#store.saveEvents(storeEvent);
            const eventData = JSON.parse(data);
            const receiveMessage = { data: JSON.stringify(eventData) };
            this.eventSocketOnMessage(receiveMessage);
        }
    }

    async resendEvents() {
        await this.#store.init();
        const events = await this.#store.getEventsSince("0");
        events.forEach(event => { this.eventSocket.send(event.data); });
        await this.#store.clearEventStore();
    }

    connect() {
        if (!("WebSocket" in window)) {
            alert("Your browser does not support WebSocket. This site will not work correctly. Please consider updating your browser or using a different browser that supports WebSocket.")
            return;
        }
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

        const browserInstanceId = getBrowserInstanceId();

        this.eventSocket = new WebSocket(`${protocol}//${window.location.host}/ws?instance=${browserInstanceId}`);
        this.eventSocket.onmessage = this.eventSocketOnMessage.bind(this);
        this.eventSocket.onclose = this.eventSocketOnClose.bind(this);
        this.eventSocket.onopen = this.eventSocketOnConnect.bind(this);
    }

    eventSocketOnClose(event) {
        const UNAUTHORIZED_CODE = 1008;

        if (event.code === UNAUTHORIZED_CODE) {
            console.error("WebSocket closed: Unauthorized (Token Invalid/Expired).");
            this.executeHandlers(this.onUnauthorizedDisconnect, event);
            return;
        }

        this.executeHandlers(this.onDisconnect, event);

        if (this.reconnectIntervalId == null) {
            this.reconnectIntervalId = setInterval(this.reconnect, 1000);
        }
    }

    eventSocketOnConnect(event) {
        this.executeHandlers(this.onConnect, event);
    }

    reconnect() {
        switch (this.eventSocket.readyState) {
            case WebSocket.OPEN:
                if (this.reconnectIntervalId != null) {
                    clearInterval(this.reconnectIntervalId);
                    this.reconnectIntervalId = null;
                }
                break;
            case WebSocket.CLOSED:
                this.connect()
                break;
        }
    }

    isConnected() {
        return this.eventSocket.readyState == WebSocket.OPEN;
    }

    executeHandlers(handlers, payload) {
        if (handlers) {
            if (Array.isArray(handlers)) {
                for (const handler of handlers) {
                    handler(payload);
                }
            }
            else {
                handlers(payload);
            }
        }
    }
}

