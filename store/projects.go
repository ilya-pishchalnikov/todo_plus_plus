package store

import (
	"database/sql"
	"errors"
)

type Project struct {
	ProjectId string `json:"id"`
	Name      string `json:"name"`
	Sequence  int    `json:"sequence"`
	UserId    string `json:"userid"`
}

func IsEmptyProjects(db *sql.DB) (bool, error) {
	return IsTableEmpty(db, "project")
}

func InsertProject(db *sql.DB, project Project) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM project WHERE project_id = ?)", project.ProjectId).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("A project with ID '" + project.ProjectId + "' is already registered")
	}

	_, err = db.Exec("INSERT INTO project (project_id, name, sequence, user_id) VALUES (?, ?, ?, ?)",
		project.ProjectId, project.Name, project.Sequence, project.UserId)

	return err
}

func GetProjects(db *sql.DB, userId string) ([]Project, error) {
	rows, err := db.Query(`
		SELECT project_id, name, sequence
		FROM project 
		WHERE user_id = ?
		ORDER BY sequence
		`, userId)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var project Project
		err = rows.Scan(&project.ProjectId, &project.Name, &project.Sequence)
		if err != nil {
			return nil, err
		}
		project.UserId = userId
		projects = append(projects, project)
	}

	return projects, nil
}

func GetProjectsFromId(db *sql.DB, userId string, fromProjectId string) ([]Project, error) {
	startSequence := -9007199254740991
	if fromProjectId != "" {
		err := db.QueryRow(`
			SELECT sequence
			FROM project 
			WHERE project_id = ?
			`, fromProjectId).Scan(&startSequence)
		if err != nil {
			return nil, err
		}
	}

	rows, err := db.Query(`
		SELECT project_id, name, sequence
		FROM project 
		WHERE user_id = ?
		  AND sequence >= ?
		ORDER BY sequence
		`, userId, startSequence)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var project Project
		err = rows.Scan(&project.ProjectId, &project.Name, &project.Sequence)
		if err != nil {
			return nil, err
		}
		project.UserId = userId
		projects = append(projects, project)
	}

	return projects, nil
}

func UpdateProject(db *sql.DB, project Project) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM project WHERE project_id = ?)", project.ProjectId).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("A project with ID '" + project.ProjectId + "' is not registered")
	}

	_, err = db.Exec(`
		UPDATE project
		SET name = ?,
			sequence = ?,
			user_id = ?
		WHERE project_id = ?`,
		project.Name, project.Sequence, project.UserId, project.ProjectId)

	return err
}

func UpsertProject(db *sql.DB, project Project) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM project WHERE project_id = ?)", project.ProjectId).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		_, err = db.Exec("INSERT INTO project (project_id, name, sequence, user_id) VALUES (?, ?, ?, ?)",
			project.ProjectId, project.Name, project.Sequence, project.UserId)
		if err != nil {
			return err
		}
	} else {
		_, err = db.Exec(`
			UPDATE project
			SET name = ?,
				sequence = ?,
				user_id = ?
			WHERE project_id = ?`,
			project.Name, project.Sequence, project.UserId, project.ProjectId)
		if err != nil {
			return err
		}
	}

	return nil
}

func DeleteProject(db *sql.DB, projectId string) error {
	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM project WHERE project_id = ?)", projectId).Scan(&exists)
	if err != nil {
		return err
	}
	if !exists {
		return errors.New("A project with ID '" + projectId + "' is not registered")
	}

	_, err = db.Exec(`
	DELETE FROM task
	where EXISTS (
			SELECT 1
			FROM task_group g
			WHERE task.task_group_id = g.task_group_id
			  AND g.project_id = ?
		);`,
		projectId)
	if err != nil {
		return err
	}

	_, err = db.Exec(`DELETE FROM task_group where project_id = ?;`, projectId)
	if err != nil {
		return err
	}

	_, err = db.Exec(`DELETE FROM project where project_id = ?;`, projectId)
	if err != nil {
		return err
	}

	return nil
}
