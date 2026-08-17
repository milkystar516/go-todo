CREATE TABLE users (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username            varchar(50) UNIQUE NOT NULL,
    nickname            varchar(50),
    password_hash       text NOT NULL
);

CREATE TABLE sessions (
    token        text PRIMARY KEY,
    user_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   timestamptz NOT NULL
);

CREATE TABLE todos (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id            bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content             jsonb NOT NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz DEFAULT NULL
);

CREATE TABLE todo_rule (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_name           varchar(50) NOT NULL,
    fields              jsonb NOT NULL
);