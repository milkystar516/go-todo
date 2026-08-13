create table users (
    id                  bigserial primary key,
    username            varchar(255) unique not null,
    nickname            timestamptz not null,
    encrypted_password  timestamptz
);

create table todos (
    id                  bigserial primary key,
    owner_id            bigint references users(id) on delete cascade,
    title               varchar(255) not null,
    created_at          timestamptz not null,
    completed_at        timestamptz
);