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
		project.Name = "Project1"
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
	err = rows.Close()
	if err != nil {
		return err
	}

	//Remove unused field task_group.default if exists
	if exists, err := IsTableFieldExists(db, "task_group", "is_default"); err != nil {
		return err
	} else if exists {
		err = dropField(db, "task_group", "is_default")
		if err != nil {
			return err
		}
	}

	//Add user.email field if not exists
	if exists, err := IsTableFieldExists(db, "user", "email"); err != nil {
		return err
	} else if !exists {
		err = addField(db, "user", "email", "text")
		if err != nil {
			return err
		}
	}

	//Add user.is_active field if not exists
	if exists, err := IsTableFieldExists(db, "user", "is_active"); err != nil {
		return err
	} else if !exists {
		err = addField(db, "user", "is_active", "int")
		if err != nil {
			return err
		}
	}

	return err
}
