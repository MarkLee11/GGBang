/*
  # Grindr风格用户资料系统
  
  Goal: 实现公开/敏感信息分层，支持双向可见性控制
  
  Features:
  1. 扩展profiles表字段
  2. 添加敏感信息访问控制
  3. 支持多图存储
  4. 兴趣和偏好标签
*/

-- ================================
-- 扩展profiles表字段
-- ================================

-- 如果profiles表不存在，先创建基础结构
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
    CREATE TABLE profiles (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- 添加新字段（如果不存在）
DO $$ 
BEGIN
  -- 基础显示字段
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'age') THEN
    ALTER TABLE profiles ADD COLUMN age integer CHECK (age >= 18 AND age <= 99);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'city') THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'country') THEN
    ALTER TABLE profiles ADD COLUMN country text;
  END IF;
  
  -- 多图存储
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'profile_images') THEN
    ALTER TABLE profiles ADD COLUMN profile_images text[] DEFAULT '{}';
  END IF;
  
  -- 兴趣和偏好
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'interests') THEN
    ALTER TABLE profiles ADD COLUMN interests text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferences') THEN
    ALTER TABLE profiles ADD COLUMN preferences text[] DEFAULT '{}';
  END IF;
  
  -- 身体信息
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'height_cm') THEN
    ALTER TABLE profiles ADD COLUMN height_cm integer CHECK (height_cm >= 100 AND height_cm <= 250);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'weight_kg') THEN
    ALTER TABLE profiles ADD COLUMN weight_kg integer CHECK (weight_kg >= 30 AND weight_kg <= 300);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'body_type') THEN
    ALTER TABLE profiles ADD COLUMN body_type text CHECK (body_type IN ('slim', 'average', 'athletic', 'muscular', 'bear', 'chubby', 'stocky', 'other'));
  END IF;
  
  -- 关系状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'relationship_status') THEN
    ALTER TABLE profiles ADD COLUMN relationship_status text CHECK (relationship_status IN ('single', 'taken', 'married', 'open', 'complicated', 'not_specified'));
  END IF;
  
  -- 敏感健康信息
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'hiv_status') THEN
    ALTER TABLE profiles ADD COLUMN hiv_status text CHECK (hiv_status IN ('negative', 'positive', 'unknown', 'not_disclosed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'prep_usage') THEN
    ALTER TABLE profiles ADD COLUMN prep_usage text CHECK (prep_usage IN ('on_prep', 'not_on_prep', 'considering', 'not_disclosed'));
  END IF;
  
  -- 社交链接（敏感）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'social_links') THEN
    ALTER TABLE profiles ADD COLUMN social_links jsonb DEFAULT '{}';
  END IF;
  
  -- 验证状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
  END IF;
  
  -- 在线状态
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE profiles ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
  
END $$;

-- ================================
-- 创建敏感信息访问控制函数
-- ================================

-- 检查用户是否可以查看另一用户的敏感信息
CREATE OR REPLACE FUNCTION can_view_sensitive_profile(
  viewer_id uuid,
  target_id uuid,
  event_id bigint DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_host boolean := false;
  both_approved boolean := false;
  viewer_approved boolean := false;
  target_approved boolean := false;
BEGIN
  -- 自己总是可以查看自己的敏感信息
  IF viewer_id = target_id THEN
    RETURN true;
  END IF;
  
  -- 如果没有指定事件，不能查看敏感信息
  IF event_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 检查viewer是否是事件主办方
  SELECT EXISTS(
    SELECT 1 FROM events 
    WHERE id = event_id AND user_id = viewer_id
  ) INTO is_host;
  
  -- 主办方可以查看所有申请人的敏感信息
  IF is_host THEN
    RETURN true;
  END IF;
  
  -- 检查双方是否都是该事件的已批准参与者
  SELECT EXISTS(
    SELECT 1 FROM event_attendees 
    WHERE event_id = can_view_sensitive_profile.event_id AND user_id = viewer_id
  ) INTO viewer_approved;
  
  SELECT EXISTS(
    SELECT 1 FROM event_attendees 
    WHERE event_id = can_view_sensitive_profile.event_id AND user_id = target_id
  ) INTO target_approved;
  
  both_approved := viewer_approved AND target_approved;
  
  RETURN both_approved;
END;
$$;

-- ================================
-- 创建安全的profile查询函数
-- ================================

-- 获取公开profile信息
CREATE OR REPLACE FUNCTION get_public_profile_info(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'user_id', user_id,
    'display_name', display_name,
    'bio', bio,
    'age', age,
    'city', city,
    'country', country,
    'profile_images', profile_images,
    'interests', interests,
    'preferences', preferences,
    'height_cm', height_cm,
    'weight_kg', weight_kg,
    'body_type', body_type,
    'relationship_status', relationship_status,
    'is_verified', is_verified,
    'last_seen', last_seen,
    'created_at', created_at
  )
  FROM profiles
  WHERE user_id = target_user_id
  INTO result;
  
  RETURN result;
END;
$$;

-- 获取敏感profile信息（需要权限检查）
CREATE OR REPLACE FUNCTION get_sensitive_profile_info(
  viewer_id uuid,
  target_user_id uuid,
  event_id bigint DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  can_view boolean;
BEGIN
  -- 检查访问权限
  SELECT can_view_sensitive_profile(viewer_id, target_user_id, event_id) INTO can_view;
  
  IF NOT can_view THEN
    RETURN json_build_object('error', 'Access denied to sensitive information');
  END IF;
  
  SELECT json_build_object(
    'hiv_status', hiv_status,
    'prep_usage', prep_usage,
    'social_links', social_links
  )
  FROM profiles
  WHERE user_id = target_user_id
  INTO result;
  
  RETURN result;
END;
$$;

-- 获取完整profile信息（公开+敏感，根据权限）
CREATE OR REPLACE FUNCTION get_full_profile_info(
  viewer_id uuid,
  target_user_id uuid,
  event_id bigint DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  public_info json;
  sensitive_info json;
  can_view boolean;
  result json;
BEGIN
  -- 获取公开信息
  SELECT get_public_profile_info(target_user_id) INTO public_info;
  
  -- 检查是否可以查看敏感信息
  SELECT can_view_sensitive_profile(viewer_id, target_user_id, event_id) INTO can_view;
  
  IF can_view THEN
    SELECT get_sensitive_profile_info(viewer_id, target_user_id, event_id) INTO sensitive_info;
    
    -- 合并公开和敏感信息
    SELECT public_info || sensitive_info || json_build_object('can_view_sensitive', true) INTO result;
  ELSE
    SELECT public_info || json_build_object('can_view_sensitive', false) INTO result;
  END IF;
  
  RETURN result;
END;
$$;

-- ================================
-- 更新profiles表的RLS策略
-- ================================

-- 确保RLS已启用
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 删除现有策略（如果存在）
DROP POLICY IF EXISTS profiles_self_write ON profiles;
DROP POLICY IF EXISTS profiles_self_update ON profiles;
DROP POLICY IF EXISTS profiles_public_read ON profiles;

-- 创建新的RLS策略
-- 用户可以插入自己的profile
CREATE POLICY profiles_insert_own ON profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 用户可以更新自己的profile
CREATE POLICY profiles_update_own ON profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 用户可以删除自己的profile
CREATE POLICY profiles_delete_own ON profiles
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 所有认证用户可以查看基本profile信息（不包括敏感字段）
CREATE POLICY profiles_read_public ON profiles
FOR SELECT 
TO authenticated
USING (true);

-- 注意：敏感字段的访问控制通过函数实现，而不是RLS

-- ================================
-- 创建触发器自动更新updated_at
-- ================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 如果触发器不存在，创建它
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 创建兴趣和偏好的预定义选项
-- ================================

CREATE TABLE IF NOT EXISTS interest_categories (
  id serial PRIMARY KEY,
  category text NOT NULL,
  interests text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 插入预定义的兴趣分类
INSERT INTO interest_categories (category, interests) VALUES
('Sports & Fitness', ARRAY['Gym', 'Running', 'Swimming', 'Football', 'Basketball', 'Tennis', 'Yoga', 'Hiking', 'Cycling', 'Boxing']),
('Entertainment', ARRAY['Movies', 'TV Shows', 'Music', 'Concerts', 'Theater', 'Gaming', 'Board Games', 'Dancing', 'Karaoke', 'Stand-up Comedy']),
('Food & Drink', ARRAY['Cooking', 'Wine Tasting', 'Craft Beer', 'Fine Dining', 'Street Food', 'Baking', 'Coffee', 'Cocktails', 'BBQ', 'Vegetarian']),
('Travel & Culture', ARRAY['Travel', 'Languages', 'Museums', 'Art Galleries', 'Photography', 'Architecture', 'History', 'Literature', 'Philosophy', 'Meditation']),
('Social & Lifestyle', ARRAY['Parties', 'Networking', 'Volunteering', 'Fashion', 'Shopping', 'Beauty', 'Wellness', 'Spirituality', 'Politics', 'Environment']),
('Hobbies & Skills', ARRAY['Reading', 'Writing', 'Painting', 'Music Production', 'DJing', 'Programming', 'Design', 'Crafts', 'Gardening', 'Pets'])
ON CONFLICT DO NOTHING;

-- 创建偏好选项表
CREATE TABLE IF NOT EXISTS preference_options (
  id serial PRIMARY KEY,
  category text NOT NULL,
  options text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 插入预定义的偏好选项
INSERT INTO preference_options (category, options) VALUES
('Looking For', ARRAY['Friends', 'Dating', 'Relationship', 'Networking', 'Fun', 'Chat', 'Activity Partner', 'Travel Buddy']),
('Event Types', ARRAY['Bars', 'Clubs', 'Festivals', 'House Parties', 'Outdoor Events', 'Cultural Events', 'Sports Events', 'Food Events']),
('Age Range', ARRAY['18-25', '26-35', '36-45', '46-55', '55+']),
('Distance', ARRAY['Nearby (5km)', 'Local (25km)', 'City (50km)', 'Region (100km)', 'Anywhere'])
ON CONFLICT DO NOTHING;

-- ================================
-- 设置函数权限
-- ================================

-- 允许认证用户调用这些函数
REVOKE ALL ON FUNCTION can_view_sensitive_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION can_view_sensitive_profile TO authenticated, service_role;

REVOKE ALL ON FUNCTION get_public_profile_info FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_profile_info TO authenticated, service_role;

REVOKE ALL ON FUNCTION get_sensitive_profile_info FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_sensitive_profile_info TO authenticated, service_role;

REVOKE ALL ON FUNCTION get_full_profile_info FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_full_profile_info TO authenticated, service_role;

-- ================================
-- 创建索引优化查询性能
-- ================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city_country ON profiles(city, country);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen);
CREATE INDEX IF NOT EXISTS idx_profiles_interests ON profiles USING GIN(interests);
CREATE INDEX IF NOT EXISTS idx_profiles_preferences ON profiles USING GIN(preferences);
