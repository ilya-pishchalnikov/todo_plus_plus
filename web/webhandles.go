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

	html, err := os.ReadFile(util.GetExecDir() + "html/index.html")

	if err != nil {
		http.Error(responseWriter, "Failed to read HTML file", http.StatusInternalServerError)
		return
	}

	responseWriter.Header().Set("Content-Type", "text/html; charset=UTF-8")
	responseWriter.Write([]byte(html))
}

// Handler for processing the post_file request, which writes the body to the file content.txt
func postTaskListHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// read body
	body, err := io.ReadAll(request.Body)
	if err != nil {
		http.Error(responseWriter, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer request.Body.Close()

	type Task struct {
		Task string `json:"task"`
	}

	var tasks []Task

	err = json.Unmarshal([]byte(body), &tasks)
	if err != nil {
		http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
		return
	}

	for i := 0; i < len(tasks); i++ {
		tasks[i].Task = strings.Split(tasks[i].Task, "\n")[0]
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
