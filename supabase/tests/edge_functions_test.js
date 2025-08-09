/*
  # Edge Functions 测试脚本
  
  这个脚本用于测试所有 Edge Functions 的功能和安全性
  在浏览器控制台中运行或作为 Node.js 脚本执行
*/

// 配置 - 替换为你的实际值
const SUPABASE_URL = 'https://lymybduvqtbmaukhifzx.supabase.co'
const ACCESS_TOKEN = 'your_access_token_here' // 从认证用户获取

// 测试工具函数
const makeRequest = async (endpoint, body, expectedStatus = 200) => {
  console.log(`🚀 Testing ${endpoint}...`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })
    
    const result = await response.json()
    
    console.log(`Status: ${response.status}`, result)
    
    if (response.status === expectedStatus) {
      console.log(`✅ ${endpoint} test passed`)
    } else {
      console.log(`❌ ${endpoint} test failed - expected ${expectedStatus}, got ${response.status}`)
    }
    
    return { status: response.status, data: result }
  } catch (error) {
    console.error(`💥 ${endpoint} test error:`, error)
    return { status: 500, error: error.message }
  }
}

// 测试函数
const runTests = async () => {
  console.log('🧪 Starting Edge Functions Tests...\n')
  
  // 测试数据
  const testEventId = 1 // 替换为实际存在的事件ID
  let testRequestId = null
  
  // 1. 测试创建加入申请
  console.log('\n1️⃣ Testing join-request...')
  const joinResult = await makeRequest('join-request', {
    eventId: testEventId,
    message: 'Test join request message'
  }, 201)
  
  if (joinResult.data?.request?.id) {
    testRequestId = joinResult.data.request.id
    console.log(`📝 Created request ID: ${testRequestId}`)
  }
  
  // 2. 测试重复申请（应该失败）
  console.log('\n2️⃣ Testing duplicate request prevention...')
  await makeRequest('join-request', {
    eventId: testEventId,
    message: 'Duplicate request'
  }, 400)
  
  // 3. 测试无效事件ID（应该失败）
  console.log('\n3️⃣ Testing invalid event ID...')
  await makeRequest('join-request', {
    eventId: 99999,
    message: 'Invalid event'
  }, 404)
  
  // 4. 测试批准申请（如果是主办方）
  if (testRequestId) {
    console.log('\n4️⃣ Testing join-approve...')
    await makeRequest('join-approve', {
      requestId: testRequestId
    }, 200)
  }
  
  // 5. 测试拒绝申请（创建新申请后拒绝）
  console.log('\n5️⃣ Testing join-reject...')
  // 先创建另一个申请用于拒绝测试
  const rejectTestResult = await makeRequest('join-request', {
    eventId: testEventId + 1, // 使用不同的事件ID
    message: 'Request to be rejected'
  }, 201)
  
  if (rejectTestResult.data?.request?.id) {
    await makeRequest('join-reject', {
      requestId: rejectTestResult.data.request.id,
      note: 'Sorry, event is full'
    }, 200)
  }
  
  // 6. 测试位置解锁
  console.log('\n6️⃣ Testing event-location-unlock...')
  await makeRequest('event-location-unlock', {
    eventId: testEventId
  }, 200)
  
  // 7. 测试权限控制（非主办方操作应该失败）
  console.log('\n7️⃣ Testing permission controls...')
  await makeRequest('join-approve', {
    requestId: 99999 // 不存在的或不属于当前用户的申请
  }, 403)
  
  // 8. 测试无效参数
  console.log('\n8️⃣ Testing invalid parameters...')
  await makeRequest('join-request', {
    eventId: 'invalid'
  }, 400)
  
  await makeRequest('join-approve', {
    requestId: 'invalid'
  }, 400)
  
  console.log('\n🎉 All tests completed!')
}

// 并发测试函数
const runConcurrencyTest = async () => {
  console.log('\n🔥 Starting Concurrency Test...')
  
  const testEventId = 1 // 替换为实际的接近满员的事件ID
  const concurrentRequests = 10
  
  // 创建多个并发的批准请求
  const promises = Array(concurrentRequests).fill(null).map(async (_, i) => {
    try {
      // 先创建申请
      const joinResult = await makeRequest('join-request', {
        eventId: testEventId + i, // 使用不同的事件避免重复
        message: `Concurrent request ${i}`
      })
      
      if (joinResult.data?.request?.id) {
        // 然后尝试批准
        return await makeRequest('join-approve', {
          requestId: joinResult.data.request.id
        })
      }
    } catch (error) {
      return { error: error.message }
    }
  })
  
  const results = await Promise.allSettled(promises)
  
  console.log('Concurrency test results:')
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      console.log(`Request ${i}: ${result.value?.status || 'unknown'}`)
    } else {
      console.log(`Request ${i}: Failed - ${result.reason}`)
    }
  })
  
  console.log('🔥 Concurrency test completed!')
}

// 性能测试函数
const runPerformanceTest = async () => {
  console.log('\n⚡ Starting Performance Test...')
  
  const testEventId = 1
  const iterations = 5
  const times = []
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    
    await makeRequest('join-request', {
      eventId: testEventId + i,
      message: `Performance test ${i}`
    })
    
    const end = performance.now()
    const duration = end - start
    times.push(duration)
    
    console.log(`Request ${i + 1}: ${duration.toFixed(2)}ms`)
  }
  
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length
  const maxTime = Math.max(...times)
  const minTime = Math.min(...times)
  
  console.log(`\n📊 Performance Results:`)
  console.log(`Average: ${avgTime.toFixed(2)}ms`)
  console.log(`Max: ${maxTime.toFixed(2)}ms`)
  console.log(`Min: ${minTime.toFixed(2)}ms`)
  
  console.log('⚡ Performance test completed!')
}

// 主函数
const main = async () => {
  console.log('🧪 Edge Functions Test Suite\n')
  console.log('⚠️  Make sure to:')
  console.log('1. Replace SUPABASE_URL with your project URL')
  console.log('2. Replace ACCESS_TOKEN with a valid user token')
  console.log('3. Replace testEventId with actual event IDs')
  console.log('4. Ensure the user has appropriate permissions\n')
  
  // 检查配置
  if (ACCESS_TOKEN === 'your_access_token_here') {
    console.error('❌ Please configure ACCESS_TOKEN before running tests')
    return
  }
  
  try {
    // 运行基础功能测试
    await runTests()
    
    // 运行并发测试（可选，需要多个测试事件）
    // await runConcurrencyTest()
    
    // 运行性能测试（可选）
    // await runPerformanceTest()
    
  } catch (error) {
    console.error('💥 Test suite failed:', error)
  }
}

// 如果在浏览器中运行
if (typeof window !== 'undefined') {
  // 添加到全局作用域以便在控制台中调用
  window.testEdgeFunctions = main
  window.testConcurrency = runConcurrencyTest
  window.testPerformance = runPerformanceTest
  
  console.log('🎯 Edge Functions test utilities loaded!')
  console.log('Run testEdgeFunctions() to start the test suite')
  console.log('Run testConcurrency() for concurrency tests')
  console.log('Run testPerformance() for performance tests')
}

// 如果在Node.js中运行
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runTests,
    runConcurrencyTest,
    runPerformanceTest,
    main
  }
  
  // 如果直接运行此文件
  if (require.main === module) {
    main()
  }
}

/*
使用方法:

1. 浏览器控制台:
   - 复制此脚本到控制台
   - 设置正确的 SUPABASE_URL 和 ACCESS_TOKEN
   - 运行 testEdgeFunctions()

2. Node.js:
   - 安装 node-fetch: npm install node-fetch
   - 修改配置变量
   - 运行: node edge_functions_test.js

3. 测试场景:
   - 基础功能测试
   - 权限控制测试
   - 并发安全测试
   - 性能基准测试
*/
