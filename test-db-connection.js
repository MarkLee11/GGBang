// 测试数据库连接和表是否存在
import { createClient } from '@supabase/supabase-js'

// 从环境变量或配置文件获取这些值
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...')
  
  try {
    // 1. 测试基本连接
    console.log('1. 测试基本连接...')
    const { data, error } = await supabase
      .from('events')
      .select('count(*)', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ 连接失败:', error.message)
      return
    }
    
    console.log('✅ 数据库连接成功')
    
    // 2. 检查表是否存在
    console.log('\n2. 检查表是否存在...')
    
    // 检查 events 表
    const { data: eventsData, error: eventsError } = await supabase
      .from('events')
      .select('id, title')
      .limit(1)
    
    if (eventsError) {
      console.log('❌ events 表:', eventsError.message)
    } else {
      console.log('✅ events 表存在')
    }
    
    // 检查 join_requests 表
    const { data: joinRequestsData, error: joinRequestsError } = await supabase
      .from('join_requests')
      .select('id, event_id, requester_id, status')
      .limit(1)
    
    if (joinRequestsError) {
      console.log('❌ join_requests 表:', joinRequestsError.message)
    } else {
      console.log('✅ join_requests 表存在')
    }
    
    // 检查 event_attendees 表
    const { data: attendeesData, error: attendeesError } = await supabase
      .from('event_attendees')
      .select('id, event_id, user_id')
      .limit(1)
    
    if (attendeesError) {
      console.log('❌ event_attendees 表:', attendeesError.message)
    } else {
      console.log('✅ event_attendees 表存在')
    }
    
    // 3. 检查数据
    console.log('\n3. 检查数据...')
    
    // 检查 events 数量
    const { count: eventsCount } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 events 表有 ${eventsCount || 0} 条记录`)
    
    // 检查 join_requests 数量
    const { count: requestsCount } = await supabase
      .from('join_requests')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 join_requests 表有 ${requestsCount || 0} 条记录`)
    
    // 检查 event_attendees 数量
    const { count: attendeesCount } = await supabase
      .from('event_attendees')
      .select('*', { count: 'exact', head: true })
    
    console.log(`📊 event_attendees 表有 ${attendeesCount || 0} 条记录`)
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error)
  }
}

// 运行测试
testDatabaseConnection()
