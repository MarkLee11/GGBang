-- === File: supabase/migrations/20250812_ensure_join_requests_message_and_unique.sql ===

-- 确保 message 列存在
ALTER TABLE public.join_requests
ADD COLUMN IF NOT EXISTS message text;

-- 确保唯一键 (event_id, requester_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uq_join_requests_event_requester'
  ) THEN
    CREATE UNIQUE INDEX uq_join_requests_event_requester
    ON public.join_requests (event_id, requester_id);
  END IF;
END $$;
