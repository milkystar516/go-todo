package todorule

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrRuleNotFound = errors.New("todo rule not found")

type Service struct {
	db         *pgxpool.Pool
	mu         sync.RWMutex
	validators map[int64]*ContentValidator
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{
		db:         db,
		validators: make(map[int64]*ContentValidator),
	}
}

func (s *Service) ValidatorTx(ctx context.Context, tx pgx.Tx, ruleID int64) (*ContentValidator, error) {
	var fields []FieldDefinition

	err := s.db.QueryRow(
		ctx,
		`SELECT fields FROM todo_rule WHERE id = $1
		FOR SHARE`,
		ruleID,
	).Scan(&fields)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRuleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("load todo rule %d: %w", ruleID, err)
	}

	s.mu.RLock()
	validator, ok := s.validators[ruleID]
	s.mu.RUnlock()

	if ok {
		return validator, nil
	}

	validator, err = Compile(fields)
	if err != nil {
		return nil, fmt.Errorf("compile stored todo rule %d: %w", ruleID, err)
	}

	s.mu.Lock()

	if cached, ok := s.validators[ruleID]; ok {
		validator = cached
	} else {
		s.validators[ruleID] = validator
	}

	s.mu.Unlock()

	return validator, nil
}

func (s *Service) CreateTodoRule(ctx context.Context, ruleName string, fields []FieldDefinition) (ruleResponse, error) {
	if _, err := Compile(fields); err != nil {
		return ruleResponse{}, err
	}

	var rule ruleResponse

	err := s.db.QueryRow(
		ctx,
		`INSERT INTO todo_rule(rule_name, fields)
		VALUES ($1, $2)
		RETURNING id, rule_name`,
		ruleName,
		fields,
	).Scan(
		&rule.ID,
		&rule.RuleName,
	)
	if err != nil {
		return ruleResponse{}, fmt.Errorf("create todo rule: %w", err)
	}

	return rule, nil
}

func (s *Service) UpdateTodoRule(ctx context.Context, ruleID int64, ruleName string, fields []FieldDefinition) (ruleResponse, error) {
	validator, err := Compile(fields)
	if err != nil {
		return ruleResponse{}, err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	var rule ruleResponse

	err = s.db.QueryRow(
		ctx,
		"UPDATE todo_rule SET rule_name = $1, fields = $2 WHERE id = $3",
		ruleName,
		fields,
		ruleID,
	).Scan(
		&rule.ID,
		&rule.RuleName,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return ruleResponse{}, ErrRuleNotFound
	}
	if err != nil {
		return ruleResponse{}, fmt.Errorf("update todo rule: %w", err)
	}

	s.validators[ruleID] = validator

	return rule, nil
}
