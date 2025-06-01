package web

import (
	"crypto/rand"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
	"todopp/store"
	"todopp/util"

	"github.com/golang-jwt/jwt/v5"
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

	jwtKey, err := getJwtKey()
	if err != nil {
		http.Error(responseWriter, "Failed to read jwt key", http.StatusInternalServerError)
		return
	}

	tokenString, err := createJWTToken(jwtKey, login)
	if err != nil {
		http.Error(responseWriter, "Failed to create jwt token", http.StatusInternalServerError)
		return
	}

	responseWriter.Header().Set("Content-Type", "text/plain")
	responseWriter.Write([]byte(tokenString))
}

func verifyJwtAndGetLogin(tokenString string) (string, error) {
	jwtkey, err := getJwtKey()
	if err != nil {
		return "", errors.New("failed to retrieve JWT signing key")
	}

	token, err := verifyJWTToken([]byte(tokenString), jwtkey)
	if err != nil {
		return "", errors.New("JWT verification failed")
	}

	if !token.Valid {
		return "", errors.New("the provided JWT is invalid")
	}

	var login string

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if login, ok = claims["login"].(string); !ok {
			return "", errors.New("the provided JWT is invalid: login claim not provided")
		}

		if expire, ok := claims["expire"].(float64); !ok {
			return "", errors.New("the provided JWT is invalid: expire claim not provided")
		} else if time.Now().Unix() > int64(expire) {
			return "", errors.New("the provided JWT is invalid: expired")
		}
	} else {
		return "", errors.New("the provided JWT is invalid: claims not found")
	}
	return login, nil
}

func verifyJwtAndGetLoginByRequest(request http.Request) (string, error) {
	auth := request.Header.Get("Authorization")
	if auth == "" || !strings.HasPrefix(auth, "Bearer ") {
		return "", errors.New("the request is missing the 'Authorization: Bearer' header")
	}
	tokenString := auth[len("Bearer "):]
	return verifyJwtAndGetLogin(tokenString)
}

func getCurrentLogin(request http.Request) (string, error) {
	return verifyJwtAndGetLoginByRequest(request)
}

func generateHmacKey() ([]byte, error) {

	key := make([]byte, 32) // 32 bytes = 256-bit
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}

func createJWTToken(hmacKey []byte, login string) (string, error) {
	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		jwt.MapClaims{
			"login":  login,
			"expire": time.Now().Add(24 * time.Hour).Unix(),
		},
	)
	return token.SignedString([]byte(hmacKey))
}

func verifyJWTToken(tokenString, hmacKey []byte) (*jwt.Token, error) {
	return jwt.Parse(string(tokenString), func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return hmacKey, nil
	})
}

func getJwtKey() ([]byte, error) {
	config, err := util.GetConfig()
	if err != nil {
		return nil, err
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		return nil, err
	}

	isEmpty, err := store.IsEmptyjwt(db)
	if err != nil {
		return nil, err
	}
	if isEmpty {
		key, err := generateHmacKey()
		if err != nil {
			return nil, err
		}
		err = store.InsertJwt(db, string(key))
		if err != nil {
			return nil, err
		}
	}

	jwtKey, err := store.GetJwtKey(db)
	return []byte(jwtKey), err
}
