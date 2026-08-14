package main

import (
	"context"
	"log"
	"net/http"

	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/config"
	"github.com/milkystar516/go-todo/backend/internal/logging"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
	"github.com/milkystar516/go-todo/backend/internal/todo"
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

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: cfg.SessionCookieName,
		SessionTTL: cfg.SessionTTL,
		Secure:     cfg.SessionSecure,
	})
	authHandler.RegisterRoutes(mux)

	todoHandler := todo.NewHandler(db)
	todoHandler.RegisterRoutes(mux, authHandler.RequireAuth)

	addr := cfg.Host + ":" + cfg.Port
	log.Printf("server listening on http://%s", addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		logger.Error("server stopped", "error", err)
	}
}
