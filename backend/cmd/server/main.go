package main

import (
	"context"
	"log"
	"net/http"

	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/config"
	"github.com/milkystar516/go-todo/backend/internal/logging"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	logger := logging.New()

	db, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	auth.RegisterRoutes(mux, db)

	addr := cfg.Host + ":" + cfg.Port
	log.Printf("server listening on http://%s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error("server stopped", "error", err)
	}
}
