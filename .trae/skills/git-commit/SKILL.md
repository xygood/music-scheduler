---
name: "git-commit"
description: "Git commit and push assistant. Invoke when user wants to commit code, push to GitHub, or asks about version control."
---

# Git Commit Skill

Git 提交助手，帮助用户将代码提交到 GitHub，并清晰展示版本差异。

## 使用场景

- 用户说 "提交代码"、"commit"、"push"
- 用户想查看当前变更
- 用户想了解版本差异

## 工作流程

### Step 1: 检查状态

```bash
git status
```

### Step 2: 展示变更差异

```bash
# 查看已暂存的变更
git diff --cached --stat
git diff --cached

# 查看未暂存的变更
git diff --stat
git diff
```

### Step 3: 确认提交内容

向用户展示：
1. **新增文件** (绿色)
2. **修改文件** (黄色)
3. **删除文件** (红色)
4. **变更统计** (增加/删除行数)

### Step 4: 生成提交信息

根据变更内容自动生成规范的提交信息：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**提交类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `test`: 测试
- `chore`: 构建/工具

### Step 5: 执行提交

```bash
# 添加所有变更
git add .

# 或选择性添加
git add <files>

# 提交
git commit -m "<message>"
```

### Step 6: 推送到远程

```bash
# 首次推送（设置上游分支）
git push -u origin main

# 后续推送
git push
```

## 变更差异展示格式

### 简洁模式 (默认)

```
📁 变更文件统计:
  src/components/Button.tsx    +15  -3
  src/styles/button.css        +8   -0
  tests/button.test.ts         +25  -0
  
📊 总计: 3 files changed, 48 insertions(+), 3 deletions(-)
```

### 详细模式

```
📝 src/components/Button.tsx
─────────────────────────────
  - const oldCode = 'before';
  + const newCode = 'after';
  + const addedFeature = true;
```

## 首次推送设置

如果项目还没有关联远程仓库：

```bash
# 添加远程仓库
git remote add origin <repository-url>

# 首次推送
git push -u origin main
```

## 质量检查 (可选)

提交前可运行：

```bash
# 代码检查
npm run lint

# 类型检查
npm run typecheck

# 测试
npm test
```

## 注意事项

1. **提交前确认**: 展示变更内容，让用户确认
2. **提交信息规范**: 遵循 Conventional Commits
3. **敏感信息检查**: 不提交 .env、密钥等
4. **大文件处理**: 使用 .gitignore 排除

## 快捷命令

| 命令 | 说明 |
|------|------|
| `git status` | 查看状态 |
| `git diff` | 查看未暂存变更 |
| `git diff --cached` | 查看已暂存变更 |
| `git log --oneline -10` | 查看最近10次提交 |
| `git log -p -1` | 查看最近一次提交详情 |

## 交互示例

**用户**: "提交代码"

**助手**:
```
📋 当前变更状态:

新增文件:
  + src/features/newFeature.ts

修改文件:
  ~ src/App.tsx (+12, -3)
  ~ package.json (+2, -0)

📊 统计: 3 files changed, 14 insertions(+), 3 deletions(-)

建议提交信息:
  feat(newFeature): 添加新功能模块

确认提交? (y/n)
```
