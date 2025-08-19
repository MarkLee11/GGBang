select *
from http(
  (
    'POST',
    'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger',
    array[
      ('content-type','application/json')::http_header,
      ('apikey','REPLACE_WITH_ANON_KEY')::http_header,
      ('authorization','Bearer ' || vault.get_secret('CRON_SECRET'))::http_header
    ],
    convert_to('{"type":"approved","payload":{"foo":"bar"}}','UTF8')::bytea,
    'application/json'
  )::http_request
);
