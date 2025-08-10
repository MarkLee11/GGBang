# GGBang E2E Test Suite 🚀

A comprehensive Playwright-based end-to-end testing suite for the GGBang event management application.

## 📋 Test Coverage

### **Step 1 - Login & Environment Check**
- ✅ Verify Supabase URL and API Key environment variables
- ✅ Complete OAuth login flow with test credentials
- ✅ Verify homepage redirect and user info display
- ✅ Catch "Supabase URL not configured" errors

### **Step 2 - Event Browsing & Route Persistence**
- ✅ Navigate to "My Events" page and record URL
- ✅ Test navigation between menu items
- ✅ Verify URL consistency and page rendering
- ✅ Validate event card layout (no overlapping text)

### **Step 3 - Create Event & Verify Visibility**
- ✅ Fill complete event form (title, description, location, etc.)
- ✅ Upload images and set all required fields
- ✅ Wait for Supabase success response
- ✅ Verify event appears in main list, My Events, and database

### **Step 4 - Join Event (Block Self-Join)**
- ✅ Submit join request for events by other users
- ✅ Verify `join_requests` table has pending records
- ✅ Block self-join attempts with warning messages
- ✅ Prevent "Error loading requests: Failed to fetch requests"

### **Step 5 - Edit Event & Data Prefill**
- ✅ Open edit form for existing events
- ✅ Verify all fields pre-filled with current data
- ✅ Modify fields and submit changes
- ✅ Confirm database updates and re-display updated data

## 🔧 **Setup Instructions**

### **1. Environment Configuration**

Create a `.env` file in the project root:

```env
# Required - Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Required - Test User Credentials
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Optional - Base URL (defaults to localhost:5173)
BASE_URL=http://localhost:5173
```

### **2. Install Dependencies**

```bash
# Install test dependencies
npm install

# Install Playwright browsers
npm run test:setup
```

### **3. Test User Setup**

Create a test user account in your Supabase Auth:
1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user with the email/password from your `.env`
3. Verify the user can log into your application

### **4. Environment Validation**

```bash
# Verify environment configuration
npm run test:env
```

## 🚀 **Running Tests**

### **Basic Test Execution**

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI (interactive mode)
npm run test:e2e:ui

# Run with debugging
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### **Advanced Options**

```bash
# Run specific test
npx playwright test --grep "Step 1"

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with specific browser
npx playwright test --project=chromium

# Generate trace for failed tests
npx playwright test --trace=on
```

## 📊 **Test Reports**

### **HTML Report**
After running tests, an HTML report is automatically generated:
- **Location**: `test-results/html-report/index.html`
- **Features**: Screenshots, videos, traces, timing data
- **Access**: `npm run test:e2e:report`

### **Custom E2E Report**
A detailed custom report is generated at:
- **Location**: `test-results/e2e-test-report.html`
- **Features**: Step-by-step results, duration, error details
- **Format**: Professional HTML with gradient styling

### **Screenshots & Videos**
Failed tests automatically capture:
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`
- **Traces**: `test-results/traces/`

## 🛡️ **Error Handling**

### **Environment Errors**
```
❌ ENVIRONMENT ERROR: Supabase configuration missing!
```
**Solution**: Verify `.env` file has correct Supabase credentials

### **Login Failures**
```
❌ Login failed: Network error or invalid credentials
```
**Solution**: Check test user exists and credentials are correct

### **Network Errors**
```
❌ HTTP 404 error on https://api.supabase.co/...
```
**Solution**: Verify Supabase project is active and URLs are correct

### **Self-Join Blocking**
```
✅ Self-join blocked by UI state (disabled/hidden button)
```
**Expected**: This indicates the self-join prevention is working correctly

## 🔍 **Test Architecture**

### **File Structure**
```
tests/
├── ggbang-e2e.spec.ts      # Main test file
├── utils/
│   └── test-helpers.ts      # Helper classes and utilities
├── test-environment.ts      # Environment configuration
├── global-setup.ts          # Global test setup
├── global-teardown.ts       # Global test cleanup
└── README.md               # This documentation
```

### **Helper Classes**

#### **PageHelpers**
- Network idle waiting
- Supabase request monitoring
- Error detection and screenshots
- Console error tracking

#### **AuthHelpers**
- Login/logout flows
- User session verification
- OAuth handling
- User info extraction

#### **EventHelpers**
- Event creation and editing
- Form field interaction
- Event searching and verification
- Join request handling

#### **DatabaseHelpers**
- Direct Supabase queries
- Data verification
- Test data cleanup
- Database state validation

#### **TestReporter**
- Custom HTML report generation
- Step-by-step result tracking
- Duration and error logging
- Professional report styling

## 🎯 **Test Strategy**

### **Comprehensive Coverage**
- **Frontend**: UI interactions, form validation, routing
- **Backend**: Supabase operations, database verification
- **Integration**: End-to-end user workflows
- **Error Handling**: Network failures, edge cases

### **Robust Selectors**
Tests use multiple selector strategies:
```typescript
const selectors = [
  '[data-testid="event-card"]',  // Preferred: Test IDs
  '.event-card',                 // Fallback: Class names
  'button:has-text("Join")'      // Fallback: Text content
];
```

### **Flexible Assertions**
- Multiple verification methods for each feature
- Graceful handling of UI variations
- Detailed error messages for debugging
- Conditional passes for acceptable scenarios

### **Data Cleanup**
- Automatic cleanup of test data
- Prevents test pollution
- Database state restoration
- Error-resistant cleanup operations

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. Development Server Not Running**
```
Error: Could not connect to http://localhost:5173
```
**Solution**: 
```bash
# Start development server in separate terminal
npm run dev

# Then run tests
npm run test:e2e
```

#### **2. Playwright Browsers Missing**
```
Error: Executable doesn't exist at /path/to/chromium
```
**Solution**:
```bash
npm run test:setup
```

#### **3. Environment Variables Not Loaded**
```
Error: Supabase URL not configured
```
**Solution**: Check `.env` file exists and has correct values

#### **4. Test User Authentication Fails**
```
Error: Login flow failed
```
**Solution**: 
- Verify test user exists in Supabase Auth
- Check email/password in `.env` file
- Ensure user can manually log into the app

### **Debug Mode**

For detailed debugging:
```bash
# Run with debug mode
npm run test:e2e:debug

# Or with specific options
npx playwright test --debug --headed --slowMo=1000
```

### **Trace Viewer**

For post-mortem debugging:
```bash
# Generate trace
npx playwright test --trace=on

# View trace
npx playwright show-trace test-results/traces/trace.zip
```

## 📈 **Performance Monitoring**

### **Test Timing**
- Individual step duration tracking
- Total suite execution time
- Network request timing
- Supabase response times

### **Resource Usage**
- Memory usage monitoring
- Network bandwidth tracking
- Browser resource consumption
- Parallel execution optimization

## 🎨 **Customization**

### **Test Data**
Modify test data in `tests/utils/test-helpers.ts`:
```typescript
const TEST_EVENT = {
  title: 'Your Custom Event Title',
  description: 'Custom description',
  // ... other fields
};
```

### **Selectors**
Update selectors for your UI components:
```typescript
const eventCardSelectors = [
  '[data-testid="your-event-card"]',
  '.your-event-class',
  // ... custom selectors
];
```

### **Test Configuration**
Modify `playwright.config.ts` for:
- Browser selection
- Viewport sizes
- Timeout values
- Reporter options

The E2E test suite is designed to be maintainable, reliable, and comprehensive, providing confidence in your application's functionality across all critical user workflows! 🌟
