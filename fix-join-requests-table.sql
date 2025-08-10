-- 修复 join_requests 表缺失问题
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 检查 join_requests 表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'join_requests') THEN
    RAISE NOTICE 'join_requests 表不存在，正在创建...';
    
    -- 创建 join_requests 表
    CREATE TABLE join_requests (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      message TEXT,
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

    RAISE NOTICE 'join_requests 表创建完成！';
  ELSE
    RAISE NOTICE 'join_requests 表已存在';
  END IF;
END $$;

-- 2. 检查 event_attendees 表是否存在
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_attendees') THEN
    RAISE NOTICE 'event_attendees 表不存在，正在创建...';
    
    -- 创建 event_attendees 表
    CREATE TABLE event_attendees (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(event_id, user_id)
    );

    -- 创建索引
    CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
    CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);

    -- 启用 RLS
    ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

    -- 创建 RLS 策略
    -- 用户可以查看自己参与的活动
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

    -- 只有系统可以插入/更新/删除（通过 Edge Functions）
    CREATE POLICY "ea_system_only" ON event_attendees
      FOR ALL TO authenticated
      USING (false)
      WITH CHECK (false);

    RAISE NOTICE 'event_attendees 表创建完成！';
  ELSE
    RAISE NOTICE 'event_attendees 表已存在';
  END IF;
END $$;

-- 3. 验证表结构
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('join_requests', 'event_attendees')
ORDER BY table_name, ordinal_position;

-- 4. 验证 RLS 策略
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
