// 测试图片上传功能
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// 从环境变量获取配置
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 环境变量未配置');
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ 已配置' : '❌ 未配置');
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ 已配置' : '❌ 未配置');
  process.exit(1);
}

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
    
    const profileImagesBucket = buckets.find(bucket => bucket.id === 'profile-images');
    
    if (!profileImagesBucket) {
      console.error('❌ profile-images 存储桶不存在');
      console.log('📝 需要创建的存储桶:');
      console.log('  - 名称: profile-images');
      console.log('  - 公开: true');
      console.log('  - 文件大小限制: 5MB');
      console.log('  - 允许的MIME类型: image/jpeg, image/jpg, image/png, image/webp');
      return;
    }
    
    console.log('✅ profile-images 存储桶存在');
    console.log('   - 名称:', profileImagesBucket.name);
    console.log('   - 公开:', profileImagesBucket.public);
    console.log('   - 文件大小限制:', profileImagesBucket.file_size_limit);
    
    console.log('\n📋 步骤 2: 检查存储桶策略...');
    
    // 检查存储桶策略
    const { data: policies, error: policiesError } = await supabase.storage.getBucket('profile-images');
    
    if (policiesError) {
      console.error('❌ 获取存储桶策略失败:', policiesError.message);
      return;
    }
    
    console.log('✅ 存储桶策略检查完成');
    
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
