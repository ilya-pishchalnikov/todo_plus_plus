package store

import (
	"database/sql"
	"encoding/json"
	"errors"
)

type Task struct {
	TaskId       string `json:"id"`
	Name         string `json:"text"`
	Sequence     int    //`json:"sequence"`
	TaskStatusId int    `json:"status"`
	TaskGroupId  string `json:"group"`
}

func InsertTask(db *sql.DB, task Task) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task WHERE task_id = ?)", task.TaskId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		return errors.New("A task with ID '" + task.TaskId + "' is already registered")
	}

	_, err = db.Exec(`
	INSERT INTO task (task_id, name, sequence, task_status_id, task_group_id) 
	VALUES (?, ?, ?, ?, ?)`,
		task.TaskId, task.Name, task.Sequence, task.TaskStatusId, task.TaskGroupId)

	return err
}

func UpsertTask(db *sql.DB, task Task) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task WHERE task_id = ?)", task.TaskId).Scan(&exists)

	if err != nil {
		return err
	}

	if exists {
		_, err = db.Exec(`
			UPDATE task 
			SET
				name = ?,
				Sequence = ?,
				task_status_id = ?,
				task_group_id = ?
			WHERE task_id = ?`,
			task.Name, task.Sequence, task.TaskStatusId, task.TaskGroupId, task.TaskId)
		return err
	} else {

		_, err = db.Exec(`
			INSERT INTO task (task_id, name, sequence, task_status_id, task_group_id) 
			VALUES (?, ?, ?, ?, ?)`,
			task.TaskId, task.Name, task.Sequence, task.TaskStatusId, task.TaskGroupId)

		return err
	}
}

func DeleteTask(db *sql.DB, taskId string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM task WHERE task_id = ?)", taskId).Scan(&exists)

	if err != nil {
		return err
	}

	if !exists {
		return errors.New("A task with ID '" + taskId + "' is not registered")
	}

	_, err = db.Exec(`DELETE FROM task WHERE task_id = ?`, taskId)
	return err
}

func GetTasksByProject(db *sql.DB, ProjectId string) ([]Task, error) {
	rows, err := db.Query(`
		SELECT t.task_id, t.name, t.task_group_id, t.task_status_id
		FROM task t 
		INNER JOIN task_group g ON g.task_group_id = t.task_group_id
		WHERE g.project_id = ?
		ORDER BY t.sequence
		`, ProjectId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		err = rows.Scan(&task.TaskId, &task.Name, &task.TaskGroupId, &task.TaskStatusId)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

func GetTasksByGroup(db *sql.DB, groupId string) ([]Task, error) {
	rows, err := db.Query(`
		SELECT t.task_id, t.name, t.task_group_id, t.task_status_id
		FROM task t 
		WHERE t.task_group_id = ?
		ORDER BY t.sequence
		`, groupId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []Task
	for rows.Next() {
		var task Task
		err = rows.Scan(&task.TaskId, &task.Name, &task.TaskGroupId, &task.TaskStatusId)
		if err != nil {
			return nil, err
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

func GetTasksToJson(db *sql.DB, projectId string, jsonFormat string) ([]byte, error) {

	switch jsonFormat {
	case "flat":
		tasks, err := GetTasksByProject(db, projectId)
		if err != nil {
			return nil, err
		}
		var jsonData []byte

		if len(tasks) == 0 {
			jsonData = []byte("[]")
		} else {
			jsonData, err = json.Marshal(tasks)
			if err != nil {
				return nil, err
			}
		}
		return jsonData, nil
	case "grouped":
		taskgroups, err := GetTaskGroups(db, projectId)
		if err != nil {
			return nil, err
		}
		jsonData, err := json.Marshal(taskgroups)
		if err != nil {
			return nil, err
		}
		return jsonData, nil
	default:
		return nil, errors.New("The json format '" + jsonFormat + "' is currently not implemented")
	}
}

func UpdateTasksFromJson(db *sql.DB, jsonTasks []byte, projectId string, jsonFormat string) error {
	if jsonFormat == "flat" {

		sequence := 0
		var tasks []Task

		err := json.Unmarshal(jsonTasks, &tasks)
		if err != nil {
			return err
		}

		for _, task := range tasks {
			task.Sequence = sequence
			sequence++
			if task.TaskGroupId == "" {
				return errors.New("Task group id for task id = '" + task.TaskId + "' not defined")
			}
			if task.TaskStatusId == 0 {
				task.TaskStatusId = 1
			}

			err = UpsertTask(db, task)
			if err != nil {
				return err
			}
		}

		savedTasks, err := GetTasksByProject(db, projectId)
		if err != nil {
			return err
		}

		lookup := make(map[string]bool, len(tasks))
		for _, elem := range tasks {
			lookup[elem.TaskId] = true
		}

		for _, task := range savedTasks {
			if _, ok := lookup[task.TaskId]; !ok {
				err = DeleteTask(db, task.TaskId)
				if err != nil {
					return err
				}
			}
		}

		return nil
	} else {
		return errors.New("The json format '" + jsonFormat + "' is currently not implemented")
	}
}

func GetTask(db *sql.DB, taskId string) (*Task, error) {

	var task Task

	err := db.QueryRow(`
		SELECT t.task_id, t.name, t.task_group_id, t.task_status_id
		FROM task t
		WHERE t.taskId = ?
		LIMIT 1
		`, taskId).Scan(&task.TaskId, &task.Name, &task.TaskGroupId, &task.TaskStatusId)

	return &task, err
}
