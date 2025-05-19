package util

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

func GetExecDir() string {
	execPath, err := os.Executable()
	if err != nil {
		fmt.Println("Error getting path to executable:", err)
		log.Fatal(err)
	}
	return filepath.Dir(execPath) + "/"
}
