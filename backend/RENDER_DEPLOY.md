---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3046022100aca4250fb7db1abf9103d3f1033e3aa8ca22df887778b9a4cdda802b419418c1022100f7595a75c9f9459777561c57c850bfbbad5632f8c42a3aef900f10dfeab5414e
    ReservedCode2: 3046022100dc8290fbdf1f9c1abf50c8804d5f79da9bfc50a876f19bce1638d4e881c6ea450221009172e311ee8ce2c786d6651da62ee6642c99f2d3e137bc1c56063e9446719a36
---

# Render.com 部署指南

## 步骤一：注册Render账号

1. 打开浏览器，访问 [https://render.com](https://render.com)
2. 点击 "Get Started" 注册账号
3. 推荐使用 GitHub 账号直接登录（更方便）

## 步骤二：连接GitHub仓库

1. 登录Render后台后，点击右上角的 "New" 按钮
2. 选择 "Web Service"
3. 如果还没连接GitHub，点击 "Connect GitHub" 并授权
4. 在弹出窗口中，选择您的代码仓库

## 步骤三：配置部署参数

在配置页面中，填写以下信息：

- **Name**: `music-scheduler-api` (或自定义名称)
- **Root Directory**: `backend` (重要！填入backend目录)
- **Environment**: `Python`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python teacher_management.py`

### 环境变量配置（关键步骤）

在 "Advanced" 部分添加以下环境变量：

- **Key**: `PYTHON_VERSION`
- **Value**: `3.9`

## 步骤四：创建并部署

1. 检查所有配置是否正确
2. 点击 "Create Web Service" 按钮
3. 等待构建和部署完成（首次部署约2-5分钟）
4. 看到绿色 "Live" 状态表示部署成功

## 步骤五：获取API地址

部署成功后，您会看到类似这样的URL：
```
https://music-scheduler-api.onrender.com
```

这就是您的在线API地址！

## 测试API

部署成功后，可以用以下方式测试：

### 1. 浏览器直接访问
```
https://music-scheduler-api.onrender.com/api/teachers
```

### 2. 使用curl测试
```bash
# 测试教师API
curl https://music-scheduler-api.onrender.com/api/teachers

# 测试课程API
curl https://music-scheduler-api.onrender.com/api/courses
```

### 3. 前端配置

修改前端代码中的API地址：
- 编辑 `src/services/localStorage.ts`
- 将 `API_BASE_URL` 改为您的Render地址：
```typescript
export const API_BASE_URL = 'https://music-scheduler-api.onrender.com';
```

## 重要注意事项

### 1. 免费额度限制
- Render免费计划每月有750小时运行时间
- 服务在15分钟无活动后会自动休眠
- 首次访问可能需要等待几秒唤醒

### 2. 数据持久化
- 免费计划不支持持久化存储
- 数据存储在内存中，重启后会重置
- 如需持久化数据，建议升级到付费计划或使用数据库

### 3. CORS配置
- 后端已配置CORS，支持跨域请求
- 前端可以直接调用Render上的API

## 常见问题

### Q: 部署失败怎么办？
A: 查看Render构建日志，通常是依赖问题或代码错误

### Q: API访问超时？
A: 免费实例休眠后首次访问较慢，属于正常现象

### Q: 如何更新部署？
A: 推送代码到GitHub，Render会自动重新部署

## 快速参考

- **Render官网**: https://render.com
- **Dashboard**: https://dashboard.render.com
- **免费额度**: 750小时/月
- **休眠策略**: 15分钟无活动自动休眠
