package store

import (
	"database/sql"
	"errors"
)

type TaskGroup struct {
	TaskGroupId string
	Name        string
	Sequence    int
	IsDefault   bool
	ProjectId   string
}

func IsEmptyTaskGroup(db *sql.DB) (bool, error) {
	return IsTableEmpty(db, "task_group")
}

func InsertTaskGroup(db *sql.DB, taskGroup TaskGroup) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task_group WHERE task_group_id = ?)", taskGroup.TaskGroupId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A task groip with ID '" + taskGroup.TaskGroupId + "' is already registered")
	}

	_, err = db.Exec(`
	INSERT INTO task_group (task_group_id, name, sequence, is_default, project_id) 
	VALUES (?, ?, ?, ?, ?)`,
		taskGroup.TaskGroupId, taskGroup.Name, taskGroup.Sequence, taskGroup.IsDefault, taskGroup.ProjectId)

	return err
}
