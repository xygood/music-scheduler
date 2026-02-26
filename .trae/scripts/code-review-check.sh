#!/bin/bash

# 代码审查检查脚本
# 用法: ./code-review-check.sh <功能目录>

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 帮助信息
show_help() {
    echo "代码审查检查脚本"
    echo ""
    echo "用法:"
    echo "  ./code-review-check.sh <功能目录>"
    echo ""
    echo "示例:"
    echo "  ./code-review-check.sh specs/001-user-auth"
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
FEATURE_NAME=$(basename "$FEATURE_DIR" | sed 's/^[0-9]*-//')

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  代码审查检查${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "功能: $FEATURE_NAME"
echo ""

# 初始化计数器
ERRORS=0
WARNINGS=0

# 检查测试
check_tests() {
    echo -e "${BLUE}【测试检查】${NC}"
    
    # 检查是否有新功能测试
    if find src -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" -o -name "*.spec.tsx" 2>/dev/null | grep -q "$FEATURE_NAME"; then
        echo -e "${GREEN}  ✅ 新功能有测试文件${NC}"
    else
        echo -e "${YELLOW}  ⚠️  未找到新功能的测试文件${NC}"
        ((WARNINGS++))
    fi
    
    # 检查测试是否通过
    echo -e "${BLUE}  运行测试...${NC}"
    if npm test -- --passWithNoTests --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 所有测试通过${NC}"
    else
        echo -e "${RED}  ❌ 有测试失败${NC}"
        ((ERRORS++))
    fi
}

# 检查代码风格
check_lint() {
    echo -e "${BLUE}【代码风格检查】${NC}"
    
    if npm run lint --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 代码风格检查通过${NC}"
    else
        echo -e "${RED}  ❌ 代码风格检查失败${NC}"
        ((ERRORS++))
    fi
}

# 检查类型
check_types() {
    echo -e "${BLUE}【类型检查】${NC}"
    
    if npm run type-check --silent 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
        echo -e "${GREEN}  ✅ 类型检查通过${NC}"
    else
        echo -e "${RED}  ❌ 类型检查失败${NC}"
        ((ERRORS++))
    fi
}

# 检查构建
check_build() {
    echo -e "${BLUE}【构建检查】${NC}"
    
    if npm run build --silent 2>/dev/null; then
        echo -e "${GREEN}  ✅ 构建成功${NC}"
    else
        echo -e "${RED}  ❌ 构建失败${NC}"
        ((ERRORS++))
    fi
}

# 检查文档
check_docs() {
    echo -e "${BLUE}【文档检查】${NC}"
    
    # 检查 checklist
    if [ -f "$FEATURE_DIR/checklist.md" ]; then
        echo -e "${GREEN}  ✅ 质量检查清单存在${NC}"
    else
        echo -e "${YELLOW}  ⚠️  缺少质量检查清单${NC}"
        ((WARNINGS++))
    fi
    
    # 检查是否有 TODO 或 FIXME
    if grep -r "TODO\|FIXME" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | head -5; then
        echo -e "${YELLOW}  ⚠️  代码中有 TODO/FIXME，请确认是否解决${NC}"
        ((WARNINGS++))
    fi
}

# 检查敏感信息
check_sensitive() {
    echo -e "${BLUE}【安全检查】${NC}"
    
    # 检查是否提交了敏感信息
    if grep -r "password\|secret\|key\|token" src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules" | grep -E "(=|:)" | head -5; then
        echo -e "${YELLOW}  ⚠️  发现可能的敏感信息，请检查${NC}"
        ((WARNINGS++))
    else
        echo -e "${GREEN}  ✅ 未发现明显敏感信息${NC}"
    fi
}

# 运行所有检查
check_tests
check_lint
check_types
check_build
check_docs
check_sensitive

echo ""
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  检查结果${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！可以进行代码审查。${NC}"
    echo ""
    echo -e "${BLUE}下一步:${NC}"
    echo "  1. 提交代码: git add . && git commit -m 'feat: $FEATURE_NAME'"
    echo "  2. 推送到远程: git push origin feature/001-$FEATURE_NAME"
    echo "  3. 创建 Pull Request 进行代码审查"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  检查完成，有 $WARNINGS 个警告。${NC}"
    echo -e "${YELLOW}   建议处理警告后再提交。${NC}"
    exit 0
else
    echo -e "${RED}❌ 检查完成，有 $ERRORS 个错误，$WARNINGS 个警告。${NC}"
    echo -e "${RED}   请先修复错误。${NC}"
    exit 1
fi
