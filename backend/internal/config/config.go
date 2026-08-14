package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Host        string
	Port        string
}

func Load() Config {
	godotenv.Load("../.env")

	return Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Host:        os.Getenv("APP_HOST"),
		Port:        os.Getenv("APP_PORT"),
	}
}
