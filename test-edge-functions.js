// Test script for Edge Functions
// Run with: node test-edge-functions.js

const SUPABASE_URL = 'https://lymybduvqtbmaukhifzx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5bXliZHV2cXRibWF1a2hpZnp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzMDc0MzksImV4cCI6MjA2OTg4MzQzOX0.CNzMvltL-SIBv72V6sL5QYII2SxPCFY-kekAW25qv34'

// Test authentication token (you'll need to get this from your app)
const AUTH_TOKEN = 'YOUR_JWT_TOKEN_HERE' // Replace with actual token

async function testFunction(functionName, payload, expectedStatus = 200) {
  console.log(`\n🧪 Testing ${functionName}...`)
  console.log(`Payload:`, JSON.stringify(payload, null, 2))
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, JSON.stringify(result, null, 2))
    
    const statusMatch = response.status === expectedStatus
    const hasOkField = typeof result.ok === 'boolean'
    
    console.log(`✅ Status ${statusMatch ? 'matches' : 'MISMATCH'} expected ${expectedStatus}`)
    console.log(`✅ Response ${hasOkField ? 'has' : 'MISSING'} 'ok' field`)
    
    return { success: statusMatch && hasOkField, response: result, status: response.status }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testUnauthorized(functionName, payload) {
  console.log(`\n🔒 Testing ${functionName} without auth...`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
        // No Authorization header
      },
      body: JSON.stringify(payload)
    })
    
    const result = await response.json()
    
    console.log(`Status: ${response.status}`)
    console.log(`Response:`, JSON.stringify(result, null, 2))
    
    const is401 = response.status === 401
    console.log(`✅ Returns 401: ${is401 ? 'YES' : 'NO'}`)
    
    return { success: is401, status: response.status }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function testCors(functionName) {
  console.log(`\n🌐 Testing CORS for ${functionName}...`)
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    })
    
    console.log(`Status: ${response.status}`)
    console.log(`CORS Headers:`)
    console.log(`  Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`)
    console.log(`  Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`)
    console.log(`  Access-Control-Allow-Headers: ${response.headers.get('Access-Control-Allow-Headers')}`)
    
    const hasOrigin = response.headers.get('Access-Control-Allow-Origin') === '*'
    const hasMethods = response.headers.get('Access-Control-Allow-Methods')?.includes('POST')
    const hasHeaders = response.headers.get('Access-Control-Allow-Headers')?.includes('authorization')
    
    console.log(`✅ CORS properly configured: ${hasOrigin && hasMethods && hasHeaders ? 'YES' : 'NO'}`)
    
    return { success: hasOrigin && hasMethods && hasHeaders }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`)
    return { success: false, error: error.message }
  }
}

async function runTests() {
  console.log('🚀 Starting Edge Functions Tests')
  console.log(`Using Supabase URL: ${SUPABASE_URL}`)
  
  if (AUTH_TOKEN === 'YOUR_JWT_TOKEN_HERE') {
    console.log('⚠️  WARNING: Please replace AUTH_TOKEN with a real JWT token from your app')
    console.log('   You can get this from browser dev tools or your app\'s auth state')
  }
  
  const functions = ['join-request', 'join-approve', 'join-reject', 'event-location-unlock']
  
  // Test CORS for all functions
  console.log('\n' + '='.repeat(50))
  console.log('CORS TESTS')
  console.log('='.repeat(50))
  
  for (const func of functions) {
    await testCors(func)
  }
  
  // Test unauthorized access
  console.log('\n' + '='.repeat(50))
  console.log('UNAUTHORIZED ACCESS TESTS')
  console.log('='.repeat(50))
  
  await testUnauthorized('join-request', { eventId: 1, message: 'Test message' })
  await testUnauthorized('join-approve', { requestId: 1 })
  await testUnauthorized('join-reject', { requestId: 1 })
  await testUnauthorized('event-location-unlock', { eventId: 1 })
  
  if (AUTH_TOKEN !== 'YOUR_JWT_TOKEN_HERE') {
    // Test with authentication (requires valid token)
    console.log('\n' + '='.repeat(50))
    console.log('AUTHENTICATED TESTS')
    console.log('='.repeat(50))
    
    // Test join-request
    await testFunction('join-request', { eventId: 1, message: 'Test join request' })
    
    // Test invalid eventId
    await testFunction('join-request', { eventId: 99999 }, 404)
    
    // Test missing eventId
    await testFunction('join-request', { message: 'Test' }, 400)
    
    // Test join-approve
    await testFunction('join-approve', { requestId: 1 })
    
    // Test invalid requestId
    await testFunction('join-approve', { requestId: 99999 }, 404)
    
    // Test join-reject
    await testFunction('join-reject', { requestId: 1, note: 'Test rejection' })
    
    // Test location unlock
    await testFunction('event-location-unlock', { eventId: 1 })
    
  } else {
    console.log('\n⚠️  Skipping authenticated tests - please provide AUTH_TOKEN')
  }
  
  console.log('\n🏁 Tests completed!')
  console.log('\nNext steps:')
  console.log('1. Get a real JWT token from your app')
  console.log('2. Update AUTH_TOKEN in this script')
  console.log('3. Run the tests again to verify authentication flows')
  console.log('4. Create some test data in your database')
  console.log('5. Test actual join/approve/reject flows')
}

// Run the tests
runTests().catch(console.error)
