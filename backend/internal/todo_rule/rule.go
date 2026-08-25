package todorule

import "encoding/json"

const DefaultRuleID int64 = 1

type ListColumn struct {
	Pointer string `json:"pointer" validate:"required"`
	Label   string `json:"label" validate:"required"`
}

type RuleDefinition struct {
	ContentSchema json.RawMessage `json:"content_schema" validate:"required"`
	UISchema      json.RawMessage `json:"ui_schema" validate:"required"`
	ListColumns   []ListColumn    `json:"list_columns" validate:"dive"`
}
