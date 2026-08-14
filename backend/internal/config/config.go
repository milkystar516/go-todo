package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Host        string
	Port        string

	SessionCookieName string
	SessionTTL        time.Duration
	SessionSecure     bool
}

func Load() Config {
	godotenv.Load("../.env")

	ttlHours, _ := strconv.Atoi(os.Getenv("SESSION_TTL_HOURS"))
	sessionSecure, _ := strconv.ParseBool(os.Getenv("SESSION_SECURE"))

	return Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Host:        os.Getenv("APP_HOST"),
		Port:        os.Getenv("APP_PORT"),

		SessionCookieName: os.Getenv("SESSION_COOKIE_NAME"),
		SessionTTL:        time.Duration(ttlHours) * time.Hour,
		SessionSecure:     sessionSecure,
	}
}
