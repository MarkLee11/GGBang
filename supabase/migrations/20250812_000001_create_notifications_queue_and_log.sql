-- === File: supabase/migrations/20250812_000001_create_notifications_queue_and_log.sql ===

-- 1) 枚举类型（若不存在则创建）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notify_kind') THEN
    CREATE TYPE notify_kind AS ENUM ('request_created', 'approved', 'rejected', 'location_unlocked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notify_status') THEN
    CREATE TYPE notify_status AS ENUM ('queued', 'processing', 'sent', 'failed');
  END IF;
END $$;

-- 2) 通知队列表（由触发器写入；worker 消费）
CREATE TABLE IF NOT EXISTS public.notifications_queue (
  id              BIGSERIAL PRIMARY KEY,
  kind            notify_kind        NOT NULL,
  event_id        BIGINT,                         -- 相关活动
  join_request_id BIGINT,                         -- 相关 join_requests
  requester_id    UUID,                           -- 申请者
  user_id         UUID,                           -- 主办方
  -- 可选附加信息（JSON，避免改表）：如 hostNote、时间戳、标题等
  payload         JSONB             NOT NULL DEFAULT '{}'::jsonb,

  status          notify_status      NOT NULL DEFAULT 'queued',
  attempts        INT                NOT NULL DEFAULT 0,
  last_error      TEXT,
  created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ        NOT NULL DEFAULT now()
);

-- 3) 发送日志表（审计、重放）
CREATE TABLE IF NOT EXISTS public.notifications_log (
  id                    BIGSERIAL PRIMARY KEY,
  queue_id              BIGINT REFERENCES public.notifications_queue(id) ON DELETE SET NULL,

  kind                  notify_kind       NOT NULL,
  event_id              BIGINT,
  join_request_id       BIGINT,
  recipient_user_id     UUID,                           -- 收件人 userId（若可识别）
  recipient_email       TEXT,                           -- 实际发送邮箱
  subject               TEXT            NOT NULL,
  body                  TEXT            NOT NULL,
  ai_used               BOOLEAN         NOT NULL DEFAULT FALSE,

  provider              TEXT,                           -- 'resend'
  provider_message_id   TEXT,
  status                notify_status    NOT NULL,      -- 'sent' / 'failed'
  error                 TEXT,

  created_at            TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- 4) 索引
CREATE INDEX IF NOT EXISTS idx_nq_status_created ON public.notifications_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_nq_kind ON public.notifications_queue(kind);
CREATE INDEX IF NOT EXISTS idx_nq_event ON public.notifications_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_nq_jr ON public.notifications_queue(join_request_id);

CREATE INDEX IF NOT EXISTS idx_nl_recipient ON public.notifications_log(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_nl_event ON public.notifications_log(event_id);
CREATE INDEX IF NOT EXISTS idx_nl_kind ON public.notifications_log(kind);
CREATE INDEX IF NOT EXISTS idx_nl_created ON public.notifications_log(created_at DESC);

-- 5) RLS
ALTER TABLE public.notifications_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log  ENABLE ROW LEVEL SECURITY;

-- 队列表和日志表均不面向前端开放；不创建 SELECT/INSERT 策略。
-- Edge Functions 使用 service role，天然绕过 RLS。

-- 6) 维护 updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_updated_at_nq ON public.notifications_queue;
CREATE TRIGGER trg_touch_updated_at_nq
BEFORE UPDATE ON public.notifications_queue
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
