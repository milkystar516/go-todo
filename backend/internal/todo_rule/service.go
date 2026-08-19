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

	err := tx.QueryRow(
		ctx,
		`SELECT fields FROM todo_rule WHERE id = @rule_id
		FOR SHARE`,
		pgx.StrictNamedArgs{
			"rule_id": ruleID,
		},
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

	rows, err := s.db.Query(
		ctx,
		`INSERT INTO todo_rule(rule_name, fields)
		VALUES (@rule_name, @fields)
		RETURNING `+ruleResponseColumns,
		pgx.StrictNamedArgs{
			"rule_name": ruleName,
			"fields":    fields,
		},
	)
	if err != nil {
		return ruleResponse{}, fmt.Errorf("create todo rule: %w", err)
	}

	rule, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ruleResponse])
	if err != nil {
		return ruleResponse{}, fmt.Errorf("create todo rule: %w", err)
	}

	return rule, nil
}

func (s *Service) ListTodoRules(ctx context.Context) ([]ruleResponse, error) {
	rows, err := s.db.Query(
		ctx,
		`SELECT `+ruleResponseColumns+` FROM todo_rule
		ORDER BY id`,
	)
	if err != nil {
		return nil, fmt.Errorf("list todo rules: %w", err)
	}

	rules, err := pgx.CollectRows(rows, pgx.RowToStructByName[ruleResponse])
	if err != nil {
		return nil, fmt.Errorf("list todo rules: %w", err)
	}

	return rules, nil
}

func (s *Service) GetTodoRule(ctx context.Context, ruleID int64) (ruleDetailResponse, error) {
	rows, err := s.db.Query(
		ctx,
		`SELECT `+ruleDetailResponseColumns+`
		FROM todo_rule
		WHERE id = @rule_id`,
		pgx.StrictNamedArgs{
			"rule_id": ruleID,
		},
	)
	if err != nil {
		return ruleDetailResponse{}, fmt.Errorf("get todo rule: %w", err)
	}

	rule, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ruleDetailResponse])
	if errors.Is(err, pgx.ErrNoRows) {
		return ruleDetailResponse{}, ErrRuleNotFound
	}
	if err != nil {
		return ruleDetailResponse{}, fmt.Errorf("get todo rule: %w", err)
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
				`SELECT 1 FROM todo_rule WHERE id = @rule_id
				FOR NO KEY UPDATE`,
				pgx.StrictNamedArgs{
					"rule_id": ruleID,
				},
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
						WHERE rule.id = @rule_id

						EXCEPT

						SELECT new_field ->> 'key'
						FROM jsonb_array_elements(@fields::jsonb) AS new_field
					) AS keys
				)
				UPDATE todos
				SET content = content - deleted.keys
				FROM deleted
				WHERE todos.rule_id = @rule_id AND cardinality(deleted.keys) > 0`,
				pgx.StrictNamedArgs{
					"rule_id": ruleID,
					"fields":  fields,
				},
			)
			if err != nil {
				return fmt.Errorf("prune removed todo fields: %w", err)
			}

			rows, err := tx.Query(
				ctx,
				`UPDATE todo_rule 
				 SET rule_name = @rule_name, fields = @fields
				 WHERE id = @rule_id
				 RETURNING `+ruleResponseColumns,
				pgx.StrictNamedArgs{
					"rule_name": ruleName,
					"fields":    fields,
					"rule_id":   ruleID,
				},
			)
			if err != nil {
				return fmt.Errorf("update todo rule: %w", err)
			}

			rule, err = pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ruleResponse])
			if err != nil {
				return fmt.Errorf("update todo rule: %w", err)
			}

			return nil
		},
	)
	if err != nil {
		return ruleResponse{}, err
	}

	s.mu.Lock()
	delete(s.validators, ruleID)
	s.mu.Unlock()

	return rule, nil
}

func (s *Service) UpdateTodoRuleTitle(ctx context.Context, ruleID int64, ruleName string) (ruleResponse, error) {
	rows, err := s.db.Query(
		ctx,
		`UPDATE todo_rule
		SET rule_name = @rule_name
		WHERE id = @rule_id
		RETURNING `+ruleResponseColumns,
		pgx.StrictNamedArgs{
			"rule_name": ruleName,
			"rule_id":   ruleID,
		},
	)
	if err != nil {
		return ruleResponse{}, fmt.Errorf("update todo rule title: %w", err)
	}

	rule, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[ruleResponse])
	if errors.Is(err, pgx.ErrNoRows) {
		return ruleResponse{}, ErrRuleNotFound
	}
	if err != nil {
		return ruleResponse{}, fmt.Errorf("update todo rule title: %w", err)
	}

	return rule, nil
}

func (s *Service) DeleteTodoRule(ctx context.Context, ruleID int64) error {
	res, err := s.db.Exec(
		ctx,
		"DELETE FROM todo_rule WHERE id = @rule_id",
		pgx.StrictNamedArgs{
			"rule_id": ruleID,
		},
	)
	if err != nil {
		return fmt.Errorf("delete todo rule: %w", err)
	}

	if res.RowsAffected() == 0 {
		return ErrRuleNotFound
	}

	s.mu.Lock()
	delete(s.validators, ruleID)
	s.mu.Unlock()

	return nil
}
