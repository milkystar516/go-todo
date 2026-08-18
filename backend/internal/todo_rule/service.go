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

func (s *Service) Validator(ctx context.Context, ruleID int64) (*ContentValidator, error) {
	s.mu.RLock()
	validator, ok := s.validators[ruleID]
	s.mu.RUnlock()

	if ok {
		return validator, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if validator, ok := s.validators[ruleID]; ok {
		return validator, nil
	}

	var fields []FieldDefinition

	err := s.db.QueryRow(
		ctx,
		"SELECT fields FROM todo_rule WHERE id = $1",
		ruleID,
	).Scan(&fields)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrRuleNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("load todo rule %d: %w", ruleID, err)
	}

	validator, err = Compile(fields)
	if err != nil {
		return nil, fmt.Errorf("compile stored todo rule %d: %w", ruleID, err)
	}

	s.validators[ruleID] = validator

	return validator, nil
}

func (s *Service) CreateTodoRule(ctx context.Context, ruleName string, fields []FieldDefinition) (ruleResponse, error) {
	validator, err := Compile(fields)
	if err != nil {
		return ruleResponse{}, err
	}

	var rule ruleResponse

	err = s.db.QueryRow(
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
		return ruleResponse{}, fmt.Errorf("update todo rule: %w", err)
	}

	s.mu.Lock()
	s.validators[rule.ID] = validator
	s.mu.Unlock()

	return rule, nil
}

func (s *Service) UpdateTodoRule(ctx context.Context, ruleID int64, ruleName string, fields []FieldDefinition) error {
	validator, err := Compile(fields)
	if err != nil {
		return err
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	result, err := s.db.Exec(
		ctx,
		"UPDATE todo_rule SET rule_name = $1, fields = $2 WHERE id = $3",
		ruleName,
		fields,
		ruleID,
	)
	if err != nil {
		return fmt.Errorf("update todo rule: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrRuleNotFound
	}

	s.validators[ruleID] = validator

	return nil
}
