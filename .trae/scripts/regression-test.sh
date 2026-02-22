#!/bin/bash

# 回归测试脚本 - 确保新功能不破坏已有功能
# 用法: ./regression-test.sh [功能名]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 帮助信息
show_help() {
    echo "回归测试脚本"
    echo ""
    echo "用法:"
    echo "  ./regression-test.sh [功能名]"
    echo ""
    echo "示例:"
    echo "  ./regression-test.sh              # 运行全部回归测试"
    echo "  ./regression-test.sh course-schedule  # 只测试与 course-schedule 相关的"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
}

# 参数解析
if [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

FEATURE_NAME="${1:-}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  回归测试${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ -n "$FEATURE_NAME" ]; then
    echo -e "测试范围: 与 $FEATURE_NAME 相关的功能"
else
    echo -e "测试范围: 全部功能"
fi
echo ""

# 初始化计数器
ERRORS=0
WARNINGS=0

# 检查测试基线
check_test_baseline() {
    echo -e "${BLUE}【检查测试基线】${NC}"
    
    # 检查是否有测试文件
    if [ ! -d "src" ] || [ -z "$(find src -name '*.test.ts' -o -name '*.test.tsx' 2>/dev/null)" ]; then
        echo -e "${YELLOW}  ⚠️  未找到测试文件，建议添加测试${NC}"
        ((WARNINGS++))
        return
    fi
    
    echo -e "${GREEN}  ✅ 找到测试文件${NC}"
}

# 运行单元测试
run_unit_tests() {
    echo -e "${BLUE}【运行单元测试】${NC}"
    
    if npm test -- --passWithNoTests --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 单元测试通过${NC}"
    else
        echo -e "${RED}  ❌ 单元测试失败${NC}"
        ((ERRORS++))
    fi
}

# 运行集成测试
run_integration_tests() {
    echo -e "${BLUE}【运行集成测试】${NC}"
    
    if npm run test:integration --silent 2>/dev/null || npm test -- --testPathPattern="integration" --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 集成测试通过${NC}"
    else
        echo -e "${YELLOW}  ⚠️  集成测试未通过或未配置${NC}"
        ((WARNINGS++))
    fi
}

# 检查核心功能
check_core_features() {
    echo -e "${BLUE}【检查核心功能】${NC}"
    
    # 定义核心功能列表
    CORE_FEATURES=(
        "course:课程管理"
        "schedule:排课功能"
        "teacher:教师管理"
        "student:学生管理"
    )
    
    for feature in "${CORE_FEATURES[@]}"; do
        IFS=':' read -r key name <<< "$feature"
        
        # 检查是否有对应的测试
        if find src -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | grep -q "$key"; then
            echo -e "${GREEN}  ✅ $name 有测试覆盖${NC}"
        else
            echo -e "${YELLOW}  ⚠️  $name 缺少测试覆盖${NC}"
            ((WARNINGS++))
        fi
    done
}

# 检查构建
run_build_check() {
    echo -e "${BLUE}【构建检查】${NC}"
    
    if npm run build --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 构建成功${NC}"
    else
        echo -e "${RED}  ❌ 构建失败${NC}"
        ((ERRORS++))
    fi
}

# 检查关键路径
check_critical_paths() {
    echo -e "${BLUE}【检查关键路径】${NC}"
    
    # 检查关键文件是否存在且没有语法错误
    CRITICAL_FILES=(
        "src/App.tsx"
        "src/main.tsx"
        "src/services/supabase.ts"
    )
    
    for file in "${CRITICAL_FILES[@]}"; do
        if [ -f "$file" ]; then
            # 使用 TypeScript 检查语法
            if npx tsc --noEmit "$file" 2>/dev/null; then
                echo -e "${GREEN}  ✅ $file 语法正确${NC}"
            else
                echo -e "${RED}  ❌ $file 有语法错误${NC}"
                ((ERRORS++))
            fi
        else
            echo -e "${YELLOW}  ⚠️  $file 不存在${NC}"
            ((WARNINGS++))
        fi
    done
}

# 运行所有检查
check_test_baseline
run_unit_tests
run_integration_tests
check_core_features
run_build_check
check_critical_paths

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  测试结果${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有回归测试通过！${NC}"
    echo -e "${GREEN}   新功能没有破坏已有功能。${NC}"
    echo ""
    echo -e "${BLUE}下一步:${NC}"
    echo "  1. 提交代码"
    echo "  2. 创建 Pull Request"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  回归测试完成，有 $WARNINGS 个警告。${NC}"
    echo -e "${YELLOW}   建议处理警告后再提交。${NC}"
    exit 0
else
    echo -e "${RED}❌ 回归测试失败，有 $ERRORS 个错误，$WARNINGS 个警告。${NC}"
    echo -e "${RED}   新功能可能破坏了已有功能，请修复后再提交。${NC}"
    echo ""
    echo -e "${BLUE}建议:${NC}"
    echo "  1. 检查失败的测试，了解破坏了什么功能"
    echo "  2. 修复代码，确保向后兼容"
    echo "  3. 重新运行回归测试"
    exit 1
fi
