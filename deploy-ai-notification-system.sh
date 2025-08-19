#!/bin/bash

# 🚀 AI通知系统一键部署脚本
# 使用方法: ./deploy-ai-notification-system.sh

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印函数
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}\n"
}

# 检查依赖
check_dependencies() {
    print_header "检查系统依赖"
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装，请先安装Node.js"
        exit 1
    fi
    print_success "Node.js: $(node --version)"
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        print_error "npm未安装，请先安装npm"
        exit 1
    fi
    print_success "npm: $(npm --version)"
    
    # 检查Supabase CLI
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI未安装，请先安装: npm install -g supabase"
        print_info "或者手动部署Edge Functions"
    else
        print_success "Supabase CLI: $(supabase --version)"
    fi
    
    # 检查git
    if ! command -v git &> /dev/null; then
        print_warning "git未安装，某些功能可能受限"
    else
        print_success "git: $(git --version)"
    fi
}

# 检查环境变量
check_environment() {
    print_header "检查环境变量"
    
    # 检查.env文件
    if [ -f ".env.local" ]; then
        print_success "找到.env.local文件"
        source .env.local
    elif [ -f ".env" ]; then
        print_success "找到.env文件"
        source .env
    else
        print_warning "未找到环境变量文件，请手动设置"
    fi
    
    # 检查必要的环境变量
    local missing_vars=()
    
    if [ -z "$SUPABASE_URL" ]; then
        missing_vars+=("SUPABASE_URL")
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        missing_vars+=("SUPABASE_SERVICE_ROLE_KEY")
    fi
    
    if [ -z "$SUPABASE_ANON_KEY" ]; then
        missing_vars+=("SUPABASE_ANON_KEY")
    fi
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_error "缺少必要的环境变量: ${missing_vars[*]}"
        print_info "请设置这些环境变量后重试"
        exit 1
    fi
    
    print_success "环境变量检查通过"
}

# 安装依赖
install_dependencies() {
    print_header "安装项目依赖"
    
    if [ -f "package.json" ]; then
        print_info "安装npm依赖..."
        npm install
        print_success "npm依赖安装完成"
    else
        print_warning "未找到package.json，跳过npm依赖安装"
    fi
}

# 部署数据库迁移
deploy_database() {
    print_header "部署数据库迁移"
    
    local migration_file="supabase/migrations/20250813_000007_ai_notification_triggers.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "迁移文件不存在: $migration_file"
        exit 1
    fi
    
    print_info "请在Supabase Dashboard > SQL Editor中运行以下迁移文件:"
    echo "📁 $migration_file"
    echo ""
    print_info "或者使用Supabase CLI:"
    echo "supabase db push"
    
    read -p "按回车键继续..."
}

# 部署Edge Functions
deploy_edge_functions() {
    print_header "部署Edge Functions"
    
    local function_dir="supabase/functions/notify-worker"
    
    if [ ! -d "$function_dir" ]; then
        print_error "Edge Function目录不存在: $function_dir"
        exit 1
    fi
    
    if command -v supabase &> /dev/null; then
        print_info "使用Supabase CLI部署..."
        cd "$function_dir"
        supabase functions deploy notify-worker
        cd - > /dev/null
        print_success "Edge Function部署完成"
    else
        print_warning "Supabase CLI未安装，请手动部署:"
        echo "1. 进入目录: cd $function_dir"
        echo "2. 部署函数: supabase functions deploy notify-worker"
        echo "3. 或在Supabase Dashboard中手动部署"
    fi
}

# 配置GitHub Actions
setup_github_actions() {
    print_header "配置GitHub Actions"
    
    local workflow_file=".github/workflows/notify-cron.yml"
    
    if [ ! -f "$workflow_file" ]; then
        print_error "GitHub Actions工作流文件不存在: $workflow_file"
        exit 1
    fi
    
    if command -v git &> /dev/null && [ -d ".git" ]; then
        print_info "检测到Git仓库，配置GitHub Actions..."
        
        # 检查是否已配置remote
        if git remote get-url origin &> /dev/null; then
            print_info "GitHub仓库: $(git remote get-url origin)"
            
            print_info "请在GitHub仓库中设置以下Secrets:"
            echo "🔐 SUPABASE_URL: $SUPABASE_URL"
            echo "🔐 SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY"
            echo "🔐 CRON_SECRET: $(openssl rand -hex 16 2>/dev/null || echo 'your-random-secret')"
            
            print_info "设置步骤:"
            echo "1. 进入GitHub仓库 > Settings > Secrets and variables > Actions"
            echo "2. 点击 'New repository secret'"
            echo "3. 添加上述三个secrets"
            echo "4. 推送代码到GitHub: git push origin main"
            
        else
            print_warning "未配置GitHub remote，请手动配置"
        fi
    else
        print_warning "未检测到Git仓库，请手动配置GitHub Actions"
    fi
}

# 配置环境变量
setup_environment_variables() {
    print_header "配置环境变量"
    
    local env_file="supabase/functions/notify-worker/env.example"
    local target_env=".env.local"
    
    if [ -f "$env_file" ]; then
        if [ ! -f "$target_env" ]; then
            print_info "创建环境变量文件..."
            cp "$env_file" "$target_env"
            print_success "环境变量文件已创建: $target_env"
            print_info "请编辑此文件并填入实际的API密钥"
        else
            print_success "环境变量文件已存在: $target_env"
        fi
        
        print_info "需要在Supabase Dashboard中设置以下环境变量:"
        echo "🔑 OPENAI_API_KEY: 你的OpenAI API密钥"
        echo "🔑 RESEND_API_KEY: 你的Resend API密钥"
        echo "🔑 MAIL_FROM: 你的验证邮箱"
        echo "🔑 CRON_SECRET: 随机密钥"
        
        print_info "设置步骤:"
        echo "1. 进入Supabase Dashboard > Settings > Edge Functions"
        echo "2. 找到notify-worker函数"
        echo "3. 添加上述环境变量"
        
    else
        print_warning "环境变量模板文件不存在: $env_file"
    fi
}

# 运行测试
run_tests() {
    print_header "运行系统测试"
    
    local test_file="test-ai-notification-system.js"
    
    if [ ! -f "$test_file" ]; then
        print_error "测试文件不存在: $test_file"
        exit 1
    fi
    
    print_info "检查测试环境..."
    
    # 检查必要的依赖
    if ! node -e "require('@supabase/supabase-js')" &> /dev/null; then
        print_warning "缺少@supabase/supabase-js依赖，安装中..."
        npm install @supabase/supabase-js dotenv
    fi
    
    print_info "运行测试脚本..."
    print_warning "注意: 测试会创建和删除测试数据"
    
    read -p "是否运行测试? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        node "$test_file"
        print_success "测试完成"
    else
        print_info "跳过测试"
    fi
}

# 显示部署状态
show_deployment_status() {
    print_header "部署状态检查"
    
    print_info "请检查以下项目是否配置正确:"
    echo ""
    echo "📊 数据库:"
    echo "  - 运行迁移文件: supabase/migrations/20250813_000007_ai_notification_triggers.sql"
    echo "  - 检查触发器是否创建"
    echo ""
    echo "🔧 Edge Functions:"
    echo "  - notify-worker函数是否部署成功"
    echo "  - 环境变量是否配置"
    echo ""
    echo "🔄 GitHub Actions:"
    echo "  - 工作流文件是否推送"
    echo "  - Secrets是否配置"
    echo ""
    echo "🧪 测试:"
    echo "  - 运行测试脚本验证功能"
    echo "  - 检查邮件是否正常发送"
}

# 显示使用说明
show_usage() {
    print_header "使用说明"
    
    echo "🎯 系统功能:"
    echo "  - 自动监听数据库变化"
    echo "  - AI生成个性化文案"
    echo "  - 自动发送邮件通知"
    echo "  - 完整的日志记录"
    echo ""
    echo "📱 支持的通知类型:"
    echo "  - 新join request (通知主办方)"
    echo "  - 申请批准/拒绝 (通知申请者)"
    echo "  - 位置解锁 (通知所有参与者)"
    echo ""
    echo "🔍 监控和调试:"
    echo "  - 查看通知队列状态"
    echo "  - 检查发送日志"
    echo "  - 手动触发通知"
    echo ""
    echo "📚 更多信息请查看: AI_NOTIFICATION_SYSTEM_README.md"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "🤖 AI通知系统一键部署脚本"
    echo "================================"
    echo -e "${NC}"
    
    # 检查依赖
    check_dependencies
    
    # 检查环境变量
    check_environment
    
    # 安装依赖
    install_dependencies
    
    # 部署数据库
    deploy_database
    
    # 部署Edge Functions
    deploy_edge_functions
    
    # 配置GitHub Actions
    setup_github_actions
    
    # 配置环境变量
    setup_environment_variables
    
    # 运行测试
    run_tests
    
    # 显示部署状态
    show_deployment_status
    
    # 显示使用说明
    show_usage
    
    print_header "🎉 部署完成！"
    print_success "你的AI通知系统已经配置完成！"
    print_info "请按照上述说明完成剩余的配置步骤"
    print_info "如有问题，请查看README文档或检查日志"
}

# 运行主函数
main "$@"

