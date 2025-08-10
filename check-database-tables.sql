-- 检查数据库表是否存在
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

-- 1. 检查所有表
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. 检查 join_requests 表是否存在
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'join_requests') 
    THEN '✅ join_requests 表存在' 
    ELSE '❌ join_requests 表不存在' 
  END as status;

-- 3. 检查 event_attendees 表是否存在
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'event_attendees') 
    THEN '✅ event_attendees 表存在' 
    ELSE '❌ event_attendees 表不存在' 
  END as status;

-- 4. 检查 events 表是否存在
SELECT 
  CASE 
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'events') 
    THEN '✅ events 表存在' 
    ELSE '❌ events 表不存在' 
  END as status;

-- 5. 如果 join_requests 表存在，检查其结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'join_requests'
ORDER BY ordinal_position;

-- 6. 如果 event_attendees 表存在，检查其结构
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'event_attendees'
ORDER BY ordinal_position;
