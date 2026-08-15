package todorule

type JSONSchema struct {
	Type                 string                    `json:"type"`
	Properties           map[string]PropertySchema `json:"properties"`
	Required             []string                  `json:"required,omitempty"`
	AdditionalProperties bool                      `json:"additionalProperties"`
}

type PropertySchema struct {
	Type    string   `json:"type"`
	Title   string   `json:"title"`
	Format  string   `json:"format,omitempty"`
	Enum    []string `json:"enum,omitempty"`
	Default any      `json:"default,omitempty"`
}
