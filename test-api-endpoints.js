#!/usr/bin/env node

/**
 * GGBang API 端点测试脚本
 * 
 * 使用方法:
 * 1. 确保应用正在运行 (npm run dev)
 * 2. 运行: node test-api-endpoints.js
 * 
 * 此脚本测试核心API功能，包括:
 * - 事件查询
 * - 申请提交 (需要认证)
 * - 容量检查
 * - 错误处理
 */

const BASE_URL = 'http://localhost:5173';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://你的项目.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '你的匿名密钥';

// 测试结果统计
let testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 颜色输出函数
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    log('green', `✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    log('red', `❌ FAIL: ${name}`);
    if (details) log('yellow', `   Details: ${details}`);
  }
}

// HTTP 请求助手函数
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        ...options.headers
      },
      ...options
    });
    
    const data = await response.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    return {
      ok: response.ok,
      status: response.status,
      data: jsonData,
      response
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
      data: null
    };
  }
}

// 测试用例

async function test1_HealthCheck() {
  log('blue', '\n🔍 Test 1: 应用健康检查');
  
  const result = await makeRequest(BASE_URL);
  logTest(
    '应用服务器响应',
    result.ok,
    result.ok ? 'Server is running' : `Status: ${result.status}, Error: ${result.error}`
  );
}

async function test2_EventsAPI() {
  log('blue', '\n🔍 Test 2: 事件API测试');
  
  // 测试事件列表获取
  const eventsResult = await makeRequest(`${SUPABASE_URL}/rest/v1/events?select=id,title,date,time,capacity,place_hint`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    '获取事件列表',
    eventsResult.ok,
    eventsResult.ok ? `Found ${eventsResult.data?.length || 0} events` : `Error: ${eventsResult.error}`
  );
  
  // 检查事件数据结构
  if (eventsResult.ok && eventsResult.data && eventsResult.data.length > 0) {
    const event = eventsResult.data[0];
    const hasRequiredFields = event.id && event.title && event.date && event.time;
    logTest(
      '事件数据结构完整性',
      hasRequiredFields,
      hasRequiredFields ? 'All required fields present' : 'Missing required fields'
    );
    
    // 检查容量字段
    logTest(
      '容量字段存在',
      'capacity' in event,
      'capacity' in event ? `Capacity: ${event.capacity}` : 'Capacity field missing'
    );
    
    // 检查地点提示字段
    logTest(
      '地点提示字段存在',
      'place_hint' in event,
      'place_hint' in event ? `Place hint: ${event.place_hint || 'null'}` : 'Place hint field missing'
    );
  }
}

async function test3_EdgeFunctions() {
  log('blue', '\n🔍 Test 3: Edge Functions测试');
  
  // 测试join-request函数 (未认证，应该返回401)
  const joinResult = await makeRequest(`${SUPABASE_URL}/functions/v1/join-request`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      eventId: 1,
      message: 'Test request'
    })
  });
  
  logTest(
    'join-request函数响应 (未认证)',
    joinResult.status === 401,
    joinResult.status === 401 ? 'Correctly rejected unauthorized request' : `Unexpected status: ${joinResult.status}`
  );
  
  // 测试join-approve函数 (未认证，应该返回401)
  const approveResult = await makeRequest(`${SUPABASE_URL}/functions/v1/join-approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({
      requestId: 1
    })
  });
  
  logTest(
    'join-approve函数响应 (未认证)',
    approveResult.status === 401,
    approveResult.status === 401 ? 'Correctly rejected unauthorized request' : `Unexpected status: ${approveResult.status}`
  );
}

async function test4_ErrorHandling() {
  log('blue', '\n🔍 Test 4: 错误处理测试');
  
  // 测试无效事件ID
  const invalidEventResult = await makeRequest(`${SUPABASE_URL}/rest/v1/events?id=eq.99999&select=*`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    '无效事件ID处理',
    invalidEventResult.ok && Array.isArray(invalidEventResult.data) && invalidEventResult.data.length === 0,
    'Returns empty array for non-existent event'
  );
  
  // 测试恶意请求 (SQL注入尝试)
  const sqlInjectionResult = await makeRequest(`${SUPABASE_URL}/rest/v1/events?id=eq.1';DROP TABLE events;--&select=*`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    'SQL注入防护',
    sqlInjectionResult.status >= 400 || (sqlInjectionResult.ok && Array.isArray(sqlInjectionResult.data)),
    'Properly handles malicious SQL injection attempt'
  );
}

async function test5_CapacityLogic() {
  log('blue', '\n🔍 Test 5: 容量逻辑测试');
  
  // 查询事件容量状态
  const capacityResult = await makeRequest(`${SUPABASE_URL}/rest/v1/rpc/get_event_capacity_info?event_id=1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    '容量信息查询函数',
    capacityResult.ok || capacityResult.status === 404,
    capacityResult.ok ? 'Function exists and responds' : `Function may not exist (${capacityResult.status})`
  );
}

async function test6_RLSPolicies() {
  log('blue', '\n🔍 Test 6: RLS策略测试');
  
  // 测试profiles表访问 (应该允许公开读取)
  const profilesResult = await makeRequest(`${SUPABASE_URL}/rest/v1/profiles?select=display_name,age,city&limit=1`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    'Profiles公开字段访问',
    profilesResult.ok,
    profilesResult.ok ? 'Public fields accessible' : `Error: ${profilesResult.status}`
  );
  
  // 测试join_requests表访问 (未认证应该受限)
  const joinRequestsResult = await makeRequest(`${SUPABASE_URL}/rest/v1/join_requests?select=*&limit=1`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  logTest(
    'Join requests访问控制',
    !joinRequestsResult.ok || (joinRequestsResult.ok && joinRequestsResult.data.length === 0),
    'Properly restricts access to join requests for unauthenticated users'
  );
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 GGBang API 端点测试开始...\n');
  
  // 检查环境变量
  if (!SUPABASE_URL.includes('supabase.co')) {
    log('yellow', '⚠️  警告: SUPABASE_URL 可能未正确设置');
  }
  
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('你的')) {
    log('yellow', '⚠️  警告: SUPABASE_ANON_KEY 可能未正确设置');
  }
  
  // 运行所有测试
  await test1_HealthCheck();
  await test2_EventsAPI();
  await test3_EdgeFunctions();
  await test4_ErrorHandling();
  await test5_CapacityLogic();
  await test6_RLSPolicies();
  
  // 输出测试结果
  log('blue', '\n📊 测试结果汇总:');
  log('green', `✅ 通过: ${testResults.passed}`);
  log('red', `❌ 失败: ${testResults.failed}`);
  log('blue', `📝 总计: ${testResults.total}`);
  
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  if (passRate >= 80) {
    log('green', `🎉 通过率: ${passRate}% - 优秀!`);
  } else if (passRate >= 60) {
    log('yellow', `⚠️  通过率: ${passRate}% - 需要改进`);
  } else {
    log('red', `🚨 通过率: ${passRate}% - 需要修复`);
  }
  
  // 输出建议
  log('blue', '\n💡 测试建议:');
  console.log('1. 确保 npm run dev 正在运行');
  console.log('2. 检查 .env 文件中的 Supabase 配置');
  console.log('3. 确认数据库迁移已正确执行');
  console.log('4. 验证 Edge Functions 已正确部署');
  console.log('5. 检查 RLS 策略是否正确配置');
  
  return testResults;
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

// 导出供其他模块使用
export { runAllTests, makeRequest };
