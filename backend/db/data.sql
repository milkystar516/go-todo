INSERT INTO users (username, nickname, role, password_hash)
VALUES (
    'testuser',
    'test_name',
    'admin',
    '$2a$10$UWK1WiMB.RTxce1FaZXHvOqYz23IzlSNIs8UxVLHg1MsV3FqmPUjG'
);

INSERT INTO todo_rule (id, rule_name, content_schema, ui_schema, list_columns)
OVERRIDING SYSTEM VALUE
VALUES (
    1,
    'Checklist',
    $json$
    {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Checklist",
        "type": "object",
        "properties": {
            "items": {
                "title": "Items",
                "type": "array",
                "default": [],
                "items": {
                    "type": "object",
                    "properties": {
                        "text": {
                            "title": "Item",
                            "type": "string",
                            "minLength": 1
                        },
                        "completed": {
                            "title": "Completed",
                            "type": "boolean",
                            "default": false
                        }
                    },
                    "required": ["text", "completed"],
                    "additionalProperties": false
                }
            }
        },
        "additionalProperties": false
    }
    $json$::jsonb,
    $json$
    {
        "items": {
            "ui:options": {
                "addable": true,
                "copyable": true,
                "orderable": true,
                "removable": true
            },
            "items": {
                "text": {
                    "ui:placeholder": "Checklist item"
                },
                "completed": {
                    "ui:widget": "checkbox"
                }
            }
        }
    }
    $json$::jsonb,
    '[]'::jsonb
);

ALTER TABLE todo_rule ALTER COLUMN id RESTART WITH 2;
