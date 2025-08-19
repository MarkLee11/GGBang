/**
 * Test script for GGBang Email Notification System
 * This script tests various email notification scenarios
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration - Update these values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-ref.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Test data
const testEvent = {
  title: 'Test Event - Email Notifications',
  description: 'This is a test event to verify email notification system',
  date: '2024-12-25',
  time: '18:00',
  place_hint: 'Test Location',
  category: 'test',
  country: 'Test Country',
  organizer: 'Test Organizer',
  capacity: 10
};

const testUser = {
  email: 'test@example.com',
  password: 'testpassword123'
};

async function testEmailNotificationSystem() {
  console.log('🚀 Starting GGBang Email Notification System Tests...\n');

  try {
    // Test 1: Create test user
    console.log('📝 Test 1: Creating test user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testUser.email,
      password: testUser.password,
      email_confirm: true
    });

    if (authError) {
      console.log('⚠️  User creation failed (might already exist):', authError.message);
    } else {
      console.log('✅ Test user created successfully');
    }

    // Test 2: Create test event
    console.log('\n📅 Test 2: Creating test event...');
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .insert([testEvent])
      .select()
      .single();

    if (eventError) {
      console.log('❌ Event creation failed:', eventError.message);
      return;
    }

    console.log('✅ Test event created successfully:', eventData.id);

    // Test 3: Submit join request
    console.log('\n📨 Test 3: Submitting join request...');
    const { data: requestData, error: requestError } = await supabase
      .from('join_requests')
      .insert([{
        event_id: eventData.id,
        requester_id: authData?.user?.id || 'test-user-id',
        status: 'pending',
        message: 'This is a test join request'
      }])
      .select()
      .single();

    if (requestError) {
      console.log('❌ Join request creation failed:', requestError.message);
    } else {
      console.log('✅ Join request submitted successfully');
    }

    // Test 4: Approve join request
    console.log('\n✅ Test 4: Approving join request...');
    if (requestData) {
      const { error: approveError } = await supabase
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', requestData.id);

      if (approveError) {
        console.log('❌ Join request approval failed:', approveError.message);
      } else {
        console.log('✅ Join request approved successfully');
      }
    }

    // Test 5: Add attendee
    console.log('\n👥 Test 5: Adding attendee...');
    if (requestData) {
      const { error: attendeeError } = await supabase
        .from('event_attendees')
        .insert([{
          event_id: eventData.id,
          user_id: authData?.user?.id || 'test-user-id'
        }]);

      if (attendeeError) {
        console.log('❌ Attendee addition failed:', attendeeError.message);
      } else {
        console.log('✅ Attendee added successfully');
      }
    }

    // Test 6: Unlock location
    console.log('\n📍 Test 6: Unlocking event location...');
    const { error: locationError } = await supabase
      .from('events')
      .update({ place_exact_visible: true })
      .eq('id', eventData.id);

    if (locationError) {
      console.log('❌ Location unlock failed:', locationError.message);
    } else {
      console.log('✅ Location unlocked successfully');
    }

    // Test 7: Remove attendee
    console.log('\n🚫 Test 7: Removing attendee...');
    if (requestData) {
      const { error: removeError } = await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventData.id)
        .eq('user_id', authData?.user?.id || 'test-user-id');

      if (removeError) {
        console.log('❌ Attendee removal failed:', removeError.message);
      } else {
        console.log('✅ Attendee removed successfully');
      }
    }

    // Test 8: Withdraw join request
    console.log('\n↩️  Test 8: Withdrawing join request...');
    if (requestData) {
      const { error: withdrawError } = await supabase
        .from('join_requests')
        .delete()
        .eq('id', requestData.id);

      if (withdrawError) {
        console.log('❌ Join request withdrawal failed:', withdrawError.message);
      } else {
        console.log('✅ Join request withdrawn successfully');
      }
    }

    // Test 9: Clean up test data
    console.log('\n🧹 Test 9: Cleaning up test data...');
    const { error: cleanupEventError } = await supabase
      .from('events')
      .delete()
      .eq('id', eventData.id);

    if (cleanupEventError) {
      console.log('❌ Event cleanup failed:', cleanupEventError.message);
    } else {
      console.log('✅ Test event cleaned up successfully');
    }

    // Test 10: Check email notification log
    console.log('\n📊 Test 10: Checking email notification log...');
    const { data: logData, error: logError } = await supabase
      .from('email_notification_log')
      .select('*');

    if (logError) {
      console.log('⚠️  Could not fetch notification log (view might not exist):', logError.message);
    } else {
      console.log('✅ Email notification log:', logData);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📧 Check your email inbox for notifications from the test events.');
    console.log('📋 Check the Edge Function logs for detailed execution information.');

  } catch (error) {
    console.error('❌ Test execution failed:', error);
  }
}

// Manual trigger tests
async function testManualEmailNotifications() {
  console.log('\n🔧 Testing manual email notification triggers...\n');

  try {
    // Test manual notification function
    const { data, error } = await supabase.rpc('manual_email_notification', {
      p_table: 'events',
      p_type: 'INSERT',
      p_record_id: 1
    });

    if (error) {
      console.log('❌ Manual notification test failed:', error.message);
    } else {
      console.log('✅ Manual notification triggered:', data);
    }

  } catch (error) {
    console.error('❌ Manual notification test failed:', error);
  }
}

// Edge Function test
async function testEdgeFunction() {
  console.log('\n⚡ Testing Edge Function directly...\n');

  try {
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/email-notification-trigger`;
    
    const testPayload = {
      table: 'events',
      type: 'INSERT',
      record: {
        id: 999,
        title: 'Edge Function Test Event',
        date: '2024-12-25',
        time: '19:00',
        user_id: 'test-user-id'
      },
      old_record: null
    };

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function test successful:', result);
    } else {
      console.log('❌ Edge Function test failed:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Edge Function test failed:', error);
  }
}

// Main execution
async function main() {
  console.log('🎯 GGBang Email Notification System - Test Suite\n');
  
  // Check if required environment variables are set
  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project-ref')) {
    console.log('❌ Please set SUPABASE_URL environment variable');
    return;
  }

  if (!SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY.includes('your-service-role-key')) {
    console.log('❌ Please set SUPABASE_SERVICE_ROLE_KEY environment variable');
    return;
  }

  // Run tests
  await testEmailNotificationSystem();
  await testManualEmailNotifications();
  await testEdgeFunction();

  console.log('\n🏁 Test suite completed!');
  console.log('\n📚 For more information, see: EMAIL_NOTIFICATION_SYSTEM_README.md');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  testEmailNotificationSystem,
  testManualEmailNotifications,
  testEdgeFunction
};
