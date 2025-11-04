package web

import (
	"encoding/json"
	"fmt"
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

var broadcast = make(chan []byte)

func handleEventConnections(responseWriter http.ResponseWriter, request *http.Request) {
	webSocket, err := upgrader.Upgrade(responseWriter, request, nil)
	if err != nil {
		http.Error(responseWriter, "Failed to upgrade HTTP connection to WebSocket protocol", http.StatusInternalServerError)
		return
	}
	defer webSocket.Close()

	login, err := getCurrentLogin(*request)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusUnauthorized)
		return
	}

	instance := request.URL.Query().Get("instance")
	if instance == "" {
		http.Error(responseWriter, "Instance ID is required", http.StatusBadRequest)
		return
	}

	client := &Client{conn: webSocket, send: make(chan []byte), login: login, instance: instance}
	clientsMap[client] = true
	clientInstanceMap[client.instance] = *client

	for {
		_, msg, err := webSocket.ReadMessage()
		if err != nil {
			delete(clientsMap, client)
			break
		}
		broadcast <- msg
	}
}

func handleEventMessages() {

	config, err := util.GetConfig()
	if err != nil {
		fmt.Println(err)
		log.Fatal(err)
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		fmt.Println(err)
		log.Fatal(err)
	}

	for {
		msg := <-broadcast

		var appEvent event.Event

		err = json.Unmarshal(msg, &appEvent)
		if err != nil {
			continue
		}

		responce := msg

		clientInstance, keyExists := clientInstanceMap[appEvent.Instance]

		if !keyExists {
			continue
		}

		login := clientInstance.login

		userId, err := store.GetUserIdByLogin(db, login)
		if err != nil {
			fmt.Println(err)
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
			responce, err = event.GetErrorMessage(err.Error(), appEvent.Instance)
			if err != nil {
				continue
			}
			eventStore.IsError = 1
			eventStore.Responce = string(responce)
			store.InsertEvent(db, eventStore)
			continue
		}

		responce, err = json.Marshal(appEvent)
		if err != nil {
			continue
		}

		eventStore.IsError = 0
		eventStore.Responce = string(responce)
		store.InsertEvent(db, eventStore)

		clientInstance.conn.WriteMessage(websocket.TextMessage, responce)
	}
}
