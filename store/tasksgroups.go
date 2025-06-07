package store

import (
	"database/sql"
	"errors"
)

type TaskGroup struct {
	TaskGroupId string `json:"id"`
	Name        string `json:"name"`
	Sequence    int    //`json:"sequence"`
	ProjectId   string `json:"projectid"`
	Tasks       []Task `json:"tasks"`
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
	INSERT INTO task_group (task_group_id, name, sequence,project_id) 
	VALUES (?, ?, ?, ?, ?)`,
		taskGroup.TaskGroupId, taskGroup.Name, taskGroup.Sequence, taskGroup.ProjectId)

	return err
}

func GetTaskGroups(db *sql.DB, projectId string) ([]TaskGroup, error) {
	rows, err := db.Query(`
		SELECT task_group_id, name, sequence, project_id
		FROM task_group 
		WHERE project_id = ?
		ORDER BY sequence
		`, projectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var taskGroups []TaskGroup
	for rows.Next() {
		var taskGroup TaskGroup
		err = rows.Scan(&taskGroup.TaskGroupId, &taskGroup.Name, &taskGroup.Sequence, &taskGroup.ProjectId)
		if err != nil {
			return nil, err
		}

		tasks, err := GetTasksByGroup(db, taskGroup.TaskGroupId)
		if err != nil {
			return nil, err
		}
		taskGroup.Tasks = tasks

		taskGroups = append(taskGroups, taskGroup)
	}
	return taskGroups, nil
}

func UpsertTaskGroup(db *sql.DB, taskGroup TaskGroup) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task_group WHERE task_group_id = ?)", taskGroup.TaskGroupId).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = db.Exec("INSERT INTO task_group (task_group_id, name, sequence, project_id) VALUES (?, ?, ?, ?)",
			taskGroup.TaskGroupId, taskGroup.Name, taskGroup.Sequence, taskGroup.ProjectId)
		if err != nil {
			return err
		}
	} else {
		_, err = db.Exec(`
			UPDATE task_group
			SET name = ?,
				sequence = ?,
				project_id = ?
			WHERE task_group_id = ?`,
			taskGroup.Name, taskGroup.Sequence, taskGroup.ProjectId, taskGroup.TaskGroupId)
		if err != nil {
			return err
		}
	}

	return nil
}

func DeleteTaskGroup(db *sql.DB, taskGroupId string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task_group WHERE task_group_id = ?)", taskGroupId).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("A group with ID '" + taskGroupId + "' is not registered")
	}

	_, err = db.Exec(`DELETE FROM task where task_group_id = ?;`, taskGroupId)
	if err != nil {
		return err
	}

	_, err = db.Exec(`DELETE FROM task_group where task_group_id = ?;`, taskGroupId)
	if err != nil {
		return err
	}

	return nil
}
