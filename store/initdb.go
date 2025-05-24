package store

import (
	"os"
	"todopp/util"

	_ "github.com/mattn/go-sqlite3"
)

func InitDatabase(dbPath string) error {
	db, err := OpenDb(dbPath)
	if err != nil {
		return err
	}
	defer db.Close()

	sqlScript, err := os.ReadFile(util.GetExecDir() + "sql/init_tables.sql")
	if err != nil {
		return err
	}

	err = ExecScript(db, string(sqlScript))
	if err != nil {
		return err
	}

	//Create a default user if the users table is empty
	if isEmptyUsers, err := IsEmptyUsers(db); err != nil {
		return err
	} else if isEmptyUsers {
		passwordHash, err := util.HashPassword("ToDo++")
		if err != nil {
			return err
		}
		var user User

		user.UserId = util.Uuid()
		user.Name = "guest"
		user.Login = "guest"
		user.PasswordHash = passwordHash

		err = InsertUser(db, user)
		if err != nil {
			return err
		}
	}

	//Generate projects for users without existing projects
	rows, err := db.Query(`
		SELECT u.user_id
		FROM user u 
		WHERE NOT EXISTS(SELECT 1 FROM project p WHERE p.user_id = u.user_id);`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var projectsToAdd []Project

	for rows.Next() {
		var userId string
		err = rows.Scan(&userId)
		if err != nil {
			return err
		}
		var project Project
		project.ProjectId = util.Uuid()
		project.Name = ""
		project.Sequence = 0
		project.UserId = userId
		projectsToAdd = append(projectsToAdd, project)
	}

	for _, project := range projectsToAdd {
		err = InsertProject(db, project)
		if err != nil {
			return err
		}
	}
	rows.Close()

	//Generate Task Groups for Projects Without Existing Task Groups
	rows, err = db.Query(`
		SELECT p.project_id
		FROM project p 
		WHERE NOT EXISTS(SELECT 1 FROM task_group g WHERE g.project_id = p.project_id);`)
	if err != nil {
		return err
	}
	defer rows.Close()

	var taskGroupsToAdd []TaskGroup
	var projectId string

	for rows.Next() {
		err = rows.Scan(&projectId)
		if err != nil {
			return err
		}
		var taskGroup TaskGroup
		taskGroup.TaskGroupId = util.Uuid()
		taskGroup.Name = ""
		taskGroup.IsDefault = true
		taskGroup.Sequence = 0
		taskGroup.ProjectId = projectId
		taskGroupsToAdd = append(taskGroupsToAdd, taskGroup)
	}

	for _, taskGroup := range taskGroupsToAdd {
		err = InsertTaskGroup(db, taskGroup)
		if err != nil {
			return err
		}
	}

	//Init task status

	return err
}
