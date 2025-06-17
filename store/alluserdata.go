package store

import "database/sql"

type AllData struct {
	Projects []Project   `json:"projects"`
	Groups   []TaskGroup `json:"groups"`
	Tasks    []Task      `json:"tasks"`
}

func GetAllUserData(db *sql.DB, userId string) (AllData, error) {
	projects, err := GetProjects(db, userId)
	if err != nil {
		return AllData{}, err
	}

	groups, err := GetTaskGroupsByUser(db, userId)
	if err != nil {
		return AllData{}, err
	}

	tasks, err := GetTasksByUser(db, userId)
	if err != nil {
		return AllData{}, err
	}

	var allData AllData

	allData.Projects = projects
	allData.Groups = groups
	allData.Tasks = tasks

	return allData, nil
}
