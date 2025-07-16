package mail

import (
	"crypto/tls"
	"fmt"
	"net/mail"
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

	// Extract just the email for SMTP MAIL FROM command
	fromEmail := extractEmailAddress(config.SmtpFrom)
	if fromEmail == "" {
		return fmt.Errorf("invalid From address format")
	}

	// Generate a boundary string
	boundary := "----=_NextPart_" + fmt.Sprintf("%x", time.Now().UnixNano())

	// Construct the multipart message
	var msg strings.Builder
	msg.WriteString("From: " + config.SmtpFrom + "\r\n") // Keep full format ("ToDo++ Application <todoppmail@yandex.ru>")
	msg.WriteString("To: " + to[0] + "\r\n")
	msg.WriteString("Subject: " + mailSubject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: multipart/alternative; boundary=\"" + boundary + "\"\r\n")
	msg.WriteString("\r\n")

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

	// SMTP Auth
	auth := smtp.PlainAuth("", config.SmtpUserName, config.SmptPassword, config.SmtpHost)

	// Connect to SMTP server
	client, err := smtp.Dial(config.SmtpHost + ":" + config.SmtpPort)
	if err != nil {
		return fmt.Errorf("failed to dial SMTP server: %v", err)
	}
	defer client.Close()

	// Start TLS
	if err = client.StartTLS(&tls.Config{ServerName: config.SmtpHost}); err != nil {
		return fmt.Errorf("failed to start TLS: %v", err)
	}

	// Authenticate
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("authentication failed: %v", err)
	}

	// Set MAIL FROM (only email, no display name)
	if err = client.Mail(fromEmail); err != nil {
		return fmt.Errorf("failed to set sender: %v", err)
	}

	// Set RCPT TO
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

func SendConfirmationEmail(email string, token string) error {
	config, err := util.GetConfig()
	if err != nil {
		return err
	}

	confirmationLink := fmt.Sprintf("https://"+config.Domain+"/login.html?secret_token=%s", token)

	htmlBody := fmt.Sprintf(`
	<!DOCTYPE html>
	<html>
	<head>
		<style>
			.button {
				background-color: #ff4444;
				color: white;
				padding: 12px 24px;
				text-align: center;
				text-decoration: none;
				display: inline-block;
				font-size: 16px;
				margin: 4px 2px;
				cursor: pointer;
				border-radius: 4px;
				border: none;
    			transition: background 0.3s;
			}
			button:hover {
				background: darkred;
			}
			.container {
				max-width: 600px;
				margin: 0 auto;
				font-family: Arial, sans-serif;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<h2>Email Confirmation</h2>
			<p>Please click the button below to confirm your email address:</p>
			<a href="%s" class="button">Confirm Email</a>
			<p>Or copy this link to your browser: %s</p>
		</div>
	</body>
	</html>
	`, confirmationLink, confirmationLink)

	textBody := fmt.Sprintf("Please confirm your email by visiting this link:\n%s", confirmationLink)

	subject := "Confirm Your Email"

	return SendMail(email, subject, textBody, htmlBody)
}

func ParseAddress(address string) (*mail.Address, error) {
	return mail.ParseAddress(address)
}

func extractEmailAddress(fullFrom string) string {
	start := strings.LastIndex(fullFrom, "<")
	end := strings.LastIndex(fullFrom, ">")

	if start != -1 && end != -1 && end > start {
		return strings.TrimSpace(fullFrom[start+1 : end])
	}

	return strings.TrimSpace(fullFrom)
}
