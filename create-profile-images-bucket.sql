-- 创建 profile-images 存储桶和设置 RLS 策略
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images', 
  'profile-images', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 启用 RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. 删除现有的策略（如果存在）
DROP POLICY IF EXISTS "Users can upload their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile images" ON storage.objects;

-- 4. 创建新的策略

-- 允许认证用户上传自己的图片
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许所有人查看图片
CREATE POLICY "Anyone can view profile images" ON storage.objects
  FOR SELECT 
  TO public 
  USING (bucket_id = 'profile-images');

-- 允许用户更新自己的图片
CREATE POLICY "Users can update their own profile images" ON storage.objects
  FOR UPDATE 
  TO authenticated 
  USING (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许用户删除自己的图片
CREATE POLICY "Users can delete their own profile images" ON storage.objects
  FOR DELETE 
  TO authenticated 
  USING (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. 验证创建结果
SELECT 
  'Storage bucket created successfully' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'profile-images';

-- 6. 验证策略
SELECT 
  'RLS policies created successfully' as status,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%profile%';

-- 7. 测试存储桶访问权限
-- 注意：这些查询需要在认证用户上下文中运行
-- SELECT * FROM storage.objects WHERE bucket_id = 'profile-images' LIMIT 1;
