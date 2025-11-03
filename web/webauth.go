package web

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
	"todopp/auth"
	"todopp/mail"
	"todopp/store"
	"todopp/util"
	"unicode"
)

type LoginPrompt struct {
	Login    string `json:"login"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
}

type Register struct {
	Name     string `json:"username"`
	Login    string `json:"login"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Captcha  string `json:"captcha"`
}

type ForgotPasswordRequest struct {
	Login   string `json:"login"`
	Captcha string `json:"captcha"`
}

type ResetPasswordRequest struct {
	Token       string `json:"token"`
	NewPassword string `json:"password"`
}

type TokenGetResponse struct {
	Target  string `json:"target"`
	Status  string `json:"status"`
	Header  string `json:"header"`
	Message string `json:"message"`
	Details string `json:"details"`
}

// Simple login and password validation
// Credentials should be stored in the gohelloworld_credentials environment variable,
// formatted as 'login1=password1;login2=password2'.
func checkCredentials(username, password string, checkIfIsActive bool) bool {
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
	return util.CheckPassword(password, password_hash) && (!checkIfIsActive || store.IsUserExistsAndActive(db, username))
}

func bearerAuth(next http.Handler) http.Handler {

	return http.HandlerFunc(func(responseWriter http.ResponseWriter, request *http.Request) {
		if !strings.Contains(request.URL.Path, "/api/") || request.URL.Path == "/api/login" || request.URL.Path == "/api/register" || request.URL.Path == "/api/secret_token" || request.URL.Path == "/api/forgot_password" || request.URL.Path == "/api/reset_password" {
			next.ServeHTTP(responseWriter, request)
			return
		}

		_, err := getCurrentLogin(*request)
		if err != nil {
			http.Error(responseWriter, err.Error(), http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(responseWriter, request)
	})
}

func loginHandler(responseWriter http.ResponseWriter, request *http.Request) {
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

	isCaptchaValid, err := util.VerifyCaptcha(loginPrompt.Captcha)
	if err != nil || !isCaptchaValid {
		http.Error(responseWriter, "Failed Captcha validation", http.StatusInternalServerError)
		return
	}

	// 2. Validate credentials (check against DB)
	if checkCredentials(loginPrompt.Login, loginPrompt.Password, true) {

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

		newCookie := http.Cookie{
			Name:     "jwtToken",
			Value:    tokenString,
			Path:     "/",
			Expires:  time.Now().Add(48 * time.Hour),
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		}

		http.SetCookie(responseWriter, &newCookie)

		responseWriter.WriteHeader(http.StatusOK)
	} else {
		http.Error(responseWriter, "Invalid login or password", http.StatusUnauthorized)
		return
	}

}

func registerHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// 1. Parse request
	body, err := io.ReadAll(request.Body)
	if err != nil {
		http.Error(responseWriter, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer request.Body.Close()

	var register Register
	err = json.Unmarshal(body, &register)
	if err != nil {
		http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
		return
	}

	err = ValidateRegistration(register)
	if err != nil {
		http.Error(responseWriter, "Registration form validation error: "+err.Error(), http.StatusInternalServerError)
		return
	}

	config, err := util.GetConfig()
	if err != nil {
		http.Error(responseWriter, "Error reading config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		http.Error(responseWriter, "Error opening db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	err = store.ValidateUserRegistration(db, register.Login, register.Email)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	var user store.User

	user.UserId = util.Uuid()
	user.Name = register.Name
	user.Login = register.Login
	user.Email = register.Email
	user.PasswordHash, err = util.HashPassword(register.Password)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}
	user.IsActive = 0

	err = store.InsertUser(db, user)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := generateConfirmationToken()
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	expire := time.Now().Add(6 * time.Hour).UnixMilli()

	var userSecret store.UserSecret

	userSecret.UserId = user.UserId
	userSecret.Secret = token
	userSecret.Target = "register"
	userSecret.Expire = expire

	err = store.InsertUserSecret(db, userSecret)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	err = mail.SendConfirmationEmail(register.Email, token, "register")
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

}

func forgotPasswordHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	// 1. Parse request
	body, err := io.ReadAll(request.Body)
	if err != nil {
		http.Error(responseWriter, "Failed to read body", http.StatusInternalServerError)
		return
	}
	defer request.Body.Close()

	if isCaptchaValid, err := util.VerifyCaptcha(request.FormValue("captcha")); err != nil || !isCaptchaValid {
		http.Error(responseWriter, "Failed Captcha validation", http.StatusInternalServerError)
		return
	}

	var forgotPasswordRequest ForgotPasswordRequest
	err = json.Unmarshal(body, &forgotPasswordRequest)
	if err != nil {
		http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
		return
	}

	config, err := util.GetConfig()
	if err != nil {
		http.Error(responseWriter, "Error reading config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		http.Error(responseWriter, "Error opening db: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer db.Close()

	user, err := store.GetUserByLogin(db, forgotPasswordRequest.Login)
	if err != nil {
		http.Error(responseWriter, "Error getting user by login: "+err.Error(), http.StatusInternalServerError)
		return
	}

	token, err := generateConfirmationToken()
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	expire := time.Now().Add(6 * time.Hour).UnixMilli()

	var userSecret store.UserSecret

	userSecret.UserId = user.UserId
	userSecret.Secret = token
	userSecret.Target = "password_reset"
	userSecret.Expire = expire

	err = store.InsertUserSecret(db, userSecret)
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

	err = mail.SendConfirmationEmail(user.Email, token, "password_reset")
	if err != nil {
		http.Error(responseWriter, err.Error(), http.StatusInternalServerError)
		return
	}

}

func generateConfirmationToken() (string, error) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		return "", err
	}

	token := base64.URLEncoding.WithPadding(base64.NoPadding).EncodeToString(key)
	return token, nil
}

func ValidateRegistration(register Register) error {

	isCaptchaValid, err := util.VerifyCaptcha(register.Captcha)
	if err != nil || !isCaptchaValid {
		return errors.New("failed Captcha validation")
	}

	// Name validation (minimum 2 characters)
	if len(register.Name) < 2 {
		return errors.New("name must be at least 2 characters long")
	}

	// Login validation (starts with letter, contains letters/numbers/underscore, min 2 chars)
	loginRegex := regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]{1,}$`)
	if !loginRegex.MatchString(register.Login) {
		return errors.New("login must start with a letter and contain only letters, numbers, or underscores (min 2 chars)")
	}

	// Email validation
	if _, err := mail.ParseAddress(register.Email); err != nil {
		return errors.New("invalid email format")
	}

	// Password validation
	if len(register.Password) < 8 {
		return errors.New("password must be at least 8 characters long")
	}

	var (
		hasUpper   = false
		hasLower   = false
		hasNumber  = false
		hasSpecial = false
	)

	for _, char := range register.Password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsNumber(char):
			hasNumber = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("password must contain at least one uppercase letter")
	}
	if !hasLower {
		return errors.New("password must contain at least one lowercase letter")
	}
	if !hasNumber {
		return errors.New("password must contain at least one number")
	}
	if !hasSpecial {
		return errors.New("password must contain at least one special character")
	}

	return nil
}

func tokenRenewHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	login, err := getCurrentLogin(*request)
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

	newCookie := http.Cookie{
		Name:     "jwtToken",
		Value:    tokenString,
		Path:     "/",
		Expires:  time.Now().Add(48 * time.Hour),
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode,
	}

	http.SetCookie(responseWriter, &newCookie)

	responseWriter.WriteHeader(http.StatusOK)
}

func secretTokenHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	token := request.URL.Query().Get("secret_token")

	var response TokenGetResponse
	response.Target = ""

	config, err := util.GetConfig()
	if err != nil {
		response.Status = "error"
		response.Header = "Invalid or Expired Link"
		response.Message = "We couldn't validate your email link. Please try again or request a new verification link."
		response.Details = "Configuration error: " + err.Error()
		responseJson, _ := json.Marshal(response)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(responseJson)
		return
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		response.Status = "error"
		response.Header = "Invalid or Expired Link"
		response.Message = "We couldn't validate your email link. Please try again or request a new verification link."
		response.Details = "Error opening db: " + err.Error()
		responseJson, _ := json.Marshal(response)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(responseJson)
		return
	}
	defer db.Close()

	target, err := store.ValidateSecret(db, token)
	if err != nil {
		response.Status = "error"
		response.Header = "Invalid or Expired Link"
		response.Message = "We couldn't validate your email link. Please try again or request a new verification link."
		response.Details = "Error validating secret: " + err.Error()
		responseJson, _ := json.Marshal(response)
		responseWriter.Header().Set("Content-Type", "application/json")
		responseWriter.Write(responseJson)
		return
	}

	response.Target = *target
	response.Status = "success"
	response.Header = "Email Confirmed Successfully"
	response.Message = "Your email has been verified! You can now access all features."
	response.Details = ""
	responseJson, _ := json.Marshal(response)
	responseWriter.Header().Set("Content-Type", "application/json")
	responseWriter.Write(responseJson)
}

func resetPasswordHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var resetPasswordRequest ResetPasswordRequest
	if err := json.NewDecoder(request.Body).Decode(&resetPasswordRequest); err != nil {
		http.Error(responseWriter, "Failed to parse body", http.StatusInternalServerError)
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
	defer db.Close()

	user, err := store.GetUserByToken(db, resetPasswordRequest.Token)
	if err != nil {
		http.Error(responseWriter, "Failed to get user by token"+err.Error(), http.StatusInternalServerError)
		return
	}

	target, err := store.ValidateSecret(db, resetPasswordRequest.Token)
	if err != nil {
		http.Error(responseWriter, "Error validating secret: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if *target != "password_reset" {
		http.Error(responseWriter, "Invalid token target", http.StatusInternalServerError)
		return
	}

	newPasswordHash, err := util.HashPassword(resetPasswordRequest.NewPassword)
	if err != nil {
		http.Error(responseWriter, "Failed to hash new password", http.StatusInternalServerError)
		return
	}

	err = store.UpdateUserPasswordHash(db, user.UserId, newPasswordHash)
	if err != nil {
		http.Error(responseWriter, "Failed to update password", http.StatusInternalServerError)
		return
	}
}

func checkAuthHandler(responseWriter http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		http.Error(responseWriter, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	responseWriter.WriteHeader(http.StatusOK)
}

func getCurrentLogin(request http.Request) (string, error) {
	cookie, err := request.Cookie("jwtToken")
	if err != nil {
		return "", errors.New("authentication token not found")
	}

	return auth.VerifyJwtAndGetLogin(cookie.Value)
}
