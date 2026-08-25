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

CREATE TABLE todo_lists (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                varchar(50) NOT NULL,
    default_rule_id     bigint NOT NULL DEFAULT 1 CONSTRAINT todo_lists_default_rule_id_fkey REFERENCES todo_rule(id)
);

CREATE TABLE todo_list_members (
    list_id             uuid NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
    user_id             bigint NOT NULL CONSTRAINT todo_list_members_user_id_fkey REFERENCES users(id) ON DELETE CASCADE,
    role                varchar(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'owner')),
    PRIMARY KEY (list_id, user_id)
);

CREATE INDEX todo_list_members_user_id_idx
    ON todo_list_members (user_id);

CREATE TABLE todos (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id            bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id             uuid NOT NULL REFERENCES todo_lists(id) ON DELETE CASCADE,
    rule_id             bigint NOT NULL DEFAULT 1 REFERENCES todo_rule(id),
    title               varchar(200) NOT NULL CHECK (char_length(title) >= 1),
    due_at              timestamptz DEFAULT NULL,
    content             jsonb NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz DEFAULT NULL
);

CREATE INDEX todos_owner_id_idx
	ON todos (owner_id);

CREATE INDEX todos_rule_id_idx
	ON todos (rule_id);

CREATE INDEX todos_list_id_idx
    ON todos (list_id);
