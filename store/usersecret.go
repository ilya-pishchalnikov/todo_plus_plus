package store

import (
	"database/sql"
	"errors"
	"time"
)

type UserSecret struct {
	UserId string
	Secret string
	Expire int64
	Target string
}

func InsertUserSecret(db *sql.DB, userSecret UserSecret) error {

	_, err := db.Exec(`
	INSERT INTO user_secret (
			user_id, 
			secret, 
			expire, 
			target) 
	VALUES (?, ?, ?, ?)`,
		userSecret.UserId,
		userSecret.Secret,
		userSecret.Expire,
		userSecret.Target)

	return err
}

func GetUserIdBySecret(db *sql.DB, secret string) (string, error) {
	var user_id string
	err := db.QueryRow("SELECT user_id FROM user_secret WHERE secret = ?", secret).Scan(&user_id)
	return user_id, err
}

func ValidateSecret(db *sql.DB, secret string) (*string, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM user_secret WHERE secret = ?)", secret).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("email confirmation required. The confirmation code you entered is invalid")
	}

	var userId, target string
	var expire int64
	err = db.QueryRow("SELECT user_id, expire, target FROM user_secret WHERE secret = ?", secret).Scan(&userId, &expire, &target)
	if err != nil {
		return nil, err
	}

	if target != "register" && target != "password_reset" {
		return nil, errors.New("email confirmation required. The confirmation code you entered is invalid")
	}

	if expire < time.Now().UnixMilli() {
		return nil, errors.New("email confirmation required. The confirmation code you entered is expired")
	}

	if !IsUserExists(db, userId) {
		return nil, errors.New("user doesn't exists")
	}

	if target == "register" {

		if IsUserActive(db, userId) {
			return nil, errors.New("user already activated")
		}

		err = ActivateUser(db, userId)
		if err != nil {
			return nil, err
		}

		_, err = db.Exec(`DELETE FROM user_secret WHERE secret = ?`, secret)
		if err != nil {
			return nil, err
		}
	}

	return &target, nil
}
