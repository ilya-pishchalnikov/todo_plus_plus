package event

import (
	"database/sql"
	"todopp/store"
)

func upsertTask(db *sql.DB, task TaskPayload) error {
	var storeTask store.Task

	storeTask.TaskId = task.Id
	storeTask.Name = task.Text
	storeTask.TaskGroupId = task.Group
	storeTask.Sequence = -2

	err := store.UpsertTask(db, storeTask)
	if err != nil {
		return err
	}

	tasks, err := store.GetTasksByGroup(db, task.Group)
	if err != nil {
		return err
	}

	currentTaskIndex := -1
	prevTaskIndex := -1

	for index, task_i := range tasks {
		if task.Id == task_i.TaskId {
			currentTaskIndex = index
		}
		if task.After == task_i.TaskId {
			prevTaskIndex = index
		}
	}

	// insert new project into position prevProjectIndex
	if currentTaskIndex == -1 {
		tasks = append(tasks, storeTask)
		copy(tasks[prevTaskIndex+1:len(tasks)-1], tasks[prevTaskIndex:len(tasks)-2])
		tasks[prevTaskIndex+1] = storeTask
	}
	// move new project to position prevProjectIndex
	if currentTaskIndex > -1 && prevTaskIndex > 0 {
		copy(tasks[currentTaskIndex:prevTaskIndex], tasks[currentTaskIndex+1:prevTaskIndex+1])
		tasks[prevTaskIndex] = storeTask
	}

	for sequence, task_i := range tasks {
		if task_i.Sequence != sequence {
			task_i.Sequence = sequence
			err = store.UpsertTask(db, task_i)
			if err != nil {
				return err
			}
		}
	}
	return nil
}

func deleteTask(db *sql.DB, task TaskPayload) error {
	return store.DeleteTask(db, task.Id)
}
