create table if not exists public.mail_outbox (
  id bigserial primary key,
  kind text not null,
  to_email text not null,
  payload jsonb not null,
  status text not null default 'pending',
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_mail_outbox_status on public.mail_outbox(status);
