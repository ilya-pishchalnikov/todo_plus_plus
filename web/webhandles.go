package web

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
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

	http.ServeFile(responseWriter, request, "./html"+request.URL.Path)
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

		type Task struct {
			Id   string `json:"id"`
			Task string `json:"task"`
		}

		var tasks []Task

		err = json.Unmarshal([]byte(body), &tasks)
		if err != nil {
			http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
			return
		}

		jsonTaskData, err := json.Marshal(tasks)
		if err != nil {
			http.Error(responseWriter, "Failed to serialize data", http.StatusInternalServerError)
			return
		}

		err = os.WriteFile(util.GetExecDir()+"data/task.json", jsonTaskData, 0644)
		if err != nil {
			http.Error(responseWriter, "Failed to write data to server", http.StatusInternalServerError)
			return
		}

		fmt.Println(body)

		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Header().Set("Content-Type", "application/json")

		data := map[string]string{
			"status": "success",
		}
		json.NewEncoder(responseWriter).Encode(data)
	}

	//Fetching data from the server via GET method
	if request.Method == http.MethodGet {
		taskList, err := os.ReadFile(util.GetExecDir() + "data/task.json")
		if err != nil {
			// file not created yet
			if os.IsNotExist(err) {
				fmt.Print("Data file not created yet")
			} else {
				http.Error(responseWriter, "Failed to fetch data from the server", http.StatusInternalServerError)
				return
			}
		}

		if taskList == nil || len(taskList) == 0 {
			taskList = []byte("[]")
		}

		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(taskList)
	}
}
