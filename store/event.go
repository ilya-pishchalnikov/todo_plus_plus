package store

import "database/sql"

type Event struct {
	EventId  string
	UtcTime  int64
	UserId   string
	Payload  string
	Response string
	IsError  int
}

func InsertEvent(db *sql.DB, event Event) error {
	_, err := db.Exec(`
	INSERT INTO event (event_id, utc_time, user_id, payload, response, is_error) 
	VALUES (?, ?, ?, ?, ?, ?)`,
		event.EventId, event.UtcTime, event.UserId, event.Payload, event.Response, event.IsError)

	return err
}
