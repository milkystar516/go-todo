package config

import (
	"fmt"
	"log/slog"
	"time"

	"github.com/caarlos0/env/v11"
	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string `env:"DATABASE_URL,required,notEmpty"`

	Host string `env:"APP_HOST" envDefault:"127.0.0.1"`
	Port int    `env:"APP_PORT" envDefault:"8080" validate:"gte=1,lte=65535"`

	LogLevel slog.Level `env:"LOG_LEVEL" envDefault:"INFO"`

	SessionCookieName string        `env:"SESSION_COOKIE_NAME" envDefault:"go_todo_session"`
	SessionTTL        time.Duration `env:"SESSION_TTL" envDefault:"24h" validate:"gt=0"`
	SessionSecure     bool          `env:"SESSION_SECURE" envDefault:"false"`
}

func Load() (Config, error) {
	_ = godotenv.Load("../.env")

	cfg, err := env.ParseAs[Config]()
	if err != nil {
		return Config{}, fmt.Errorf("load config: %w", err)
	}

	if err := validator.New().Struct(cfg); err != nil {
		return Config{}, fmt.Errorf("validate config: %w", err)
	}

	return cfg, nil
}
