package web

import (
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"todopp/store"
	"todopp/util"
)

// Simple login and password validation
// Credentials should be stored in the gohelloworld_credentials environment variable,
// formatted as 'login1=password1;login2=password2'.
func checkCredentials(username, password string) bool {
	config, err := util.GetConfig()
	if err != nil {
		fmt.Println("Error reading config: ", err)
		return false
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		fmt.Println("Error opening db: ", err)
		return false
	}
	defer db.Close()

	password_hash, err := store.GetUserPasswordHashByLogin(db, username)
	if err != nil {
		fmt.Println("Failed to get the password hash: ", err)
		return false
	}
	return util.CheckPassword(password, password_hash)
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

func getCurrentLogin(request http.Request) (string, error) {
	authHeader := request.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("Authorization header is empty")
	}

	if !strings.HasPrefix(authHeader, "Basic ") {
		return "", errors.New("Invalid Authorization header format")
	}

	encodedCredentials := authHeader[6:]
	usernamePassword, err := base64.StdEncoding.DecodeString(encodedCredentials)
	if err != nil {
		return "", err
	}
	return strings.Split(string(usernamePassword), ":")[0], nil
}
