package store

import (
	"database/sql"
	"errors"
)

type Project struct {
	ProjectId string
	Name      string
	Sequence  int
	UserId    string
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
