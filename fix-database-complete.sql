-- 完整的数据库修复脚本
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 检查并创建 join_requests 表
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'join_requests') THEN
    RAISE NOTICE 'Creating join_requests table...';
    
    CREATE TABLE join_requests (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      message TEXT,
      note TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, requester_id)
    );

    -- 创建索引
    CREATE INDEX idx_join_requests_event_id ON join_requests(event_id);
    CREATE INDEX idx_join_requests_requester_id ON join_requests(requester_id);
    CREATE INDEX idx_join_requests_status ON join_requests(status);
    CREATE INDEX idx_join_requests_composite ON join_requests(event_id, requester_id);
    CREATE INDEX idx_join_requests_status_event_id ON join_requests(status, event_id);

    -- 启用 RLS
    ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

    -- 创建 RLS 策略
    -- 用户可以创建自己的 join request
    CREATE POLICY "jr_insert" ON join_requests
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = requester_id);

    -- 用户可以查看自己的 join request
    CREATE POLICY "jr_select_mine" ON join_requests
      FOR SELECT TO authenticated
      USING (auth.uid() = requester_id);

    -- 活动主办方可以查看活动的所有 join request
    CREATE POLICY "jr_select_for_host" ON join_requests
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM events e 
          WHERE e.id = join_requests.event_id 
          AND e.user_id = auth.uid()
        )
      );

    -- 活动主办方可以更新 join request 状态
    CREATE POLICY "jr_update_status_by_host" ON join_requests
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM events e 
          WHERE e.id = join_requests.event_id 
          AND e.user_id = auth.uid()
        )
      );

    -- 创建 updated_at 触发器
    CREATE OR REPLACE FUNCTION update_join_requests_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER update_join_requests_updated_at
      BEFORE UPDATE ON join_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_join_requests_updated_at();

    RAISE NOTICE 'join_requests table created successfully!';
  ELSE
    RAISE NOTICE 'join_requests table already exists';
  END IF;
END $$;

-- 2. 检查并创建 event_attendees 表
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_attendees') THEN
    RAISE NOTICE 'Creating event_attendees table...';
    
    CREATE TABLE event_attendees (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );

    -- 创建索引
    CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
    CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
    CREATE INDEX idx_event_attendees_composite ON event_attendees(event_id, user_id);

    -- 启用 RLS
    ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

    -- 创建 RLS 策略
    -- 用户可以查看自己参加的活动
    CREATE POLICY "ea_select_mine" ON event_attendees
      FOR SELECT TO authenticated
      USING (auth.uid() = user_id);

    -- 活动主办方可以查看活动的所有参与者
    CREATE POLICY "ea_select_for_host" ON event_attendees
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM events e 
          WHERE e.id = event_attendees.event_id 
          AND e.user_id = auth.uid()
        )
      );

    -- 系统可以插入参与者记录（通过 Edge Functions 或 RLS 策略）
    CREATE POLICY "ea_insert_system" ON event_attendees
      FOR INSERT TO authenticated
      WITH CHECK (true);

    RAISE NOTICE 'event_attendees table created successfully!';
  ELSE
    RAISE NOTICE 'event_attendees table already exists';
  END IF;
END $$;

-- 3. 检查并添加 note 字段到 join_requests 表（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'join_requests' AND column_name = 'note') THEN
    RAISE NOTICE 'Adding note column to join_requests table...';
    ALTER TABLE join_requests ADD COLUMN note TEXT;
    RAISE NOTICE 'note column added successfully!';
  ELSE
    RAISE NOTICE 'note column already exists in join_requests table';
  END IF;
END $$;

-- 4. 检查并添加 joined_at 字段到 event_attendees 表（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'event_attendees' AND column_name = 'joined_at') THEN
    RAISE NOTICE 'Adding joined_at column to event_attendees table...';
    ALTER TABLE event_attendees ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    RAISE NOTICE 'joined_at column added successfully!';
  ELSE
    RAISE NOTICE 'joined_at column already exists in event_attendees table';
  END IF;
END $$;

-- 5. 验证表结构
SELECT 
  'join_requests' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'join_requests'
ORDER BY ordinal_position;

SELECT 
  'event_attendees' as table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_attendees'
ORDER BY ordinal_position;

-- 6. 验证 RLS 策略
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('join_requests', 'event_attendees')
ORDER BY tablename, policyname;
