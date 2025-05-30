package web

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"todopp/store"
	"todopp/util"
)

// Handler that redirects all http requests to https
func redirectToHTTPS(responseWriter http.ResponseWriter, request *http.Request) {
	target := "https://" + request.Host + request.RequestURI
	http.Redirect(responseWriter, request, target, http.StatusMovedPermanently)
}

// Handler for processing an empty GET request, which returns HTML containing the content of the 'content.txt' file
func getMainHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Detecting MIME type via file extension
	switch {
	case strings.HasSuffix(request.URL.Path, ".css"):
		responseWriter.Header().Set("Content-Type", "text/css")
	case strings.HasSuffix(request.URL.Path, ".js"):
		responseWriter.Header().Set("Content-Type", "application/javascript")
	case strings.HasSuffix(request.URL.Path, ".png"):
		responseWriter.Header().Set("Content-Type", "image/png")
	case strings.HasSuffix(request.URL.Path, ".ico"):
		responseWriter.Header().Set("Content-Type", "image/x-icon")
	case strings.HasSuffix(request.URL.Path, ".html"):
		responseWriter.Header().Set("Content-Type", "text/html; charset=UTF-8")
	case strings.HasSuffix(request.URL.Path, "/"):
		responseWriter.Header().Set("Content-Type", "text/html; charset=UTF-8")
	default:
		responseWriter.Header().Set("Content-Type", "text/plain")
	}

	http.ServeFile(responseWriter, request, util.GetExecDir()+"html"+request.URL.Path)
}

// Handler for processing the post_file request, which writes the body to the file content.txt
func taskListHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost && request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Sending data to the server via POST method
	if request.Method == http.MethodPost {
		// read body
		body, err := io.ReadAll(request.Body)
		if err != nil {
			http.Error(responseWriter, "Failed to read body", http.StatusInternalServerError)
			return
		}
		defer request.Body.Close()

		login, err := getCurrentLogin(*request)
		if err != nil {
			http.Error(responseWriter, "Failed to extract current login", http.StatusInternalServerError)
			return
		}

		config, err := util.GetConfig()
		if err != nil {
			http.Error(responseWriter, "Failed to read config", http.StatusInternalServerError)
			return
		}

		db, err := store.OpenDb(config.DbPath)
		if err != nil {
			http.Error(responseWriter, "Failed to open database", http.StatusInternalServerError)
			return
		}

		userId, err := store.GetUserIdByLogin(db, login)
		if err != nil {
			http.Error(responseWriter, "Failed to get user id", http.StatusInternalServerError)
			return
		}

		err = store.UpdateTasksFromJson(db, body, userId, "flat")
		if err != nil {
			http.Error(responseWriter, "Failed to store data: "+err.Error(), http.StatusInternalServerError)
			return
		}

		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Header().Set("Content-Type", "application/json")

		data := map[string]string{
			"status": "success",
		}
		err = json.NewEncoder(responseWriter).Encode(data)
		if err != nil {
			http.Error(responseWriter, "Failed to encode resonse", http.StatusInternalServerError)
			return
		}
	}

	//Fetching data from the server via GET method
	if request.Method == http.MethodGet {
		login, err := getCurrentLogin(*request)
		if err != nil {
			http.Error(responseWriter, "Failed to extract current login", http.StatusInternalServerError)
			return
		}

		config, err := util.GetConfig()
		if err != nil {
			http.Error(responseWriter, "Failed to read config", http.StatusInternalServerError)
			return
		}

		db, err := store.OpenDb(config.DbPath)
		if err != nil {
			http.Error(responseWriter, "Failed to open database", http.StatusInternalServerError)
			return
		}

		userId, err := store.GetUserIdByLogin(db, login)
		if err != nil {
			http.Error(responseWriter, "Failed to get user id", http.StatusInternalServerError)
			return
		}

		taskList, err := store.GetTasksToJson(db, userId, "flat")
		if err != nil {
			http.Error(responseWriter, "Failed to get tasks", http.StatusInternalServerError)
			return
		}

		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(taskList)
	}
}

type LoginPrompt struct {
	Login    string `json:"login"`
	Password string `json:"password"`
}

func loginHandle(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// 1. Parse username/password from request
	body, err := io.ReadAll(request.Body)
	if err != nil {
		http.Error(responseWriter, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer request.Body.Close()

	var loginPrompt LoginPrompt
	err = json.Unmarshal(body, &loginPrompt)
	if err != nil {
		http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
		return
	}

	// 2. Validate credentials (check against DB)
	if checkCredentials(loginPrompt.Login, loginPrompt.Password) {
		jwtKey, err := getJwtKey()
		if err != nil {
			http.Error(responseWriter, "Failed to read jwt key", http.StatusInternalServerError)
			return
		}

		tokenString, err := createJWTToken(jwtKey, loginPrompt.Login)
		if err != nil {
			http.Error(responseWriter, "Failed to create jwt token", http.StatusInternalServerError)
			return
		}

		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write([]byte(tokenString))
	} else {
		http.Error(responseWriter, "Invalid login or password", http.StatusUnauthorized)
		return
	}

}
