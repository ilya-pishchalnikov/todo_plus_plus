package util

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	Port          string `json:"port"`
	Cert          string `json:"cert"`
	CertKey       string `json:"certKey"`
	DbPath        string `json:"dbPath"`
	SmtpHost      string `json:"smtpHost"`
	SmtpPort      string `json:"smtpPort"`
	SmtpUserName  string `json:"smtpUserName"`
	SmptPassword  string `json:"smtpPassword"`
	SmtpFrom      string `json:"smtpFrom"`
	CaptchaSecret string `json:"hcaptchaSecret"`
	Domain        string `json:"domain"`
}

type hCaptchaResponse struct {
	Success     bool     `json:"success"`
	ChallengeTS string   `json:"challenge_ts"` // timestamp
	Hostname    string   `json:"hostname"`     // site's domain
	ErrorCodes  []string `json:"error-codes"`  // optional errors
}

var appConfig *Config = nil

func GetExecDir() string {
	execPath, err := os.Executable()
	if err != nil {
		fmt.Println("Error getting path to executable:", err)
		log.Fatal(err)
	}
	return filepath.Dir(execPath) + "/"
}

func Uuid() string {
	return uuid.New().String()
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GetConfig() (*Config, error) {
	if appConfig != nil {
		return appConfig, nil
	} else {
		data, err := os.ReadFile(GetExecDir() + "config.json")
		if err != nil {
			return nil, err
		}

		err = json.Unmarshal(data, &appConfig)
		if err != nil {
			return nil, err
		}
		return appConfig, nil
	}
}

func VerifyCaptcha(captchaResponce string) (bool, error) {
	config, err := GetConfig()
	if err != nil {
		return false, err
	}

	resp, err := http.PostForm("https://hcaptcha.com/siteverify",
		url.Values{
			"secret":   {config.CaptchaSecret},
			"response": {captchaResponce},
		})

	if err != nil {
		return false, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	var hCaptcha hCaptchaResponse
	if err := json.Unmarshal(body, &hCaptcha); err != nil {
		return false, err
	}

	return hCaptcha.Success, nil
}
