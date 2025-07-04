package mail

import (
	"crypto/tls"
	"fmt"
	"net/smtp"
	"strings"
	"time"
	"todopp/util"
)

func SendMail(smtpTo string, mailSubject string, plainTextBody string, htmlBody string) error {
	config, err := util.GetConfig()
	if err != nil {
		return err
	}
	to := []string{smtpTo}

	// Generate a boundary string
	boundary := "----=_NextPart_" + fmt.Sprintf("%x", time.Now().UnixNano())

	// Construct the multipart message
	var msg strings.Builder
	msg.WriteString("From: " + config.SmtpFrom + "\r\n")
	msg.WriteString("To: " + to[0] + "\r\n")
	msg.WriteString("Subject: " + mailSubject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n")
	msg.WriteString("\r\n") // Empty line to end headers

	// Plain text part
	msg.WriteString("--" + boundary + "\r\n")
	msg.WriteString("Content-Type: text/plain; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(plainTextBody + "\r\n")

	// HTML part
	msg.WriteString("--" + boundary + "\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	msg.WriteString("Content-Transfer-Encoding: 7bit\r\n")
	msg.WriteString("\r\n")
	msg.WriteString(htmlBody + "\r\n")

	// End boundary
	msg.WriteString("--" + boundary + "--\r\n")

	// Authentication
	auth := smtp.PlainAuth("", config.SmtpUserName, config.SmptPassword, config.SmtpHost)

	// Connect to the SMTP server
	client, err := smtp.Dial(config.SmtpHost + ":" + config.SmtpPort)
	if err != nil {
		return fmt.Errorf("failed to dial SMTP server: %v", err)
	}
	defer client.Close()

	// Start TLS
	if err = client.StartTLS(&tls.Config{ServerName: config.SmtpHost}); err != nil {
		return fmt.Errorf("failed to start TLS: %v", err)
	}

	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("authentication failed: %v", err)
	}

	// Set the sender and recipient
	if err = client.Mail(config.SmtpFrom); err != nil {
		return fmt.Errorf("failed to set sender: %v", err)
	}
	if err = client.Rcpt(to[0]); err != nil {
		return fmt.Errorf("failed to set recipient: %v", err)
	}

	// Send the email body
	w, err := client.Data()
	if err != nil {
		return fmt.Errorf("failed to get data writer: %v", err)
	}
	defer w.Close()

	_, err = w.Write([]byte(msg.String()))
	if err != nil {
		return fmt.Errorf("failed to write message: %v", err)
	}

	return nil
}
