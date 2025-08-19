#!/usr/bin/env node

/**
 * AI通知系统测试脚本
 * 用于测试数据库触发器、通知队列和邮件发送功能
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 配置
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
  console.error('❌ 缺少必要的环境变量');
  console.error('请设置: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
  process.exit(1);
}

// 创建客户端
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 测试数据
const TEST_EVENT = {
  title: 'AI通知系统测试活动',
  description: '这是一个测试AI通知系统的活动',
  date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 明天
  time: '19:00',
  location: '测试地点',
  category: 'Social Meetup',
  capacity: 10
};

const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

/**
 * 测试1: 创建测试用户
 */
async function testCreateUser() {
  console.log('\n🧪 测试1: 创建测试用户');
  
  try {
    // 创建用户
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      email_confirm: true
    });
    
    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✅ 用户已存在，跳过创建');
        return authData.user.id;
      }
      throw authError;
    }
    
    console.log('✅ 测试用户创建成功:', authData.user.id);
    return authData.user.id;
  } catch (error) {
    console.error('❌ 创建用户失败:', error.message);
    throw error;
  }
}

/**
 * 测试2: 创建测试活动
 */
async function testCreateEvent(userId) {
  console.log('\n🧪 测试2: 创建测试活动');
  
  try {
    const { data: event, error } = await adminClient
      .from('events')
      .insert({
        ...TEST_EVENT,
        user_id: userId
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ 测试活动创建成功:', event.id);
    return event;
  } catch (error) {
    console.error('❌ 创建活动失败:', error.message);
    throw error;
  }
}

/**
 * 测试3: 创建join request
 */
async function testCreateJoinRequest(eventId, requesterId) {
  console.log('\n🧪 测试3: 创建join request');
  
  try {
    const { data: request, error } = await adminClient
      .from('join_requests')
      .insert({
        event_id: eventId,
        requester_id: requesterId,
        message: '我想参加这个测试活动！'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('✅ Join request创建成功:', request.id);
    return request;
  } catch (error) {
    console.error('❌ 创建join request失败:', error.message);
    throw error;
  }
}

/**
 * 测试4: 检查通知队列
 */
async function testCheckNotificationQueue() {
  console.log('\n🧪 测试4: 检查通知队列');
  
  try {
    // 等待一下让触发器执行
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: queue, error } = await adminClient
      .from('notifications_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    console.log('✅ 通知队列查询成功');
    console.log(`📊 队列中有 ${queue.length} 条记录`);
    
    queue.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.kind} - ${item.status} - ${item.created_at}`);
    });
    
    return queue;
  } catch (error) {
    console.error('❌ 检查通知队列失败:', error.message);
    throw error;
  }
}

/**
 * 测试5: 手动触发通知
 */
async function testManualNotification(eventId, requesterId) {
  console.log('\n🧪 测试5: 手动触发通知');
  
  try {
    const { data, error } = await adminClient.rpc('trigger_manual_notification', {
      p_kind: 'request_created',
      p_event_id: eventId,
      p_requester_id: requesterId,
      p_user_id: requesterId,
      p_payload: { test: true, message: '手动触发的测试通知' }
    });
    
    if (error) throw error;
    
    console.log('✅ 手动通知触发成功, 队列ID:', data);
    return data;
  } catch (error) {
    console.error('❌ 手动触发通知失败:', error.message);
    throw error;
  }
}

/**
 * 测试6: 调用notify-worker
 */
async function testNotifyWorker() {
  console.log('\n🧪 测试6: 调用notify-worker');
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-worker`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Notify worker调用成功');
      console.log('📊 处理结果:', result);
    } else {
      console.error('❌ Notify worker调用失败:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ 调用notify worker失败:', error.message);
    throw error;
  }
}

/**
 * 测试7: 检查通知日志
 */
async function testCheckNotificationLogs() {
  console.log('\n🧪 测试7: 检查通知日志');
  
  try {
    const { data: logs, error } = await adminClient
      .from('notifications_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    console.log('✅ 通知日志查询成功');
    console.log(`📊 日志中有 ${logs.length} 条记录`);
    
    logs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.kind} - ${log.status} - ${log.recipient_email || 'N/A'}`);
    });
    
    return logs;
  } catch (error) {
    console.error('❌ 检查通知日志失败:', error.message);
    throw error;
  }
}

/**
 * 清理测试数据
 */
async function cleanupTestData(userId, eventId) {
  console.log('\n🧹 清理测试数据');
  
  try {
    // 删除join requests
    await adminClient
      .from('join_requests')
      .delete()
      .eq('event_id', eventId);
    
    // 删除event attendees
    await adminClient
      .from('event_attendees')
      .delete()
      .eq('event_id', eventId);
    
    // 删除事件
    await adminClient
      .from('events')
      .delete()
      .eq('id', eventId);
    
    // 删除用户
    await adminClient.auth.admin.deleteUser(userId);
    
    console.log('✅ 测试数据清理完成');
  } catch (error) {
    console.error('⚠️ 清理测试数据时出错:', error.message);
  }
}

/**
 * 主测试流程
 */
async function runTests() {
  console.log('🚀 开始AI通知系统测试');
  console.log('=' * 50);
  
  let userId, eventId;
  
  try {
    // 运行测试
    userId = await testCreateUser();
    const event = await testCreateEvent(userId);
    eventId = event.id;
    
    await testCreateJoinRequest(eventId, userId);
    await testCheckNotificationQueue();
    await testManualNotification(eventId, userId);
    await testNotifyWorker();
    await testCheckNotificationLogs();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('\n💥 测试过程中出现错误:', error.message);
    console.error('请检查数据库连接和权限设置');
  } finally {
    // 清理测试数据
    if (userId && eventId) {
      await cleanupTestData(userId, eventId);
    }
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testCreateUser,
  testCreateEvent,
  testCreateJoinRequest,
  testCheckNotificationQueue,
  testManualNotification,
  testNotifyWorker,
  testCheckNotificationLogs
};

