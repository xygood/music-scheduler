#!/bin/bash

# Spec-Kit 文档质量检查脚本
# 用法: ./validate-spec.sh <功能目录路径>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 帮助信息
show_help() {
    echo "Spec-Kit 文档质量检查脚本"
    echo ""
    echo "用法:"
    echo "  ./validate-spec.sh <功能目录路径>"
    echo ""
    echo "示例:"
    echo "  ./validate-spec.sh specs/001-user-auth"
    echo "  ./validate-spec.sh specs/002-payment"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
}

# 参数解析
if [ $# -eq 0 ] || [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

FEATURE_DIR="$1"

if [ ! -d "$FEATURE_DIR" ]; then
    echo -e "${RED}错误: 目录不存在: $FEATURE_DIR${NC}"
    exit 1
fi

SPEC_FILE="$FEATURE_DIR/001-spec.md"
PLAN_FILE="$FEATURE_DIR/001-plan.md"
TASKS_FILE="$FEATURE_DIR/001-tasks.md"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  Spec-Kit 文档质量检查${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${BLUE}检查目录: $FEATURE_DIR${NC}"
echo ""

# 初始化计数器
ERRORS=0
WARNINGS=0

# 检查文件是否存在
check_file_exists() {
    local file="$1"
    local name="$2"
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ $name 不存在: $file${NC}"
        ((ERRORS++))
        return 1
    else
        echo -e "${GREEN}✅ $name 存在${NC}"
        return 0
    fi
}

# 检查必填内容
check_required_content() {
    local file="$1"
    local pattern="$2"
    local description="$3"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "${GREEN}  ✓ $description${NC}"
        return 0
    else
        echo -e "${YELLOW}  ⚠ $description (未找到)${NC}"
        ((WARNINGS++))
        return 1
    fi
}

# 检查待澄清标记
check_clarifications() {
    local file="$1"
    local count=$(grep -c "待澄清\|NEEDS CLARIFICATION\|\[待澄清\]" "$file" 2>/dev/null || echo "0")
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}  ⚠ 发现 $count 处待澄清标记${NC}"
        ((WARNINGS++))
        return 1
    else
        echo -e "${GREEN}  ✓ 无待澄清标记${NC}"
        return 0
    fi
}

echo -e "${BLUE}【文件检查】${NC}"
check_file_exists "$SPEC_FILE" "需求规格文档"
check_file_exists "$PLAN_FILE" "技术方案文档"
check_file_exists "$TASKS_FILE" "任务清单文档"

echo ""
echo -e "${BLUE}【需求规格检查】${NC}"
if [ -f "$SPEC_FILE" ]; then
    check_required_content "$SPEC_FILE" "用户故事" "用户故事"
    check_required_content "$SPEC_FILE" "包含功能\|In Scope" "功能范围（包含）"
    check_required_content "$SPEC_FILE" "验收标准" "验收标准"
    check_required_content "$SPEC_FILE" "技术约束" "技术约束"
    check_clarifications "$SPEC_FILE"
fi

echo ""
echo -e "${BLUE}【技术方案检查】${NC}"
if [ -f "$PLAN_FILE" ]; then
    check_required_content "$PLAN_FILE" "数据模型\|数据结构" "数据模型"
    check_required_content "$PLAN_FILE" "API\|接口" "API 设计"
    check_required_content "$PLAN_FILE" "实现步骤" "实现步骤"
    check_clarifications "$PLAN_FILE"
fi

echo ""
echo -e "${BLUE}【任务清单检查】${NC}"
if [ -f "$TASKS_FILE" ]; then
    check_required_content "$TASKS_FILE" "任务列表" "任务列表"
    check_required_content "$TASKS_FILE" "优先级" "任务优先级"
    check_required_content "$TASKS_FILE" "验收标准" "任务验收标准"
fi

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  检查结果${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！文档质量良好。${NC}"
    echo ""
    echo -e "${BLUE}下一步建议:${NC}"
    echo "  1. 开始技术方案设计"
    echo "  2. 完善 001-plan.md"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查完成，有 $WARNINGS 个警告。${NC}"
    echo -e "${YELLOW}   建议处理警告后再继续。${NC}"
    exit 0
else
    echo -e "${RED}❌ 检查完成，有 $ERRORS 个错误，$WARNINGS 个警告。${NC}"
    echo -e "${RED}   请先修复错误。${NC}"
    exit 1
fi
