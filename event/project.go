package event

import (
	"database/sql"
	"todopp/store"
)

func upsertProject(db *sql.DB, project ProjectPayload, userId string) error {
	var storeProject store.Project

	storeProject.ProjectId = project.Id
	storeProject.Name = project.Name
	storeProject.UserId = userId
	storeProject.Sequence = -2

	err := store.UpsertProject(db, storeProject)
	if err != nil {
		return err
	}

	projects, err := store.GetProjects(db, userId)
	if err != nil {
		return err
	}

	currentProjectIndex := -1
	prevProjectIndex := -1

	for index, project_i := range projects {
		if project.Id == project_i.ProjectId {
			currentProjectIndex = index
		}
		if project.After == project_i.ProjectId {
			prevProjectIndex = index
		}
	}

	// insert new project into position prevProjectIndex
	if currentProjectIndex == -1 {
		projects = append(projects, storeProject)
		copy(projects[prevProjectIndex+1:len(projects)-1], projects[prevProjectIndex:len(projects)-2])
		projects[prevProjectIndex+1] = storeProject
	}
	// move new project to position prevProjectIndex
	if currentProjectIndex > -1 && prevProjectIndex > 0 {
		copy(projects[currentProjectIndex:prevProjectIndex], projects[currentProjectIndex+1:prevProjectIndex+1])
		projects[prevProjectIndex] = storeProject
	}

	for sequence, project_i := range projects {
		if project_i.Sequence != sequence {
			project_i.Sequence = sequence
			err = store.UpdateProject(db, project_i)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func deleteProject(db *sql.DB, project ProjectPayload) error {
	err := store.DeleteProject(db, project.Id)
	return err
}
