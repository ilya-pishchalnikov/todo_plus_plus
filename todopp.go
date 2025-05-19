package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"todopp/util"
	"todopp/web"
)

type Config struct {
	Port    string `json:"port"`
	Cert    string `json:"cert"`
	CertKey string `json:"certKey"`
}

func main() {

	data, err := os.ReadFile(util.GetExecDir() + "config.json")
	if err != nil {
		fmt.Print("Error while reading config.json: ", err)
		log.Fatal(err)
	}

	var config Config

	err = json.Unmarshal(data, &config)
	if err != nil {
		fmt.Print("Error while parsing config.json: ", err)
		log.Fatal(err)
	}

	err = web.StartServer(config.Port, config.Cert, config.CertKey)
	if err != nil {
		fmt.Print("Error while starting web server: ", err)
		log.Fatal(err)
	}
}
