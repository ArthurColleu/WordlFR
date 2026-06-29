create table if not exists daily_words (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  word varchar(5) not null,
  created_at timestamptz default now()
);

alter table daily_words enable row level security;

-- No public read/write policy is created on purpose: only the service-role
-- key (used exclusively in server-side Route Handlers) can access this table.
-- The service role bypasses RLS entirely, so no policy is required for it.
