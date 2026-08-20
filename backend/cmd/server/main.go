package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/milkystar516/go-todo/backend/internal/auth"
	"github.com/milkystar516/go-todo/backend/internal/config"
	"github.com/milkystar516/go-todo/backend/internal/logging"
	"github.com/milkystar516/go-todo/backend/internal/postgres"
	"github.com/milkystar516/go-todo/backend/internal/todo"
	todorule "github.com/milkystar516/go-todo/backend/internal/todo_rule"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		slog.Error("invalid configuration", "error", err)
		return
	}

	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	slog.SetDefault(logging.New(cfg.LogLevel))

	db, err := postgres.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("failed to open pgsql", "error", err)
		return
	}
	defer db.Close()

	apiMux := http.NewServeMux()

	authHandler := auth.NewHandler(db, auth.Config{
		CookieName: cfg.SessionCookieName,
		SessionTTL: cfg.SessionTTL,
		Secure:     cfg.SessionSecure,
	})
	authHandler.RegisterRoutes(apiMux)

	ruleService := todorule.NewService(db)

	todoRuleHandler := todorule.NewHandler(ruleService)
	todoRuleHandler.RegisterRoutes(apiMux, authHandler.RequireAuth, authHandler.RequireAdmin)

	todoHandler := todo.NewHandler(db, ruleService)
	todoHandler.RegisterRoutes(apiMux, authHandler.RequireAuth)

	mux := http.NewServeMux()
	mux.Handle("/api/", http.StripPrefix("/api", apiMux))

	addr := fmt.Sprintf("%s:%d", cfg.Host, cfg.Port)
	crossOriginProtection := http.NewCrossOriginProtection()

	server := &http.Server{
		Addr:              addr,
		Handler:           crossOriginProtection.Handler(mux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	slog.Info("server listening", "address", "http://"+addr)

	serveErr := make(chan error, 1)

	go func() {
		serveErr <- server.ListenAndServe()
	}()
	select {
	case err := <-serveErr:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server stopped unexpectedly", "error", err)
		}
		return

	case <-ctx.Done():
		slog.Info("shutting down server")
	}

	shutdownCtx, cancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)

		if closeErr := server.Close(); closeErr != nil {
			slog.Error("forced server close failed", "error", closeErr)
		}
	}
}
