package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"todopp/store"
	"todopp/util"
	"todopp/web"
)

func main() {
	appConfig, err := util.GetConfig()

	// // command line attributes variables
	// var userSet *bool
	// var userDelete *bool
	// var userName *string
	// var userLogin *string
	// var userPassword *string

	// parse command line attributes
	if len(os.Args) > 0 {
		userSet := flag.Bool("user", false, "Input user data mode")
		userDelete := flag.Bool("delete", false, "Input user data mode")
		userName := flag.String("name", "", "User name")
		userLogin := flag.String("login", "", "User login")
		userPassword := flag.String("password", "", "User password")

		flag.Parse()

		if userSet != nil && *userSet && (userDelete == nil || !*userDelete) {
			if userName == nil || *userName == "" {
				fmt.Println("User name must be defined")
			}
			if userLogin == nil || *userLogin == "" {
				fmt.Println("User login must be defined")
			}
			if userPassword == nil || *userPassword == "" {
				fmt.Println("User password must be defined")
			}
		}

		if userSet != nil && *userSet && userDelete != nil && *userDelete {
			if userLogin == nil || *userLogin == "" {
				fmt.Println("User login must be defined")
			}
		}

		if userSet != nil && *userSet && (userDelete == nil || !*userDelete) {
			db, err := store.OpenDb(appConfig.DbPath)
			if err != nil {
				fmt.Print("Error opening database: ", err)
				log.Fatal(err)
			}
			defer db.Close()

			passwordHash, err := util.HashPassword(*userPassword)
			if err != nil {
				fmt.Print("Error hashing password: ", err)
				log.Fatal(err)
			}

			userId, err := store.GetUserIdByLogin(db, *userLogin)
			if err != nil {
				fmt.Print("Error getting user id by login: ", err)
				log.Fatal(err)
			}
			var user store.User

			if userId != "" {
				user.UserId = userId
			} else {
				user.UserId = util.Uuid()
			}
			user.Name = *userName
			user.Login = *userLogin
			user.PasswordHash = passwordHash

			err = store.UpsertUser(db, user)
			if err != nil {
				fmt.Print("Error storing user: ", err)
				log.Fatal(err)
			}

			return
		}

		if userSet != nil && *userSet && userDelete != nil && *userDelete {
			db, err := store.OpenDb(appConfig.DbPath)
			if err != nil {
				fmt.Print("Error opening database: ", err)
				log.Fatal(err)
			}
			defer db.Close()

			userId, err := store.GetUserIdByLogin(db, *userLogin)
			if err != nil {
				fmt.Print("Error getting user id by login: ", err)
				log.Fatal(err)
			}

			err = store.DeleteUser(db, userId)
			if err != nil {
				fmt.Print("Error deleting user: ", err)
				log.Fatal(err)
			}
			return
		}
	}

	err = store.InitDatabase(appConfig.DbPath)
	if err != nil {
		fmt.Print("Error while initializing database: ", err)
		log.Fatal(err)
	}

	err = web.StartServer(appConfig.Port, appConfig.Cert, appConfig.CertKey)
	if err != nil {
		fmt.Print("Error while starting web server: ", err)
		log.Fatal(err)
	}
}
