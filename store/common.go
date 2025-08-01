package store

import (
	"C"
	"database/sql"
	"strings"

	_ "github.com/mattn/go-sqlite3"
)

func OpenDb(dbPath string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}
	//_, err = db.Exec("PRAGMA read_uncommitted = 1")
	return db, err
}

func IsTableEmpty(db *sql.DB, tableName string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT NOT EXISTS (SELECT 1 FROM " + tableName + " LIMIT 1)").Scan(&exists)
	return exists, err
}

func ExecScript(db *sql.DB, sqlScript string) error {
	queries := strings.Split(string(sqlScript), ";")

	for _, query := range queries {
		query = strings.TrimSpace(query)
		if query == "" {
			continue
		}

		_, err := db.Exec(query)
		if err != nil {
			return err
		}
	}

	return nil
}

func IsTableFieldExists(db *sql.DB, tableName string, fieldName string) (bool, error) {
	var exists bool
	err := db.QueryRow("SELECT EXISTS (SELECT 1 FROM pragma_table_info(?) WHERE name = ? )", tableName, fieldName).Scan(&exists)
	return exists, err
}

func dropField(db *sql.DB, tableName string, fieldName string) error {
	_, err := db.Exec("ALTER TABLE " + tableName + " DROP COLUMN " + fieldName)
	return err
}

func addField(db *sql.DB, tableName string, fieldName string, fieldType string) error {
	_, err := db.Exec("ALTER TABLE " + tableName + " ADD " + fieldName + " " + fieldType)
	return err
}
