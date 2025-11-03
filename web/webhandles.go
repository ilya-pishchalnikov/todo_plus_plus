package web

import (
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"todopp/store"
	"todopp/util"
)

// Handler that redirects all http requests to https
func redirectToHTTPS(responseWriter http.ResponseWriter, request *http.Request) {
	if request.RequestURI == "/ws" {
		handleEventConnections(responseWriter, request)
		return
	}
	target := "https://" + request.Host + request.RequestURI
	http.Redirect(responseWriter, request, target, http.StatusMovedPermanently)
}

func init() {
	// Регистрируем кастомные MIME типы
	mime.AddExtensionType(".ts", "application/javascript")
	mime.AddExtensionType(".tsx", "application/javascript")
	mime.AddExtensionType(".vue", "application/javascript")
	mime.AddExtensionType(".js", "application/javascript")
	mime.AddExtensionType(".css", "text/css")
}

// Handler for processing an empty GET request, which returns HTML containing the content of the 'content.txt' file
func getMainHandler(responseWriter http.ResponseWriter, request *http.Request) {

	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	requestPath := request.URL.Path
	if requestPath == "/" {
		requestPath = "/index.html"
	}

	filePath := filepath.Join(util.GetExecDir(), "vue/dist", requestPath)

	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		filePath = filepath.Join(util.GetExecDir(), "vue/dist", "index.html")
		responseWriter.Header().Set("Content-Type", "text/html; charset=UTF-8")
	} else {
		ext := filepath.Ext(filePath)
		contentType := mime.TypeByExtension(ext)
		if contentType == "" {
			contentType = "text/plain"
		}
		responseWriter.Header().Set("Content-Type", contentType)
	}

	http.ServeFile(responseWriter, request, filePath)
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

		projectId := request.URL.Query().Get("project_id")
		jsonFormat := request.URL.Query().Get("json_format")

		err = store.UpdateTasksFromJson(db, body, projectId, jsonFormat)
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

		projectId := request.URL.Query().Get("project_id")
		jsonFormat := request.URL.Query().Get("json_format")

		if projectId == "" {
			http.Error(responseWriter, "Project parameter is required to fetch tasks", http.StatusInternalServerError)
			return
		}

		taskList, err := store.GetTasksToJson(db, projectId, jsonFormat)
		if err != nil {
			http.Error(responseWriter, "Failed to get tasks", http.StatusInternalServerError)
			return
		}

		responseWriter.WriteHeader(http.StatusOK)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(taskList)
	}
}

func projectHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	projects, err := store.GetProjects(db, userId)
	if err != nil {
		http.Error(responseWriter, "Failed to retrieve projects", http.StatusInternalServerError)
		return
	}

	projectsJson, err := json.Marshal(projects)
	if err != nil {
		http.Error(responseWriter, "Failed to serialize projects", http.StatusInternalServerError)
		return
	}

	responseWriter.WriteHeader(http.StatusOK)
	responseWriter.Header().Set("Content-Type", "application/json")
	responseWriter.Write(projectsJson)

}

func allDataHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

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

	allData, err := store.GetAllUserData(db, userId)
	if err != nil {
		http.Error(responseWriter, "Failed to retrieve all user data", http.StatusInternalServerError)
		return
	}

	allUserDataJson, err := json.Marshal(allData)
	if err != nil {
		http.Error(responseWriter, "Failed to serialize all user data", http.StatusInternalServerError)
		return
	}

	responseWriter.WriteHeader(http.StatusOK)
	responseWriter.Header().Set("Content-Type", "application/json")
	responseWriter.Write(allUserDataJson)

}
