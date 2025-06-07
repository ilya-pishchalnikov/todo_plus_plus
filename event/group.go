package event

import (
	"database/sql"
	"todopp/store"
)

func upsertGroup(db *sql.DB, group GroupPayload) error {
	var storeGroup store.TaskGroup

	storeGroup.TaskGroupId = group.Id
	storeGroup.Name = group.Name
	storeGroup.ProjectId = group.ProjectId
	storeGroup.Tasks = nil
	storeGroup.Sequence = -2

	err := store.UpsertTaskGroup(db, storeGroup)
	if err != nil {
		return err
	}

	groups, err := store.GetTaskGroups(db, group.ProjectId)
	if err != nil {
		return err
	}

	currentTaskGroupIndex := -1
	prevTaskGroupIndex := -1

	for index, group_i := range groups {
		if group.Id == group_i.TaskGroupId {
			currentTaskGroupIndex = index
		}
		if group.After == group_i.TaskGroupId {
			prevTaskGroupIndex = index
		}
	}

	// insert new project into position prevProjectIndex
	if currentTaskGroupIndex == -1 {
		groups = append(groups, storeGroup)
		copy(groups[prevTaskGroupIndex+1:len(groups)-1], groups[prevTaskGroupIndex:len(groups)-2])
		groups[prevTaskGroupIndex+1] = storeGroup
	}
	// move new project to position prevProjectIndex
	if currentTaskGroupIndex > -1 && prevTaskGroupIndex > 0 {
		copy(groups[currentTaskGroupIndex:prevTaskGroupIndex], groups[currentTaskGroupIndex+1:prevTaskGroupIndex+1])
		groups[prevTaskGroupIndex] = storeGroup
	}

	for sequence, group_i := range groups {
		if group_i.Sequence != sequence {
			group_i.Sequence = sequence
			err = store.UpsertTaskGroup(db, group_i)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func deleteGroup(db *sql.DB, group GroupPayload) error {
	err := store.DeleteTaskGroup(db, group.Id)
	return err
}
