package main

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/config"
	"github.com/milkystar516/go-todo/backend/internal/logging"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
	"github.com/milkystar516/go-todo/backend/internal/todo"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	slog.SetDefault(logging.New())

	db, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to open pgsql", "error", err)
		return
	}
	defer db.Close()

	mux := http.NewServeMux()
	mux.Handle("/api/", http.StripPrefix("/api", apiMux))

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: cfg.SessionCookieName,
		SessionTTL: cfg.SessionTTL,
		Secure:     cfg.SessionSecure,
	})
	authHandler.RegisterRoutes(mux)

	ruleService := todorule.NewService(db)

	todoRuleHandler := todorule.NewHandler(ruleService)
	todoRuleHandler.RegisterRoutes(mux, authHandler.RequireAuth, authHandler.RequireAdmin)

	todoHandler := todo.NewHandler(db, ruleService)
	todoHandler.RegisterRoutes(mux, authHandler.RequireAuth)

	addr := cfg.Host + ":" + cfg.Port
	slog.Info("server listening", "address", "http://"+addr)

	if err := http.ListenAndServe(addr, mux); err != nil {
		slog.Error("server stopped", "error", err)
	}
}
