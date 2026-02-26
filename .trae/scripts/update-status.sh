#!/bin/bash

# Spec-Kit 状态更新脚本
# 用法: ./update-status.sh <功能目录> <状态> [备注]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 帮助信息
show_help() {
    echo "Spec-Kit 状态更新脚本"
    echo ""
    echo "用法:"
    echo "  ./update-status.sh <功能目录> <状态> [备注]"
    echo ""
    echo "示例:"
    echo "  ./update-status.sh specs/001-user-auth '进行中' '开始编码'"
    echo "  ./update-status.sh specs/001-user-auth '已完成' '所有测试通过'"
    echo ""
    echo "状态选项:"
    echo "  草稿, 审核中, 进行中, 已完成, 已废弃"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
}

# 参数解析
if [ $# -lt 2 ] || [ "$1" == "-h" ] || [ "$1" == "--help" ]; then
    show_help
    exit 0
fi

FEATURE_DIR="$1"
NEW_STATUS="$2"
REMARK="${3:-}"
DATE=$(date +%Y-%m-%d)

if [ ! -d "$FEATURE_DIR" ]; then
    echo -e "${RED}错误: 目录不存在: $FEATURE_DIR${NC}"
    exit 1
fi

# 状态图标
get_status_icon() {
    case "$1" in
        "草稿") echo "📝" ;;
        "审核中") echo "👀" ;;
        "进行中") echo "🔄" ;;
        "已完成") echo "✅" ;;
        "已废弃") echo "🗑️" ;;
        *) echo "📋" ;;
    esac
}

ICON=$(get_status_icon "$NEW_STATUS")

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  更新功能状态${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "功能目录: $FEATURE_DIR"
echo -e "新状态: $ICON $NEW_STATUS"
[ -n "$REMARK" ] && echo -e "备注: $REMARK"
echo ""

# 更新所有文档中的状态
for file in "$FEATURE_DIR"/001-*.md; do
    if [ -f "$file" ]; then
        # 使用 sed 更新状态行
        if grep -q "^\- \*\*状态\*\*:" "$file"; then
            sed -i.bak "s/^\(- \*\*状态\*\*:\).*/\1 $ICON $NEW_STATUS/" "$file"
            rm -f "$file.bak"
            echo -e "${GREEN}✅ 已更新: $(basename "$file")${NC}"
        fi
        
        # 更新最后更新时间
        if grep -q "^\*\*最后更新\*\*:" "$file"; then
            sed -i.bak "s/^\(\*\*最后更新\*\*:\).*/\1 $DATE/" "$file"
            rm -f "$file.bak"
        fi
    fi
done

# 追加到历史记录
HISTORY_FILE="$FEATURE_DIR/history.md"
if [ ! -f "$HISTORY_FILE" ]; then
    echo "# 变更历史" > "$HISTORY_FILE"
    echo "" >> "$HISTORY_FILE"
fi

echo "- **$DATE**: 状态变更为 [$NEW_STATUS]" >> "$HISTORY_FILE"
[ -n "$REMARK" ] && echo "  - 备注: $REMARK" >> "$HISTORY_FILE"

echo -e "${GREEN}✅ 状态更新完成!${NC}"
echo ""
echo -e "${BLUE}已记录到: $HISTORY_FILE${NC}"
