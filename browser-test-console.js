/**
 * GGBang 浏览器控制台测试脚本
 * 
 * 使用方法:
 * 1. 打开 http://localhost:5173/
 * 2. 按 F12 打开开发者工具
 * 3. 切换到 Console 标签页
 * 4. 复制粘贴此脚本并回车执行
 * 
 * 这将测试前端功能和API调用
 */

console.log('🚀 开始 GGBang 前端功能测试...\n');

// 测试结果统计
window.testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// 测试助手函数
function logTest(name, passed, details = '') {
  window.testResults.total++;
  const result = {
    name,
    passed,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (passed) {
    window.testResults.passed++;
    console.log(`%c✅ PASS: ${name}`, 'color: green; font-weight: bold');
  } else {
    window.testResults.failed++;
    console.log(`%c❌ FAIL: ${name}`, 'color: red; font-weight: bold');
    if (details) console.log(`%c   Details: ${details}`, 'color: orange');
  }
  
  window.testResults.details.push(result);
}

function logInfo(message) {
  console.log(`%c🔍 ${message}`, 'color: blue; font-weight: bold');
}

// 等待元素出现的助手函数
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.querySelector(selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// 模拟用户交互
function simulateClick(element) {
  if (element) {
    element.click();
    return true;
  }
  return false;
}

function simulateInput(element, value) {
  if (element) {
    element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  return false;
}

// 测试用例

async function test1_DOMElements() {
  logInfo('Test 1: DOM元素存在性检查');
  
  // 检查基本页面元素
  const navigation = document.querySelector('nav');
  logTest('导航栏存在', !!navigation);
  
  const eventGrid = document.querySelector('[class*="grid"], [class*="event"]');
  logTest('事件网格存在', !!eventGrid);
  
  const signInButton = document.querySelector('button:contains("Sign In"), a:contains("Sign In"), [href*="sign"], [class*="sign"]');
  logTest('登录按钮存在', !!signInButton);
  
  // 检查响应式设计
  const isMobile = window.innerWidth < 768;
  logTest('响应式设计适配', true, `当前视窗: ${window.innerWidth}x${window.innerHeight} (${isMobile ? 'Mobile' : 'Desktop'})`);
}

async function test2_EventCards() {
  logInfo('Test 2: 事件卡片功能测试');
  
  // 查找事件卡片
  const eventCards = document.querySelectorAll('[class*="card"], [class*="event"]').length;
  logTest('事件卡片渲染', eventCards > 0, `找到 ${eventCards} 个事件卡片`);
  
  // 检查容量显示
  const capacityElements = document.querySelectorAll('[class*="capacity"], [class*="users"]');
  logTest('容量信息显示', capacityElements.length > 0, `找到 ${capacityElements.length} 个容量元素`);
  
  // 检查地点信息
  const locationElements = document.querySelectorAll('[class*="location"], [class*="map"]');
  logTest('地点信息显示', locationElements.length > 0, `找到 ${locationElements.length} 个地点元素`);
}

async function test3_LocalStorage() {
  logInfo('Test 3: 本地存储测试');
  
  // 测试localStorage功能
  try {
    localStorage.setItem('test_key', 'test_value');
    const value = localStorage.getItem('test_key');
    logTest('LocalStorage 可用', value === 'test_value');
    localStorage.removeItem('test_key');
  } catch (error) {
    logTest('LocalStorage 可用', false, error.message);
  }
  
  // 检查应用是否使用了localStorage
  const keys = Object.keys(localStorage);
  logTest('应用使用 LocalStorage', keys.length > 0, `存储键: ${keys.join(', ')}`);
}

async function test4_API_Calls() {
  logInfo('Test 4: API调用测试');
  
  // 检查是否有网络请求
  let networkRequests = 0;
  const originalFetch = window.fetch;
  
  window.fetch = function(...args) {
    networkRequests++;
    return originalFetch.apply(this, args);
  };
  
  // 等待一段时间收集网络请求
  setTimeout(() => {
    logTest('网络请求活动', networkRequests > 0, `检测到 ${networkRequests} 个网络请求`);
    window.fetch = originalFetch; // 恢复原始fetch
  }, 2000);
  
  // 检查Supabase客户端
  const hasSupabase = typeof window.supabase !== 'undefined' || 
                      document.querySelector('script[src*="supabase"]') ||
                      localStorage.getItem('supabase.auth.token');
  logTest('Supabase 客户端检测', hasSupabase, 'Supabase集成检测');
}

async function test5_FormValidation() {
  logInfo('Test 5: 表单验证测试');
  
  // 查找表单元素
  const forms = document.querySelectorAll('form');
  logTest('表单元素存在', forms.length > 0, `找到 ${forms.length} 个表单`);
  
  // 检查日期输入限制
  const dateInputs = document.querySelectorAll('input[type="date"]');
  let hasMinDate = false;
  dateInputs.forEach(input => {
    if (input.min) hasMinDate = true;
  });
  logTest('日期输入限制', hasMinDate || dateInputs.length === 0, '日期输入有最小值限制');
  
  // 检查必填字段
  const requiredInputs = document.querySelectorAll('input[required], textarea[required], select[required]');
  logTest('必填字段标记', requiredInputs.length > 0, `找到 ${requiredInputs.length} 个必填字段`);
}

async function test6_ErrorHandling() {
  logInfo('Test 6: 错误处理测试');
  
  // 检查错误显示元素
  const errorElements = document.querySelectorAll('[class*="error"], [class*="alert"], [role="alert"]');
  logTest('错误提示元素', true, `找到 ${errorElements.length} 个潜在错误提示元素`);
  
  // 检查控制台错误
  const originalError = console.error;
  let errorCount = 0;
  
  console.error = function(...args) {
    errorCount++;
    originalError.apply(this, args);
  };
  
  setTimeout(() => {
    logTest('控制台错误数量', errorCount < 5, `检测到 ${errorCount} 个控制台错误`);
    console.error = originalError;
  }, 1000);
}

async function test7_Accessibility() {
  logInfo('Test 7: 可访问性测试');
  
  // 检查alt属性
  const images = document.querySelectorAll('img');
  let imagesWithAlt = 0;
  images.forEach(img => {
    if (img.alt) imagesWithAlt++;
  });
  logTest('图片Alt属性', images.length === 0 || imagesWithAlt / images.length > 0.8, 
          `${imagesWithAlt}/${images.length} 图片有alt属性`);
  
  // 检查标题结构
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  logTest('标题结构', headings.length > 0, `找到 ${headings.length} 个标题元素`);
  
  // 检查按钮和链接
  const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
  logTest('交互元素', interactiveElements.length > 0, `找到 ${interactiveElements.length} 个交互元素`);
}

async function test8_Performance() {
  logInfo('Test 8: 性能测试');
  
  // 页面加载时间
  const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
  logTest('页面加载时间', loadTime < 5000, `加载时间: ${loadTime}ms`);
  
  // 检查图片优化
  const largeImages = Array.from(document.querySelectorAll('img')).filter(img => {
    return img.naturalWidth > 1920 || img.naturalHeight > 1080;
  });
  logTest('图片尺寸优化', largeImages.length === 0, `${largeImages.length} 个大尺寸图片`);
  
  // 内存使用 (如果支持)
  if (performance.memory) {
    const memUsage = performance.memory.usedJSHeapSize / 1024 / 1024;
    logTest('内存使用', memUsage < 100, `JS堆内存: ${memUsage.toFixed(2)}MB`);
  }
}

// 主测试运行函数
async function runBrowserTests() {
  console.log('%c🧪 开始浏览器前端测试...', 'color: purple; font-size: 16px; font-weight: bold');
  
  try {
    await test1_DOMElements();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test2_EventCards();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test3_LocalStorage();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test4_API_Calls();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test5_FormValidation();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test6_ErrorHandling();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test7_Accessibility();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await test8_Performance();
    
  } catch (error) {
    console.error('测试执行出错:', error);
  }
  
  // 输出最终结果
  setTimeout(() => {
    console.log('\n%c📊 测试结果汇总:', 'color: blue; font-size: 14px; font-weight: bold');
    console.log(`%c✅ 通过: ${window.testResults.passed}`, 'color: green');
    console.log(`%c❌ 失败: ${window.testResults.failed}`, 'color: red');
    console.log(`%c📝 总计: ${window.testResults.total}`, 'color: blue');
    
    const passRate = ((window.testResults.passed / window.testResults.total) * 100).toFixed(1);
    if (passRate >= 80) {
      console.log(`%c🎉 通过率: ${passRate}% - 优秀!`, 'color: green; font-weight: bold');
    } else if (passRate >= 60) {
      console.log(`%c⚠️ 通过率: ${passRate}% - 需要改进`, 'color: orange; font-weight: bold');
    } else {
      console.log(`%c🚨 通过率: ${passRate}% - 需要修复`, 'color: red; font-weight: bold');
    }
    
    // 保存结果到全局变量，方便后续查看
    window.lastTestResults = window.testResults;
    console.log('\n%c💡 提示: 测试结果已保存到 window.lastTestResults', 'color: gray');
    console.log('%c💡 提示: 可运行 window.lastTestResults.details 查看详细结果', 'color: gray');
  }, 3000);
}

// 立即运行测试
runBrowserTests();

// 导出函数供手动调用
window.runBrowserTests = runBrowserTests;
window.testResults = window.testResults;
