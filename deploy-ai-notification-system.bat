@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 🚀 AI通知系统一键部署脚本 (Windows版本)
REM 使用方法: deploy-ai-notification-system.bat

echo.
echo 🤖 AI通知系统一键部署脚本
echo ================================
echo.

REM 检查依赖
echo.
echo ================================
echo 检查系统依赖
echo ================================
echo.

REM 检查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js: !NODE_VERSION!

REM 检查npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm未安装，请先安装npm
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm: !NPM_VERSION!

REM 检查Supabase CLI
where supabase >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Supabase CLI未安装，请先安装: npm install -g supabase
    echo 或者手动部署Edge Functions
) else (
    for /f "tokens=*" %%i in ('supabase --version') do set SUPABASE_VERSION=%%i
    echo ✅ Supabase CLI: !SUPABASE_VERSION!
)

REM 检查git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  git未安装，某些功能可能受限
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo ✅ git: !GIT_VERSION!
)

REM 检查环境变量
echo.
echo ================================
echo 检查环境变量
echo ================================
echo.

REM 检查.env文件
if exist ".env.local" (
    echo ✅ 找到.env.local文件
    for /f "usebackq delims=" %%a in (".env.local") do (
        set "%%a"
    )
) else if exist ".env" (
    echo ✅ 找到.env文件
    for /f "usebackq delims=" %%a in (".env") do (
        set "%%a"
    )
) else (
    echo ⚠️  未找到环境变量文件，请手动设置
)

REM 检查必要的环境变量
set MISSING_VARS=
if "%SUPABASE_URL%"=="" set MISSING_VARS=!MISSING_VARS! SUPABASE_URL
if "%SUPABASE_SERVICE_ROLE_KEY%"=="" set MISSING_VARS=!MISSING_VARS! SUPABASE_SERVICE_ROLE_KEY
if "%SUPABASE_ANON_KEY%"=="" set MISSING_VARS=!MISSING_VARS! SUPABASE_ANON_KEY

if not "!MISSING_VARS!"=="" (
    echo ❌ 缺少必要的环境变量: !MISSING_VARS!
    echo 请设置这些环境变量后重试
    pause
    exit /b 1
)

echo ✅ 环境变量检查通过

REM 安装依赖
echo.
echo ================================
echo 安装项目依赖
echo ================================
echo.

if exist "package.json" (
    echo ℹ️  安装npm依赖...
    npm install
    echo ✅ npm依赖安装完成
) else (
    echo ⚠️  未找到package.json，跳过npm依赖安装
)

REM 部署数据库迁移
echo.
echo ================================
echo 部署数据库迁移
echo ================================
echo.

set MIGRATION_FILE=supabase\migrations\20250813_000007_ai_notification_triggers.sql

if not exist "!MIGRATION_FILE!" (
    echo ❌ 迁移文件不存在: !MIGRATION_FILE!
    pause
    exit /b 1
)

echo ℹ️  请在Supabase Dashboard ^> SQL Editor中运行以下迁移文件:
echo 📁 !MIGRATION_FILE!
echo.
echo ℹ️  或者使用Supabase CLI:
echo supabase db push
echo.
set /p DUMMY=按回车键继续...

REM 部署Edge Functions
echo.
echo ================================
echo 部署Edge Functions
echo ================================
echo.

set FUNCTION_DIR=supabase\functions\notify-worker

if not exist "!FUNCTION_DIR!" (
    echo ❌ Edge Function目录不存在: !FUNCTION_DIR!
    pause
    exit /b 1
)

where supabase >nul 2>nul
if %errorlevel% equ 0 (
    echo ℹ️  使用Supabase CLI部署...
    cd /d "!FUNCTION_DIR!"
    supabase functions deploy notify-worker
    cd /d "%~dp0"
    echo ✅ Edge Function部署完成
) else (
    echo ⚠️  Supabase CLI未安装，请手动部署:
    echo 1. 进入目录: cd !FUNCTION_DIR!
    echo 2. 部署函数: supabase functions deploy notify-worker
    echo 3. 或在Supabase Dashboard中手动部署
)

REM 配置GitHub Actions
echo.
echo ================================
echo 配置GitHub Actions
echo ================================
echo.

set WORKFLOW_FILE=.github\workflows\notify-cron.yml

if not exist "!WORKFLOW_FILE!" (
    echo ❌ GitHub Actions工作流文件不存在: !WORKFLOW_FILE!
    pause
    exit /b 1
)

where git >nul 2>nul
if %errorlevel% equ 0 (
    if exist ".git" (
        echo ℹ️  检测到Git仓库，配置GitHub Actions...
        
        REM 检查是否已配置remote
        for /f "tokens=*" %%i in ('git remote get-url origin 2^>nul') do (
            echo ℹ️  GitHub仓库: %%i
            echo.
            echo ℹ️  请在GitHub仓库中设置以下Secrets:
            echo 🔐 SUPABASE_URL: %SUPABASE_URL%
            echo 🔐 SUPABASE_ANON_KEY: %SUPABASE_ANON_KEY%
            echo 🔐 CRON_SECRET: your-random-secret
            echo.
            echo ℹ️  设置步骤:
            echo 1. 进入GitHub仓库 ^> Settings ^> Secrets and variables ^> Actions
            echo 2. 点击 'New repository secret'
            echo 3. 添加上述三个secrets
            echo 4. 推送代码到GitHub: git push origin main
        )
    ) else (
        echo ⚠️  未检测到Git仓库，请手动配置GitHub Actions
    )
) else (
    echo ⚠️  未检测到Git，请手动配置GitHub Actions
)

REM 配置环境变量
echo.
echo ================================
echo 配置环境变量
echo ================================
echo.

set ENV_FILE=supabase\functions\notify-worker\env.example
set TARGET_ENV=.env.local

if exist "!ENV_FILE!" (
    if not exist "!TARGET_ENV!" (
        echo ℹ️  创建环境变量文件...
        copy "!ENV_FILE!" "!TARGET_ENV!" >nul
        echo ✅ 环境变量文件已创建: !TARGET_ENV!
        echo ℹ️  请编辑此文件并填入实际的API密钥
    ) else (
        echo ✅ 环境变量文件已存在: !TARGET_ENV!
    )
    
    echo.
    echo ℹ️  需要在Supabase Dashboard中设置以下环境变量:
    echo 🔑 OPENAI_API_KEY: 你的OpenAI API密钥
    echo 🔑 RESEND_API_KEY: 你的Resend API密钥
    echo 🔑 MAIL_FROM: 你的验证邮箱
    echo 🔑 CRON_SECRET: 随机密钥
    echo.
    echo ℹ️  设置步骤:
    echo 1. 进入Supabase Dashboard ^> Settings ^> Edge Functions
    echo 2. 找到notify-worker函数
    echo 3. 添加上述环境变量
    
) else (
    echo ⚠️  环境变量模板文件不存在: !ENV_FILE!
)

REM 运行测试
echo.
echo ================================
echo 运行系统测试
echo ================================
echo.

set TEST_FILE=test-ai-notification-system.js

if not exist "!TEST_FILE!" (
    echo ❌ 测试文件不存在: !TEST_FILE!
    pause
    exit /b 1
)

echo ℹ️  检查测试环境...

REM 检查必要的依赖
node -e "require('@supabase/supabase-js')" >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  缺少@supabase/supabase-js依赖，安装中...
    npm install @supabase/supabase-js dotenv
)

echo ℹ️  运行测试脚本...
echo ⚠️  注意: 测试会创建和删除测试数据
echo.
set /p RUN_TEST=是否运行测试? (y/N): 
if /i "!RUN_TEST!"=="y" (
    node "!TEST_FILE!"
    echo ✅ 测试完成
) else (
    echo ℹ️  跳过测试
)

REM 显示部署状态
echo.
echo ================================
echo 部署状态检查
echo ================================
echo.

echo ℹ️  请检查以下项目是否配置正确:
echo.
echo 📊 数据库:
echo   - 运行迁移文件: supabase\migrations\20250813_000007_ai_notification_triggers.sql
echo   - 检查触发器是否创建
echo.
echo 🔧 Edge Functions:
echo   - notify-worker函数是否部署成功
echo   - 环境变量是否配置
echo.
echo 🔄 GitHub Actions:
echo   - 工作流文件是否推送
echo   - Secrets是否配置
echo.
echo 🧪 测试:
echo   - 运行测试脚本验证功能
echo   - 检查邮件是否正常发送

REM 显示使用说明
echo.
echo ================================
echo 使用说明
echo ================================
echo.

echo 🎯 系统功能:
echo   - 自动监听数据库变化
echo   - AI生成个性化文案
echo   - 自动发送邮件通知
echo   - 完整的日志记录
echo.
echo 📱 支持的通知类型:
echo   - 新join request (通知主办方)
echo   - 申请批准/拒绝 (通知申请者)
echo   - 位置解锁 (通知所有参与者)
echo.
echo 🔍 监控和调试:
echo   - 查看通知队列状态
echo   - 检查发送日志
echo   - 手动触发通知
echo.
echo 📚 更多信息请查看: AI_NOTIFICATION_SYSTEM_README.md

echo.
echo ================================
echo 🎉 部署完成！
echo ================================
echo.
echo ✅ 你的AI通知系统已经配置完成！
echo ℹ️  请按照上述说明完成剩余的配置步骤
echo ℹ️  如有问题，请查看README文档或检查日志
echo.
pause

