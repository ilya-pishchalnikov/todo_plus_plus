package store

import "database/sql"

type Event struct {
	EventId  string
	UtcTime  int64
	UserId   string
	Payload  string
	Responce string
	IsError  int
}

func InsertEvent(db *sql.DB, event Event) error {
	_, err := db.Exec(`
	INSERT INTO event (event_id, utc_time, user_id, payload, responce, is_error) 
	VALUES (?, ?, ?, ?, ?, ?)`,
		event.EventId, event.UtcTime, event.UserId, event.Payload, event.Responce, event.IsError)

	return err
}
