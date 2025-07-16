package store

import (
	"database/sql"
	"errors"

	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	UserId       string
	Name         string
	Login        string
	PasswordHash string
	Email        string
	IsActive     int
}

func IsEmptyUsers(db *sql.DB) (bool, error) {
	return IsTableEmpty(db, "user")
}

func InsertUser(db *sql.DB, user User) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE user_id = ?)", user.UserId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A user with ID '" + user.UserId + "' is already registered")
	}

	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE login = ?)", user.Login).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A login '" + user.Login + "' is already registered")
	}

	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE email = ?)", user.Email).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A email '" + user.Email + "' is already registered")
	}

	_, err = db.Exec(`
	INSERT INTO user (
			user_id, 
			name, 
			login, 
			password_hash, 
			email, 
			is_active) 
	VALUES (?, ?, ?, ?, ?, ?)`,
		user.UserId,
		user.Name,
		user.Login,
		user.PasswordHash,
		user.Email,
		user.IsActive)

	return err
}

func UpsertUser(db *sql.DB, user User) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE user_id = ?)", user.UserId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		_, err = db.Exec(`
		UPDATE user 
		SET 
			 name = ?
		   , login = ?
		   , password_hash = ? 
		   , email = ?
		   , is_active = ?
		WHERE user_id = ?`,
			user.Name, user.Login, user.PasswordHash, user.UserId, user.Email, user.IsActive)

		return err
	} else {

		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE login = ?)", user.Login).Scan(&exists)

		if err != nil {
			return err
		}

		if exists {
			return errors.New("A login '" + user.Login + "' is already registered")
		}

		_, err = db.Exec(`
		INSERT INTO user (user_id, name, login, password_hash, email, is_active) 
		VALUES (?, ?, ?, ?, ?, ?)`,
			user.UserId, user.Name, user.Login, user.PasswordHash, user.Email, user.IsActive)

		return err
	}
}

func DeleteUser(db *sql.DB, userId string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE user_id = ?)", userId).Scan(&exists)

	if err != nil {
		return err
	}

	if !exists {
		return errors.New("A user with ID '" + userId + "' is not registered")
	}

	_, err = db.Exec(`DELETE FROM user WHERE user_id = ?`, userId)

	return err
}
func GetUserPasswordHashByLogin(db *sql.DB, login string) (string, error) {
	var exists int
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE login = ?)", login).Scan(&exists)
	if err != nil {
		return "", err
	}
	if !(exists == 1) {
		return "", errors.New("Login '" + login + "' is invalid")
	}

	var password_hash string
	err = db.QueryRow("SELECT password_hash FROM user WHERE login = ?", login).Scan(&password_hash)
	return password_hash, err
}

func GetUserIdByLogin(db *sql.DB, login string) (string, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE login = ?)", login).Scan(&exists)
	if err != nil {
		return "", err
	}
	if !exists {
		return "", nil
	}

	var userId string
	err = db.QueryRow("SELECT user_id FROM user WHERE login = ?", login).Scan(&userId)
	return userId, err
}

func ValidateUserRegistration(db *sql.DB, login string, email string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE login = ?)", login).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("user login already registered")
	}

	err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE email = ?)", email).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("email already registered")
	}
	return nil
}

func IsUserExistsAndActive(db *sql.DB, login string) bool {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE is_active = 1 and login = ?)", login).Scan(&exists)
	if err != nil {
		return false
	}
	return exists
}

func ActivateUser(db *sql.DB, userId string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE user_id = ?)", userId).Scan(&exists)

	if exists {
		_, err = db.Exec(`
		UPDATE user 
		SET 
			 is_active = 1
		WHERE user_id = ?`,
			userId)

		return err
	} else {
		return errors.New("User is not exists")
	}
}

func IsUserActive(db *sql.DB, userId string) bool {
	var isActive bool
	err := db.QueryRow("SELECT isActive FROM user WHERE user_id = ?)", userId).Scan(&isActive)
	if err != nil {
		return false
	}
	return isActive
}

func IsUserExists(db *sql.DB, userId string) bool {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user WHERE user_id = ?)", userId).Scan(&exists)
	if err != nil {
		return false
	}
	return exists
}
