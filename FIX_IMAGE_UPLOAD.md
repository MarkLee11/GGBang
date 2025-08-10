# 🚨 图片上传问题修复指南

## 🔍 问题诊断结果

经过详细诊断，发现图片上传功能不工作的主要原因是：

### ❌ 核心问题
**Supabase 存储桶不存在**: `profile-images` 存储桶未在 Supabase 中创建

### 🔧 技术细节
- Supabase 连接正常 ✅
- 环境变量配置正确 ✅  
- 前端代码实现完整 ✅
- 图片上传逻辑正确 ✅
- **存储桶数量: 0** ❌
- **RLS策略阻止API创建存储桶** ❌

## 🛠️ 解决方案

### 方法 1: 通过 Supabase Dashboard 创建存储桶（推荐）

1. **登录 Supabase Dashboard**
   - 访问: https://supabase.com/dashboard
   - 选择项目: `lymybduvqtbmaukhifzx`

2. **进入 Storage 页面**
   - 左侧菜单 → Storage
   - 点击 "New bucket"

3. **创建存储桶配置**
   ```
   Bucket name: profile-images
   Public bucket: ✅ 勾选
   File size limit: 5 MB
   Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp
   ```

4. **设置 RLS 策略**
   - 在 Storage → Policies 中设置以下策略：

```sql
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
```

### 方法 2: 通过 SQL 编辑器执行脚本

1. **进入 SQL Editor**
   - 左侧菜单 → SQL Editor
   - 创建新的查询

2. **运行创建脚本**
   ```sql
   -- 创建存储桶
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('profile-images', 'profile-images', true)
   ON CONFLICT (id) DO NOTHING;
   
   -- 启用 RLS
   ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
   
   -- 创建策略
   CREATE POLICY "Users can upload their own profile images" ON storage.objects
     FOR INSERT 
     TO authenticated 
     WITH CHECK (
       bucket_id = 'profile-images' 
       AND (storage.foldername(name))[1] = auth.uid()::text
     );
   
   CREATE POLICY "Anyone can view profile images" ON storage.objects
     FOR SELECT 
     TO public 
     USING (bucket_id = 'profile-images');
   
   CREATE POLICY "Users can update their own profile images" ON storage.objects
     FOR UPDATE 
     TO authenticated 
     USING (
       bucket_id = 'profile-images' 
       AND (storage.foldername(name))[1] = auth.uid()::text
     );
   
   CREATE POLICY "Users can delete their own profile images" ON storage.objects
     FOR DELETE 
     TO authenticated 
     USING (
       bucket_id = 'profile-images' 
       AND (storage.foldername(name))[1] = auth.uid()::text
     );
   ```

## 🧪 验证步骤

### 1. 检查存储桶是否创建成功
```sql
SELECT * FROM storage.buckets WHERE id = 'profile-images';
```

### 2. 检查 RLS 策略
```sql
SELECT * FROM storage.policies WHERE table_name = 'objects';
```

### 3. 测试图片上传
- 启动前端应用: `npm run dev`
- 登录用户账户
- 进入个人资料编辑页面
- 尝试上传图片

## 🔧 代码修复

### 1. 图片上传错误处理增强

在 `src/lib/profileImageUpload.ts` 中添加更详细的错误处理：

```typescript
export async function uploadProfileImage(
  file: File, 
  userId: string, 
  index: number = 0
): Promise<ImageUploadResult> {
  try {
    // 验证文件
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return { success: false, error: validation.error }
    }

    // 压缩图片
    const compressedFile = await compressImage(file)
    
    // 生成文件名
    const filename = generateImageFilename(userId, index)
    
    console.log('Uploading file:', filename, 'for user:', userId)
    
    // 检查存储桶是否存在
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket('profile-images')
    if (bucketError) {
      console.error('Bucket error:', bucketError)
      return { 
        success: false, 
        error: 'Storage bucket not found. Please contact administrator.' 
      }
    }
    
    // 上传到 Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-images')
      .upload(filename, compressedFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { 
        success: false, 
        error: `Upload failed: ${error.message}` 
      }
    }

    // 获取公开URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-images')
      .getPublicUrl(filename)

    return { success: true, url: publicUrl }

  } catch (error) {
    console.error('Image upload error:', error)
    return { 
      success: false, 
      error: 'Upload failed due to network error' 
    }
  }
}
```

### 2. 前端错误提示增强

在 `src/components/EditProfileModal.tsx` 中改进错误处理：

```typescript
const handleImageUpload = async (files: FileList | null) => {
  if (!files || files.length === 0) return

  setUploadingImages(true)
  try {
    const fileArray = Array.from(files)
    const success = await uploadImages(fileArray)
    if (!success) {
      // 显示更详细的错误信息
      const errorMessage = 'Failed to upload some images. Please check:\n' +
        '1. File type (JPEG, PNG, WebP only)\n' +
        '2. File size (max 5MB)\n' +
        '3. Internet connection\n' +
        '4. Contact support if problem persists'
      alert(errorMessage)
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('Upload failed. Please try again or contact support.')
  } finally {
    setUploadingImages(false)
  }
}
```

## 🚀 预期结果

修复完成后，用户应该能够：

1. **上传图片**: 选择并上传个人资料图片
2. **查看图片**: 在个人资料页面看到上传的图片
3. **删除图片**: 删除不需要的图片
4. **图片管理**: 最多上传 10 张图片，第一张为主图

## 📱 用户界面功能

- **拖拽上传**: 支持拖拽文件到上传区域
- **多选上传**: 一次选择多张图片
- **实时预览**: 上传后立即显示
- **进度指示**: 显示上传进度
- **错误处理**: 友好的错误提示

## 🔒 安全特性

- **文件类型限制**: 只允许图片格式
- **文件大小限制**: 最大 5MB
- **用户隔离**: 用户只能访问自己的图片
- **RLS 策略**: 行级安全控制

## 📞 如果问题仍然存在

如果按照以上步骤操作后问题仍然存在，请检查：

1. **浏览器控制台错误信息**
2. **网络请求状态**
3. **用户登录状态**
4. **存储桶权限设置**
5. **RLS 策略配置**

## 📚 相关文件

- `src/hooks/useProfile.ts` - 个人资料管理 hook
- `src/lib/profileImageUpload.ts` - 图片上传工具
- `src/components/EditProfileModal.tsx` - 个人资料编辑界面
- `supabase/storage_setup.sql` - 存储设置脚本
- `create-storage-bucket.sql` - 存储桶创建脚本

---

**总结**: 图片上传功能不工作的主要原因是 Supabase 存储桶未创建。按照上述步骤创建存储桶并设置正确的 RLS 策略后，功能应该可以正常工作。

**下一步**: 请按照方法 1 或方法 2 创建存储桶，然后测试图片上传功能。
