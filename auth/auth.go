package auth

import (
	"crypto/rand"
	"errors"
	"fmt"
	"time"
	"todopp/store"
	"todopp/util"

	"github.com/golang-jwt/jwt"
)

var jwtKey []byte = nil

func generateHmacKey() ([]byte, error) {

	key := make([]byte, 32) // 32 bytes = 256-bit
	if _, err := rand.Read(key); err != nil {
		return nil, err
	}
	return key, nil
}

func CreateJWTToken(hmacKey []byte, login string) (string, error) {
	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		jwt.MapClaims{
			"login":  login,
			"expire": time.Now().Add(24 * time.Hour).Unix(),
		},
	)
	return token.SignedString([]byte(hmacKey))
}

func VerifyJWTToken(tokenString, hmacKey []byte) (*jwt.Token, error) {
	return jwt.Parse(string(tokenString), func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return hmacKey, nil
	})
}

func GetJwtKey() ([]byte, error) {
	if jwtKey != nil {
		return jwtKey, nil
	}

	config, err := util.GetConfig()
	if err != nil {
		return nil, err
	}

	db, err := store.OpenDb(config.DbPath)
	if err != nil {
		return nil, err
	}

	isEmpty, err := store.IsEmptyjwt(db)
	if err != nil {
		return nil, err
	}
	if isEmpty {
		key, err := generateHmacKey()
		if err != nil {
			return nil, err
		}
		err = store.InsertJwt(db, string(key))
		if err != nil {
			return nil, err
		}
	}

	jwtKeyDb, err := store.GetJwtKey(db)
	return []byte(jwtKeyDb), err
}

func VerifyJwtAndGetLogin(tokenString string) (string, error) {
	jwtkey, err := GetJwtKey()
	if err != nil {
		return "", errors.New("failed to retrieve JWT signing key")
	}

	token, err := VerifyJWTToken([]byte(tokenString), jwtkey)
	if err != nil {
		return "", errors.New("JWT verification failed")
	}

	if !token.Valid {
		return "", errors.New("the provided JWT is invalid")
	}

	var login string

	if claims, ok := token.Claims.(jwt.MapClaims); ok {
		if login, ok = claims["login"].(string); !ok {
			return "", errors.New("the provided JWT is invalid: login claim not provided")
		}

		if expire, ok := claims["expire"].(float64); !ok {
			return "", errors.New("the provided JWT is invalid: expire claim not provided")
		} else if time.Now().Unix() > int64(expire) {
			return "", errors.New("the provided JWT is invalid: expired")
		}
	} else {
		return "", errors.New("the provided JWT is invalid: claims not found")
	}
	return login, nil
}
