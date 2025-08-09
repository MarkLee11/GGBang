/*
  # Category Constraints Migration
  
  Goal: 在不动 auth.users 的前提下，补齐"资料 + 申请-审核"所需表与字段，
        并把所有用户外键统一成 UUID → auth.users(id)。
  
  This migration ensures:
  1. All required tables exist (profiles, join_requests)
  2. Events table has all required extensions
  3. Event_attendees has proper UUID foreign keys
  4. Category is restricted to exactly 6 values
*/

-- 1) 确保 profiles 表存在（与 auth.users 一一对应）
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  display_name TEXT,
  profile_images TEXT[],         -- 多图URL
  bio TEXT,
  age INT CHECK (age BETWEEN 18 AND 99),
  city TEXT,
  country TEXT,
  interests TEXT[],              -- ["dance","karaoke","travel"]
  preferences TEXT[],            -- ["friends","clubbing","low-key"]
  height_cm INT,
  weight_kg INT,
  body_type TEXT,
  relationship_status TEXT,
  hiv_status TEXT,               -- 敏感，默认不公开
  prep_usage BOOLEAN,            -- 敏感，默认不公开
  last_online TIMESTAMP,
  social_links JSONB             -- {"instagram":"...", "twitter":"..."}
);

-- 2) 确保 join_requests 表存在
CREATE TABLE IF NOT EXISTS join_requests (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  waitlist BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(event_id, requester_id)
);

-- 3) 扩展 events 表（如果列不存在则添加）
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 6 CHECK (capacity BETWEEN 2 AND 12),
  ADD COLUMN IF NOT EXISTS privacy TEXT CHECK (privacy IN ('public','link','invite')) DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS place_hint TEXT,
  ADD COLUMN IF NOT EXISTS place_exact TEXT,
  ADD COLUMN IF NOT EXISTS place_exact_visible BOOLEAN DEFAULT FALSE;

-- 4) 确保 event_attendees 表有正确的结构
DO $$
BEGIN
  -- 检查 user_id 列是否存在且为 UUID 类型
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_attendees' 
    AND column_name = 'user_id' 
    AND data_type = 'uuid'
  ) THEN
    -- 重建表以确保正确的结构
    DROP TABLE IF EXISTS event_attendees CASCADE;
    
    CREATE TABLE event_attendees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id BIGINT REFERENCES events(id) ON DELETE CASCADE,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now(),
      UNIQUE(event_id, user_id)
    );
  END IF;
END $$;

-- 5) 添加类目约束（限制为6个指定分类）
DO $$
BEGIN
  -- 移除现有的 category 约束（如果存在）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'events' 
    AND constraint_name = 'events_category_check'
  ) THEN
    ALTER TABLE events DROP CONSTRAINT events_category_check;
  END IF;
  
  -- 添加新的严格类目约束
  ALTER TABLE events
    ADD CONSTRAINT events_category_check
    CHECK (category IN ('Bar','Club','Festival','Social Meetup','Home Party','Other'));
END $$;

-- 6) 创建索引以提升性能
CREATE INDEX IF NOT EXISTS idx_join_requests_event_id ON join_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_requester_id ON join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id ON event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON event_attendees(user_id);

-- 7) 确保触发器函数存在
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- 8) 为各表创建 updated_at 触发器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_join_requests_updated_at ON join_requests;
CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_attendees_updated_at ON event_attendees;
CREATE TRIGGER update_event_attendees_updated_at
  BEFORE UPDATE ON event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9) 数据清理：更新不符合新约束的category值
UPDATE events 
SET category = 'Other' 
WHERE category NOT IN ('Bar','Club','Festival','Social Meetup','Home Party','Other');

-- 10) 确保RLS策略存在
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
ON profiles FOR ALL
TO authenticated
USING (auth.uid() = user_id);

-- Join requests RLS policies
DROP POLICY IF EXISTS "Users can view join requests for their events" ON join_requests;
CREATE POLICY "Users can view join requests for their events"
ON join_requests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = join_requests.event_id 
    AND events.user_id = auth.uid()
  )
  OR requester_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
CREATE POLICY "Users can create join requests"
ON join_requests FOR INSERT
TO authenticated
WITH CHECK (requester_id = auth.uid());

DROP POLICY IF EXISTS "Event organizers can update join requests" ON join_requests;
CREATE POLICY "Event organizers can update join requests"
ON join_requests FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = join_requests.event_id 
    AND events.user_id = auth.uid()
  )
);

-- Event attendees RLS policies
DROP POLICY IF EXISTS "Users can view event attendees" ON event_attendees;
CREATE POLICY "Users can view event attendees"
ON event_attendees FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Event organizers can manage attendees" ON event_attendees;
CREATE POLICY "Event organizers can manage attendees"
ON event_attendees FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM events 
    WHERE events.id = event_attendees.event_id 
    AND events.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);
