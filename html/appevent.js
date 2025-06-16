class AppEvent {
    eventSocket;
    
    isLogEvents;

    onConnect;
    onDisconnect;

    onProjectAdd;
    onProjectDelete;
    onProjectUpdate;
    onGroupAdd;
    onGroupDelete;
    onGroupUpdate;
    onTaskAdd;
    onTaskDelete;
    onTaskUpdate;

    reconnectIntervalId;
    store;

    constructor() {
        this.reconnect = this.reconnect.bind(this);
        this.connect();
        this.store = new IndexedDBEventStore();
    }

    eventSocketOnMessage(event) {
        var parsedEvent = JSON.parse(event.data);
        if (this.isLogEvents) {
            logger.log(parsedEvent);
        }
        switch(parsedEvent.type) {
            case "project-add":
                if (this.onProjectAdd != null){
                    this.onProjectAdd(parsedEvent.payload);
                }
                break;
            case "project-delete":
                if (this.onProjectDelete != null){
                    this.onProjectDelete(parsedEvent.payload);
                }
                break;
            case "project-update":
                if (this.onProjectUpdate != null){
                    this.onProjectUpdate(parsedEvent.payload);
                }
                break;
            case "group-add":
                if (this.onGroupAdd != null){
                    this.onGroupAdd(parsedEvent.payload);
                }
                break;
            case "group-delete":
                if (this.onGroupDelete != null){
                    this.onGroupDelete(parsedEvent.payload);
                }
                break;
            case "group-update":
                if (this.onGroupUpdate != null){
                    this.onGroupUpdate(parsedEvent.payload);
                }
                break;
            case "task-add":
                if (this.onTaskAdd != null){
                    this.onTaskAdd(parsedEvent.payload);
                }
                break;
            case "task-delete":
                if (this.onTaskDelete != null){
                    this.onTaskDelete(parsedEvent.payload);
                }
                break;
            case "task-update":
                if (this.onTaskUpdate != null){
                    this.onTaskUpdate(parsedEvent.payload);
                }
                break;
        }
    }

    async send(data) {
        if (this.isConnected()){
            this.eventSocket.send(data);
        } else {
            await this.store.init();
            const storeEvent = {eventId:guid(), utc_time:Date.now().toString(), data:data}
            await this.store.saveEvents(storeEvent);            
        }
    }

    async resendEvents() {
        await this.store.init();
        const events = await this.store.getEventsSince("0");
        events.forEach(event => {this.eventSocket.send(event.data);});
        await this.store.clearEventStore();
    }

    connect() {
        if (!("WebSocket" in window)) {
            alert("Your browser does not support WebSocket. This site will not work correctly. Please consider updating your browser or using a different browser that supports WebSocket.")
            return;
        }
        const token = getCookieByName("jwtToken");
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.eventSocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
        this.eventSocket.onmessage = this.eventSocketOnMessage.bind(this);
        this.eventSocket.onclose = this.eventSocketOnClose.bind(this);
        this.eventSocket.onopen = this.eventSocketOnConnect.bind(this);
    }

    eventSocketOnClose(event) {
        if (this.onDisconnect!= null) {
            this.onDisconnect(event);
        }
        if (this.reconnectIntervalId == null) {
            this.reconnectIntervalId = setInterval(this.reconnect, 1000);
        }
    }

    eventSocketOnConnect(event) {  
        if (this.onConnect!= null) {
            this.onConnect(event);
        }
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
}

