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
    
    constructor() {
        this.reconnect = this.reconnect.bind(this);
        this.connect();
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

    send(data) {
        while (this.eventSocket.readyState != WebSocket.OPEN) {
            logger.error("WebSocket connection lost");
            alert("Connection lost - we can't reach our servers right now. Please check your internet connection and try again");
            this.connect()
        }
        this.eventSocket.send(data);
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
}

