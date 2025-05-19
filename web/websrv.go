package web

import (
	"fmt"
	"net/http"
)

// Initializes and starts the HTTP server
func StartServer(port string, cert string, certKey string) error {

	go func() {
		err := http.ListenAndServe(":80", http.HandlerFunc(redirectToHTTPS))
		if err != nil {
			fmt.Println("Error while redirecting: ", err)
			return
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/", getMainHandler) // index.html
	mux.Handle("/html/", http.StripPrefix("/html/", http.FileServer(http.Dir("html"))))
	mux.HandleFunc("/api/task_list", taskListHandler) // index.html

	fmt.Println("Server listening on port", port)

	err := http.ListenAndServeTLS(port, cert, certKey, basicAuth(mux))
	if err != nil {
		return err
	}

	return nil
}
