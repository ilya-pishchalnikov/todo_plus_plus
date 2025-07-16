package web

import (
	"fmt"
	"net/http"
	"todopp/util"
)

// Initializes and starts the HTTP server
func StartServer(port string, cert string, certKey string) error {

	go func() {

		http.HandleFunc("/ws", handleEventConnections)
		err := http.ListenAndServe(":80", http.HandlerFunc(redirectToHTTPS))
		if err != nil {
			fmt.Println("Error while redirecting: ", err)
			return
		}
	}()

	mux := http.NewServeMux()
	mux.HandleFunc("/", getMainHandler) // index.html
	mux.Handle("/html/", http.StripPrefix("/html/", http.FileServer(http.Dir(util.GetExecDir()+"html"))))

	mux.HandleFunc("/api/task_list", taskListHandler)
	mux.HandleFunc("/api/login", loginHandler)
	mux.HandleFunc("/api/token_renew", tokenRenewHandler)
	mux.HandleFunc("/api/projects", projectHandler)
	mux.HandleFunc("/api/all_user_data", allDataHandler)
	mux.HandleFunc("/api/register", registerHandler)
	mux.HandleFunc("/api/confirm_email", emailConfirmationHandler)

	mux.HandleFunc("/ws", handleEventConnections)
	//mux.HandleFunc("/ws", handleEventConnections)

	go handleEventMessages()

	fmt.Println("Server listening on port", port)

	err := http.ListenAndServeTLS(port, cert, certKey, bearerAuth(mux))
	if err != nil {
		return err
	}

	return nil
}
