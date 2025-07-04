package util

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Config struct {
	Port         string `json:"port"`
	Cert         string `json:"cert"`
	CertKey      string `json:"certKey"`
	DbPath       string `json:"dbPath"`
	SmtpHost     string `json:"smtpHost"`
	SmtpPort     string `json:"smtpPort"`
	SmtpUserName string `json:"smtpUserName"`
	SmptPassword string `json:"smtpPassword"`
	SmtpFrom     string `json:"smtpFrom"`
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
