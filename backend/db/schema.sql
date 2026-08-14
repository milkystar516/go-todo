CREATE TABLE users (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username            varchar(50) UNIQUE NOT NULL,
    nickname            varchar(50),
    password_hash       text
);

CREATE TABLE todos (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id            bigint REFERENCES users(id) ON DELETE CASCADE,
    title               varchar(255) NOT NULL,
    created_at          timestamptz NOT NULL,
    completed_at        timestamptz
);

CREATE TABLE sessions (
    token        text PRIMARY KEY,
    user_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at   timestamptz NOT NULL
);