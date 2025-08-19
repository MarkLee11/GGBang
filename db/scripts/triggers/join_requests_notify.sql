create or replace function public.enqueue_join_request_created()
returns trigger
language plpgsql
as $$
declare v_to_email text;
begin
  select u.email into v_to_email
  from public.events e
  join auth.users u on u.id = e.host_id
  where e.id = new.event_id
  limit 1;

  if v_to_email is not null then
    insert into public.mail_outbox(kind, to_email, payload)
    values (
      'join_request_created',
      v_to_email,
      json_build_object(
        'event_id', new.event_id,
        'requester_id', new.requester_id
      )
    );
  end if;
  return new;
end $$;

drop trigger if exists trg_join_request_created on public.join_requests;
create trigger trg_join_request_created
after insert on public.join_requests
for each row execute function public.enqueue_join_request_created();

create or replace function public.enqueue_join_request_decided()
returns trigger
language plpgsql
as $$
declare v_to_email text;
begin
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
    select u.email into v_to_email
    from auth.users u
    where u.id = new.requester_id
    limit 1;

    if v_to_email is not null then
      insert into public.mail_outbox(kind, to_email, payload)
      values (
        'join_request_decided',
        v_to_email,
        json_build_object(
          'event_id', new.event_id,
          'requester_id', new.requester_id,
          'decision', new.status
        )
      );
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_join_request_decided on public.join_requests;
create trigger trg_join_request_decided
after update on public.join_requests
for each row execute function public.enqueue_join_request_decided();
