package todorule

type FieldType string

const (
	FieldShortText    FieldType = "short_text"
	FieldLongText     FieldType = "long_text"
	FieldInteger      FieldType = "integer"
	FieldBoolean      FieldType = "boolean"
	FieldDate         FieldType = "date"
	FieldSingleSelect FieldType = "single_select"
)

type FieldDefintion struct {
	Key          string    `json:"key"`
	Label        string    `json:"label"`
	Type         FieldType `json:"type"`
	Required     bool      `json:"required"`
	ShowInList   bool      `json:"show_in_list"`
	Order        int       `json:"order"`
	DefaultValue any       `json:"default_value,omitempty"`
	Options      []string  `json:"options,omitempty"`
}
