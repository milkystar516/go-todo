package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Host        string
	Port        string

	LogLevel slog.Level

	SessionCookieName string
	SessionTTL        time.Duration
	SessionSecure     bool
}

func Load() (Config, error) {
	godotenv.Load("../.env")

	ttlHours, err := strconv.Atoi(os.Getenv("SESSION_TTL_HOURS"))
	if err != nil || ttlHours <= 0 {
		return Config{}, fmt.Errorf("SESSION_TTL_HOURS must be a positive integer")
	}

	sessionSecure, err := strconv.ParseBool(os.Getenv("SESSION_SECURE"))
	if err != nil {
		return Config{}, fmt.Errorf("SESSION_SECURE must be true or false: %w", err)
	}

	logLevel := slog.LevelInfo
	if value := os.Getenv("LOG_LEVEL"); value != "" {
		if err := logLevel.UnmarshalText([]byte(value)); err != nil {
			return Config{}, fmt.Errorf("invalid LOG_LEVEL %q: %w", value, err)
		}
	}

	return Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Host:        os.Getenv("APP_HOST"),
		Port:        os.Getenv("APP_PORT"),

		LogLevel: logLevel,

		SessionCookieName: os.Getenv("SESSION_COOKIE_NAME"),
		SessionTTL:        time.Duration(ttlHours) * time.Hour,
		SessionSecure:     sessionSecure,
	}
}
