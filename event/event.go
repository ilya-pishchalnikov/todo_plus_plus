package event

import "encoding/json"

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
	Id    string `json:"id"`
	Text  string `json:"text"`
	Group string `json:"group"`
	After string `json:"after"`
}

func GetErrorMessage(message string, instance string) ([]byte, error) {
	errorPayload := ErrorPayload{Message: message}
	errorEvent := ErrorEvent{Type: "error", Instance: instance, Jwt: "", Payload: errorPayload}
	responce, err := json.Marshal(errorEvent)
	return responce, err
}

func ProcessEvent(event Event) error {
	switch event.Type {
	case "task-add":
		var taskPayload TaskPayload
		err := json.Unmarshal(event.Payload, &taskPayload)
		if err != nil {
			addTask(taskPayload)
			return err
		}

		break
	}
	return nil
}
