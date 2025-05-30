package store

import (
	"database/sql"
	"errors"
)

func IsEmptyjwt(db *sql.DB) (bool, error) {
	return IsTableEmpty(db, "jwt")
}

func InsertJwt(db *sql.DB, jwt_key string) error {

	isEmpty, err := IsEmptyjwt(db)
	if err != nil {
		return err
	}

	if !isEmpty {
		_, err = db.Exec("DELETE FROM jwt")
		if err != nil {
			return err
		}
	}

	_, err = db.Exec("INSERT INTO jwt (jwt_key) VALUES (?)", jwt_key)

	return err
}

func GetJwtKey(db *sql.DB) (string, error) {
	isEmpty, err := IsEmptyjwt(db)
	if err != nil {
		return "", err
	}

	if isEmpty {
		return "", errors.New("Jwt key not defined")
	}

	var jwt_key string
	err = db.QueryRow("SELECT jwt_key FROM jwt LIMIT 1;").Scan(&jwt_key)

	return jwt_key, err
}
