package event

import (
	"encoding/json"
	"todopp/auth"
	"todopp/store"
	"todopp/util"
)

type Event struct {
	Type     string          `json:"type"`
	Instance string          `json:"instance"`
	Jwt      string          `json:"jwt"`
	Payload  json.RawMessage `json:"payload"`
}

type ErrorEvent struct {
	Type     string       `json:"type"`
	Instance string       `json:"instance"`
	Jwt      string       `json:"jwt"`
	Payload  ErrorPayload `json:"payload"`
}

type ErrorPayload struct {
	Message string `json:"message"`
}

type TaskPayload struct {
	Id     string `json:"id"`
	Text   string `json:"text"`
	Group  string `json:"group"`
	Status string `json:"status"`
	After  string `json:"after"`
}

type ProjectPayload struct {
	Id    string `json:"id"`
	Name  string `json:"name"`
	After string `json:"after"`
}
type GroupPayload struct {
	Id        string `json:"id"`
	Name      string `json:"name"`
	ProjectId string `json:"projectid"`
	After     string `json:"after"`
}

func GetErrorMessage(message string, instance string) ([]byte, error) {
	errorPayload := ErrorPayload{Message: message}
	errorEvent := ErrorEvent{Type: "error", Instance: instance, Jwt: "", Payload: errorPayload}
	responce, err := json.Marshal(errorEvent)
	return responce, err
}

func ProcessEvent(event Event) error {

	login, err := auth.VerifyJwtAndGetLogin(event.Jwt)
	if err != nil {
		return err
	}

	config, err := util.GetConfig()
	if err != nil {
		return err
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		return err
	}

	userId, err := store.GetUserIdByLogin(db, login)
	if err != nil {
		return err
	}

	switch event.Type {
	case "project-add":
		var projectPayload ProjectPayload
		err := json.Unmarshal(event.Payload, &projectPayload)
		if err != nil {
			return err
		}
		err = upsertProject(db, projectPayload, userId)
		if err != nil {
			return err
		}
	case "project-delete":
		var projectPayload ProjectPayload
		err := json.Unmarshal(event.Payload, &projectPayload)
		if err != nil {
			return err
		}
		err = deleteProject(db, projectPayload)
		if err != nil {
			return err
		}
	case "project-update":
		var projectPayload ProjectPayload
		err := json.Unmarshal(event.Payload, &projectPayload)
		if err != nil {
			return err
		}
		err = upsertProject(db, projectPayload, userId)
		if err != nil {
			return err
		}
	case "group-add":
		var groupPayload GroupPayload
		err := json.Unmarshal(event.Payload, &groupPayload)
		if err != nil {
			return err
		}
		err = upsertGroup(db, groupPayload)
		if err != nil {
			return err
		}
	case "group-delete":
		var groupPayload GroupPayload
		err := json.Unmarshal(event.Payload, &groupPayload)
		if err != nil {
			return err
		}
		err = deleteGroup(db, groupPayload)
		if err != nil {
			return err
		}
	case "group-update":
		var groupPayload GroupPayload
		err := json.Unmarshal(event.Payload, &groupPayload)
		if err != nil {
			return err
		}
		err = upsertGroup(db, groupPayload)
		if err != nil {
			return err
		}
	case "task-add":
		var taskPayload TaskPayload
		err := json.Unmarshal(event.Payload, &taskPayload)
		if err != nil {
			return err
		}
		err = upsertTask(db, taskPayload)
		if err != nil {
			return err
		}
	case "task-delete":
		var taskPayload TaskPayload
		err := json.Unmarshal(event.Payload, &taskPayload)
		if err != nil {
			return err
		}
		err = deleteTask(db, taskPayload)
		if err != nil {
			return err
		}
	case "task-update":
		var taskPayload TaskPayload
		err := json.Unmarshal(event.Payload, &taskPayload)
		if err != nil {
			return err
		}
		err = upsertTask(db, taskPayload)
		if err != nil {
			return err
		}
	}
	return nil
}
