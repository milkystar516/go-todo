create table users (
    id                  bigserial primary key,
    username            varchar(50) unique not null,
    nickname            varchar(50),
    password_hash       text
);

create table todos (
    id                  bigserial primary key,
    owner_id            bigint references users(id) on delete cascade,
    title               varchar(255) not null,
    created_at          timestamptz not null,
    completed_at        timestamptz
);