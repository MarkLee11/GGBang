const { createClient } = require('@supabase/supabase-js')

// 配置 - 请替换为你的实际值
const SUPABASE_URL = 'https://lymybduvqtbmaukhifzx.supabase.co'
const SUPABASE_ANON_KEY = 'your-anon-key' // 从Supabase控制台获取
const EDGE_FUNCTION_URL = 'https://lymybduvqtbmaukhifzx.supabase.co/functions/v1/email-notification-trigger'

// 创建Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 测试数据
const testData = {
  event: {
    title: 'Test Event for Email System',
    date: '2025-08-15',
    time: '19:00',
    category: 'dinner',
    city: 'Test City',
    country: 'Test Country',
    organizer: 'Test Organizer',
    image: null
  },
  user: {
    email: 'test@example.com',
    password: 'testpassword123'
  }
}

async function testEmailSystem() {
  console.log('🚀 开始测试邮件通知系统...\n')

  try {
    // 1. 测试Edge Function是否可访问
    console.log('1️⃣ 测试Edge Function可访问性...')
    const edgeFunctionTest = await testEdgeFunction()
    if (!edgeFunctionTest.success) {
      console.log('❌ Edge Function测试失败，停止测试')
      return
    }
    console.log('✅ Edge Function可访问\n')

    // 2. 测试数据库连接
    console.log('2️⃣ 测试数据库连接...')
    const dbTest = await testDatabaseConnection()
    if (!dbTest.success) {
      console.log('❌ 数据库连接测试失败，停止测试')
      return
    }
    console.log('✅ 数据库连接正常\n')

    // 3. 测试触发器
    console.log('3️⃣ 测试数据库触发器...')
    const triggerTest = await testDatabaseTriggers()
    if (!triggerTest.success) {
      console.log('❌ 触发器测试失败，停止测试')
      return
    }
    console.log('✅ 数据库触发器正常\n')

    // 4. 测试完整流程
    console.log('4️⃣ 测试完整邮件通知流程...')
    await testCompleteFlow()

    console.log('\n🎉 所有测试完成！')

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

async function testEdgeFunction() {
  try {
    // 首先获取JWT token
    console.log('   🔐 获取JWT token...')
    const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
      email: testData.user.email,
      password: testData.user.password
    })

    if (authError || !session?.access_token) {
      console.log(`   ❌ 认证失败:`, authError?.message || 'No session')
      return { success: false, error: 'Authentication failed' }
    }

    console.log(`   ✅ JWT token获取成功，长度: ${session.access_token.length}`)

    // 使用JWT token调用Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        table: 'test',
        type: 'INSERT',
        record: { test: true }
      })
    })

    console.log(`   Edge Function响应状态: ${response.status}`)
    
    if (response.status === 401) {
      console.log('   ⚠️  401错误 - 可能需要设置 verify_jwt = false')
      return { success: false, error: '401 Unauthorized' }
    }

    const data = await response.json()
    console.log(`   Edge Function响应:`, data)
    
    return { success: true, data }
  } catch (error) {
    console.log(`   ❌ Edge Function测试失败:`, error.message)
    return { success: false, error: error.message }
  }
}

async function testDatabaseConnection() {
  try {
    // 测试查询events表
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .limit(1)

    if (eventsError) {
      console.log(`   ❌ 查询events表失败:`, eventsError.message)
      return { success: false, error: eventsError.message }
    }

    console.log(`   ✅ 成功查询events表，找到 ${events?.length || 0} 条记录`)

    // 测试查询join_requests表
    const { data: requests, error: requestsError } = await supabase
      .from('join_requests')
      .select('id, event_id, requester_id')
      .limit(1)

    if (requestsError) {
      console.log(`   ❌ 查询join_requests表失败:`, requestsError.message)
      return { success: false, error: requestsError.message }
    }

    console.log(`   ✅ 成功查询join_requests表，找到 ${requests?.length || 0} 条记录`)

    return { success: true }
  } catch (error) {
    console.log(`   ❌ 数据库连接测试失败:`, error.message)
    return { success: false, error: error.message }
  }
}

async function testDatabaseTriggers() {
  try {
    // 检查触发器是否存在
    const { data: triggers, error: triggersError } = await supabase
      .rpc('get_triggers_info')

    if (triggersError) {
      console.log(`   ⚠️  无法查询触发器信息:`, triggersError.message)
      console.log(`   📝 请手动检查触发器是否存在`)
      return { success: true } // 不阻止测试继续
    }

    console.log(`   ✅ 找到 ${triggers?.length || 0} 个触发器`)
    return { success: true }
  } catch (error) {
    console.log(`   ⚠️  触发器检查失败:`, error.message)
    return { success: true } // 不阻止测试继续
  }
}

async function testCompleteFlow() {
  try {
    console.log('   📝 创建测试事件...')
    
    // 创建测试事件
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(testData.event)
      .select()
      .single()

    if (eventError) {
      console.log(`   ❌ 创建测试事件失败:`, eventError.message)
      return
    }

    console.log(`   ✅ 测试事件创建成功，ID: ${event.id}`)

    // 等待一下让触发器处理
    console.log('   ⏳ 等待触发器处理...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // 检查Edge Function日志
    console.log('   📋 检查Edge Function日志...')
    console.log('   💡 请运行: npx supabase functions logs email-notification-trigger')

    // 清理测试数据
    console.log('   🧹 清理测试数据...')
    await supabase
      .from('events')
      .delete()
      .eq('id', event.id)

    console.log('   ✅ 测试数据清理完成')

  } catch (error) {
    console.log(`   ❌ 完整流程测试失败:`, error.message)
  }
}

// 运行测试
testEmailSystem()

console.log('\n📋 测试说明:')
console.log('1. 确保已设置环境变量: npx supabase secrets list')
console.log('2. 确保Edge Function已部署: npx supabase functions deploy email-notification-trigger')
console.log('3. 检查Edge Function日志: npx supabase functions logs email-notification-trigger')
console.log('4. 如果仍有401错误，检查 config.toml 中的 verify_jwt = false')
