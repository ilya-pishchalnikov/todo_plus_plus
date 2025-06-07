package web

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"todopp/auth"
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

func bearerAuth(next http.Handler) http.Handler {

	return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		if !strings.Contains(request.URL.Path, "/api/") || request.URL.Path == "/api/login" {
			next.ServeHTTP(responseWriter, request)
			return
		}

		_, err := verifyJwtAndGetLoginByRequest(*request)
		if err != nil {
			http.Error(responseWriter, err.Error(), http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(responseWriter, request)
	})
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
		jwtKey, err := auth.GetJwtKey()
		if err != nil {
			http.Error(responseWriter, "Failed to read jwt key", http.StatusInternalServerError)
			return
		}

		tokenString, err := auth.CreateJWTToken(jwtKey, loginPrompt.Login)
		if err != nil {
			http.Error(responseWriter, "Failed to create jwt token", http.StatusInternalServerError)
			return
		}

		responseWriter.Header().Set("Content-Type", "text/plain")
		responseWriter.Write([]byte(tokenString))
	} else {
		http.Error(responseWriter, "Invalid login or password", http.StatusUnauthorized)
		return
	}

}

func tokenRenewHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	login, err := verifyJwtAndGetLoginByRequest(*request)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusUnauthorized)
	}

	jwtKey, err := auth.GetJwtKey()
	if err != nil {
		http.Error(responseWriter, "Failed to read jwt key", http.StatusInternalServerError)
		return
	}

	tokenString, err := auth.CreateJWTToken(jwtKey, login)
	if err != nil {
		http.Error(responseWriter, "Failed to create jwt token", http.StatusInternalServerError)
		return
	}

	responseWriter.Header().Set("Content-Type", "text/plain")
	responseWriter.Write([]byte(tokenString))
}

func verifyJwtAndGetLoginByRequest(request http.Request) (string, error) {
	authHeader := request.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return "", errors.New("the request is missing the 'Authorization: Bearer' header")
	}
	tokenString := authHeader[len("Bearer "):]
	return auth.VerifyJwtAndGetLogin(tokenString)
}

func getCurrentLogin(request http.Request) (string, error) {
	return verifyJwtAndGetLoginByRequest(request)
}
