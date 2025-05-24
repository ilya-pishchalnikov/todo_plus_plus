package store

import (
	"database/sql"
	"errors"
	"strconv"
)

type TaskStatus struct {
	TaskStatusId int
	Name         string
}

func IsEmptyTaskStatus(db *sql.DB) (bool, error) {
	return IsTableEmpty(db, "task_status")
}

func InsertTaskStatus(db *sql.DB, taskStatus TaskStatus) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task_status WHERE task_status_id = ?)", taskStatus.TaskStatusId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A task status with ID '" + strconv.Itoa(taskStatus.TaskStatusId) + "' is already registered")
	}

	_, err = db.Exec(`
	INSERT INTO task_status (task_status_id, name) 
	VALUES (?, ?)`,
		taskStatus.TaskStatusId, taskStatus.Name)

	return err
}
