// 测试 Supabase 连接和图片上传功能
import { createClient } from '@supabase/supabase-js';

// 直接配置 Supabase
const supabaseUrl = 'https://lymybduvqtbmaukhifzx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34';

console.log('🔧 测试图片上传功能...');
console.log('Supabase URL:', supabaseUrl);

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testImageUpload() {
  try {
    console.log('\n📋 步骤 1: 检查存储桶是否存在...');
    
    // 检查存储桶是否存在
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ 获取存储桶列表失败:', bucketsError.message);
      return;
    }
    
    console.log('✅ 存储桶列表获取成功');
    console.log('存储桶数量:', buckets.length);
    
    const profileImagesBucket = buckets.find(bucket => bucket.id === 'profile-images');
    
    if (!profileImagesBucket) {
      console.error('❌ profile-images 存储桶不存在');
      console.log('📝 需要创建的存储桶:');
      console.log('  - 名称: profile-images');
      console.log('  - 公开: true');
      console.log('  - 文件大小限制: 5MB');
      console.log('  - 允许的MIME类型: image/jpeg, image/jpg, image/png, image/webp');
      
      console.log('\n🔧 尝试创建存储桶...');
      
      // 尝试创建存储桶
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('profile-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (createError) {
        console.error('❌ 创建存储桶失败:', createError.message);
        console.log('   请通过 Supabase Dashboard 手动创建存储桶');
        return;
      }
      
      console.log('✅ 存储桶创建成功:', newBucket);
    } else {
      console.log('✅ profile-images 存储桶存在');
      console.log('   - 名称:', profileImagesBucket.name);
      console.log('   - 公开:', profileImagesBucket.public);
      console.log('   - 文件大小限制:', profileImagesBucket.file_size_limit);
    }
    
    console.log('\n📋 步骤 2: 检查存储桶策略...');
    
    // 检查存储桶策略
    const { data: bucketInfo, error: policiesError } = await supabase.storage.getBucket('profile-images');
    
    if (policiesError) {
      console.error('❌ 获取存储桶信息失败:', policiesError.message);
      return;
    }
    
    console.log('✅ 存储桶信息获取成功');
    console.log('   - 创建时间:', bucketInfo.created_at);
    console.log('   - 更新时间:', bucketInfo.updated_at);
    
    console.log('\n📋 步骤 3: 检查用户认证...');
    
    // 检查用户认证状态
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.log('ℹ️ 用户未认证 (这是正常的，因为这是测试脚本)');
      console.log('   在实际使用中，用户需要先登录');
    } else if (user) {
      console.log('✅ 用户已认证:', user.email);
    }
    
    console.log('\n📋 步骤 4: 检查数据库表...');
    
    // 检查 profiles 表是否存在
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);
    
    if (profilesError) {
      console.error('❌ 访问 profiles 表失败:', profilesError.message);
      return;
    }
    
    console.log('✅ profiles 表可访问');
    
    console.log('\n📋 步骤 5: 测试存储桶权限...');
    
    // 尝试列出存储桶内容（不需要认证）
    const { data: files, error: listError } = await supabase.storage
      .from('profile-images')
      .list('', { limit: 1 });
    
    if (listError) {
      console.error('❌ 列出存储桶内容失败:', listError.message);
      console.log('   这可能表示权限配置有问题');
      return;
    }
    
    console.log('✅ 存储桶权限正常');
    console.log('   文件数量:', files.length);
    
    console.log('\n🎉 所有检查完成！');
    console.log('\n📝 如果图片上传仍然有问题，请检查：');
    console.log('   1. 浏览器控制台错误信息');
    console.log('   2. 网络请求状态');
    console.log('   3. 用户登录状态');
    console.log('   4. 文件类型和大小限制');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error);
  }
}

// 运行测试
testImageUpload();
