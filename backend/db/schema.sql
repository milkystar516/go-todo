CREATE TABLE users (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username            varchar(50) UNIQUE NOT NULL,
    nickname            varchar(50),
    role                varchar(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    password_hash       text NOT NULL
);

CREATE TABLE sessions (
    token        text PRIMARY KEY,
    user_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   timestamptz NOT NULL
);

CREATE TABLE todo_rule (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name           varchar(50) NOT NULL,
    content_schema      jsonb NOT NULL,
    ui_schema           jsonb NOT NULL DEFAULT '{}'::jsonb,
    list_columns        jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE todos (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id            bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_id             bigint NOT NULL REFERENCES todo_rule(id),
    content             jsonb NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz DEFAULT NULL
);

CREATE INDEX todos_owner_id_idx
	ON todos (owner_id);

CREATE INDEX todos_rule_id_idx
	ON todos (rule_id);
