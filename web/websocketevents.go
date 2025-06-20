package web

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"
	"todopp/auth"
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
	conn  *websocket.Conn
	send  chan []byte
	login string
}

var clients = make(map[*Client]bool)

var broadcast = make(chan []byte)

func handleEventConnections(responseWriter http.ResponseWriter, request *http.Request) {
	webSocket, err := upgrader.Upgrade(responseWriter, request, nil)
	if err != nil {
		http.Error(responseWriter, "Failed to upgrade HTTP connection to WebSocket protocol", http.StatusInternalServerError)
		return
	}
	defer webSocket.Close()

	jwt := request.URL.Query().Get("token")

	if jwt == "" {
		http.Error(responseWriter, "Failed to read JWT", http.StatusInternalServerError)
		return
	}

	login, err := auth.VerifyJwtAndGetLogin(jwt)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	client := &Client{conn: webSocket, send: make(chan []byte), login: login}
	clients[client] = true

	for {
		_, msg, err := webSocket.ReadMessage()
		if err != nil {
			delete(clients, client)
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

		login, err := auth.VerifyJwtAndGetLogin(appEvent.Jwt)
		if err != nil {
			fmt.Println(err)
			continue
		}

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
		err = event.ProcessEvent(appEvent)
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

		//exclude jwt from responce
		appEvent.Jwt = ""
		responce, err = json.Marshal(appEvent)
		if err != nil {
			continue
		}

		eventStore.IsError = 0
		eventStore.Responce = string(responce)
		store.InsertEvent(db, eventStore)

		for client := range clients {
			if client.login == login {
				client.conn.WriteMessage(websocket.TextMessage, responce)
			}
		}
	}
}
