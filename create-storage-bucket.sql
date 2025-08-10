-- 创建 profile-images 存储桶
-- 请在 Supabase Dashboard > SQL Editor 中运行此脚本

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

-- 3. 创建 RLS 策略
-- 允许认证用户上传自己的图片
CREATE POLICY "Users can upload their own profile images" ON storage.objects
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 允许所有人查看图片（公开存储桶）
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

-- 4. 授予必要的权限
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO anon;

-- 5. 验证存储桶是否创建成功
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE id = 'profile-images';
