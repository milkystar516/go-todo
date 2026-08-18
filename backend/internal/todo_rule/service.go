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
	if _, err := Compile(fields); err != nil {
		return ruleResponse{}, err
	}

	var rule ruleResponse

	err := pgx.BeginFunc(
		ctx,
		s.db,
		func(tx pgx.Tx) error {
			var exists int

			err := tx.QueryRow(
				ctx,
				`SELECT 1 FROM todo_rule WHERE id = $1
				FOR NO KEY UPDATE`,
				ruleID,
			).Scan(&exists)
			if errors.Is(err, pgx.ErrNoRows) {
				return ErrRuleNotFound
			}
			if err != nil {
				return fmt.Errorf("lock todo rule for update: %w", err)
			}

			_, err = tx.Exec(
				ctx,
				`WITH deleted AS (
					SELECT ARRAY(
						SELECT old_field ->> 'key'
						FROM todo_rule AS rule
						CROSS JOIN LATERAL
							jsonb_array_elements(rule.fields) AS old_field
						WHERE rule.id = $1

						EXCEPT

						SELECT new_field ->> 'key'
						FROM jsonb_array_elements($2::jsonb) AS new_field
					) AS keys
				)
				UPDATE todos
				SET content = content - deleted.keys
				FROM deleted
				WHERE todos.rule_id = $1 AND cardinality(deleted.keys) > 0`,
				ruleID,
				fields,
			)
			if err != nil {
				return fmt.Errorf("prune removed todo fields: %w", err)
			}

			err = tx.QueryRow(
				ctx,
				`UPDATE todo_rule 
				 SET rule_name = $1, fields = $2
				 WHERE id = $3
				 RETURNING id, rule_name`,
				ruleName,
				fields,
				ruleID,
			).Scan(
				&rule.ID,
				&rule.RuleName,
			)
			if err != nil {
				return fmt.Errorf("update todo rule: %w", err)
			}

			s.mu.Lock()
			delete(s.validators, ruleID)
			s.mu.Unlock()

			return nil
		},
	)
	if err != nil {
		return ruleResponse{}, err
	}

	return rule, nil
}
