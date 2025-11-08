package web

import (
	"encoding/json"
	"log"
	"net/http"
	"time"
	"todopp/event"
	"todopp/store"
	"todopp/util"

	"github.com/gorilla/websocket"
)

// determines whether a WebSocket connection from a specific origin (domain) should be allowed
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type Client struct {
	conn     *websocket.Conn
	send     chan []byte
	login    string
	instance string
}

var clientInstanceMap = make(map[string]Client)
var clientsMap = make(map[*Client]bool)
var loginMap = make(map[string][]Client)
var broadcast = make(chan []byte)

func handleEventConnections(responseWriter http.ResponseWriter, request *http.Request) {
	webSocket, err := upgrader.Upgrade(responseWriter, request, nil)
	if err != nil {
		http.Error(responseWriter, "Failed to upgrade HTTP connection to WebSocket protocol", http.StatusInternalServerError)
		return
	}
	defer webSocket.Close()

	closeWithError := func(code int, reason string) {
		webSocket.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(code, reason))
		webSocket.Close()
	}

	login, err := getCurrentLogin(*request)
	if err != nil {
		closeWithError(websocket.ClosePolicyViolation, "Unauthorized or token expired")
		return
	}

	instance := request.URL.Query().Get("instance")
	if instance == "" {
		closeWithError(websocket.CloseProtocolError, "Instance ID is required")
		return
	}

	client := &Client{conn: webSocket, send: make(chan []byte), login: login, instance: instance}
	clientsMap[client] = true
	clientInstanceMap[client.instance] = *client

	if clients, exists := loginMap[client.login]; exists {
		instanceExists := false
		for _, c := range clients {
			if c.instance == client.instance {
				instanceExists = true
				break
			}
		}
		if !instanceExists {
			loginMap[client.login] = append(clients, *client)
		}
	} else {
		loginMap[client.login] = []Client{*client}
	}

	log.Printf("WebSocket opened login %s, instance %s", client.login, client.instance)
	for {
		_, msg, err := webSocket.ReadMessage()
		if err != nil {
			delete(clientsMap, client)
			delete(clientInstanceMap, client.instance)
			var newClients []Client
			for _, loginClient := range loginMap[client.login] {
				if loginClient.instance != client.instance {
					newClients = append(newClients, loginClient)
				}
			}
			loginMap[client.login] = newClients
			log.Printf("WebSocket closed login %s, instance %s", client.login, client.instance)
			return
		}
		broadcast <- msg
	}

}

func handleEventMessages() {

	config, err := util.GetConfig()
	if err != nil {
		log.Fatal(err)
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		log.Fatal(err)
	}

	for {
		msg := <-broadcast

		var appEvent event.Event

		err = json.Unmarshal(msg, &appEvent)
		if err != nil {
			continue
		}

		response := msg

		clientInstance, keyExists := clientInstanceMap[appEvent.Instance]

		if !keyExists {
			continue
		}

		login := clientInstance.login

		userId, err := store.GetUserIdByLogin(db, login)
		if err != nil {
			continue
		}

		err = json.Unmarshal(msg, &appEvent)
		if err != nil {
			continue // ignore invalid messages
		}

		var eventStore store.Event
		eventStore.EventId = util.Uuid()
		eventStore.Payload = string(appEvent.Payload)
		eventStore.UserId = userId
		eventStore.UtcTime = time.Now().UTC().UnixMilli()

		// process events
		err = event.ProcessEvent(appEvent, clientInstance.login)
		if err != nil {
			response, err = event.GetErrorMessage(err.Error(), appEvent.Instance)
			if err != nil {
				continue
			}
			eventStore.IsError = 1
			eventStore.Response = string(response)
			store.InsertEvent(db, eventStore)
			continue
		}

		response, err = json.Marshal(appEvent)
		if err != nil {
			continue
		}

		eventStore.IsError = 0
		eventStore.Response = string(response)
		store.InsertEvent(db, eventStore)

		clients := loginMap[login]
		if clients == nil {
			continue
		}

		for _, client := range clients {
			err := client.conn.WriteMessage(websocket.TextMessage, response)
			if err != nil {
				log.Printf("Failed to send message to client %s instance %s: %v", client.login, client.instance, err)
				continue
			}
		}
	}
}
