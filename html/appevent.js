class AppEvent {
    eventSocket

    onTaskAdd;
    
    constructor() {
        if (!("WebSocket" in window)) {
            alert("Your browser does not support WebSocket. This site will not work correctly. Please consider updating your browser or using a different browser that supports WebSocket.")
            return;
        }
        const token = getCookieByName("jwtToken");
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.eventSocket = new WebSocket(`${protocol}//${window.location.host}/ws?token=${token}`);
        this.eventSocket.onmessage = (event) => this.eventSocketOnMessage(event);
        this.eventSocket.onclose = (event) => console.log(JSON.stringify(event))
    }

    eventSocketOnMessage(event) {
        var parsedEvent = JSON.parse(event.data);
        switch(parsedEvent.type) {
            case "task-add":
                if (this.onTaskAdd != null){
                    this.onTaskAdd(parsedEvent.payload);
                }
                break;
        }
    }

    send(data) {
        this.eventSocket.send(data);
    }
}


function getCookieByName(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) {
        return match[2];
    }
    return null;
}
