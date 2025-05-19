package web

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strings"
)

// Simple login and password validation
// Credentials should be stored in the gohelloworld_credentials environment variable,
// formatted as 'login1=password1;login2=password2'.
func checkCredentials(username, password string) bool {
	credentialsString := os.Getenv("websrvfileshow_credentials")

	if credentialsString == "" {
		fmt.Print("environment variable not found")
		return false
	}

	credentials := strings.Split(credentialsString, ";")

	for index := range credentials {
		loginPassword := strings.Split(credentials[index], "=")
		login := loginPassword[0]
		password1 := loginPassword[1]

		if username == login && password == password1 {
			return true
		}
	}

	return false
}

func basicAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		auth := request.Header.Get("Authorization")
		if auth == "" || !strings.HasPrefix(auth, "Basic ") {
			responseWriter.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			responseWriter.WriteHeader(http.StatusUnauthorized)
			fmt.Fprintln(responseWriter, "Unauthorized")
			return
		}

		payload, err := base64.StdEncoding.DecodeString(auth[len("Basic "):])
		if err != nil {
			responseWriter.WriteHeader(http.StatusUnauthorized)
			fmt.Fprintln(responseWriter, "Invalid authorization header")
			return
		}

		parts := strings.SplitN(string(payload), ":", 2)
		if len(parts) != 2 || !checkCredentials(parts[0], parts[1]) {
			responseWriter.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
			responseWriter.WriteHeader(http.StatusUnauthorized)
			fmt.Fprintln(responseWriter, "Unauthorized")
			return
		}

		next.ServeHTTP(responseWriter, request)
	})
}
