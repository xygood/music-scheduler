---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: "00000000000000000000000000000000"
    PropagateID: "00000000000000000000000000000000"
    ReservedCode1: 3044022022cf708b2c4dc972c77762b3a3c48ac698621d07aef0047d010a7534ed4f5ddf02202aeaf0633434a029ce2182d6f123f0ba2fed16c7dfca5512f18a346cd246f1a0
    ReservedCode2: 3045022049b833a753161fa489f781460339cc2c118123631d91120c3e796bd55aa32b70022100ac146624262740723df96d72514e0e614378d4862f4e85be068e95e3e8cbbcc0
---

# 全局通知系统使用指南

## 概述

音乐排课系统现已集成了全局通知系统，提供统一的用户反馈体验，包括：
- 成功/错误/警告/信息提示
- 确认对话框
- 加载状态指示器

## 使用方法

### 1. 在组件中导入通知 Hook

```typescript
import { useNotification } from '../contexts/NotificationContext';
```

### 2. 在组件中使用

```typescript
function MyComponent() {
  const { 
    showSuccess, 
    showError, 
    showWarning, 
    showInfo, 
    showNotification 
  } = useNotification();

  // 成功提示
  const handleSuccess = () => {
    showSuccess('操作成功！', '学生信息已成功保存。');
  };

  // 错误提示
  const handleError = () => {
    showError('操作失败', '请检查网络连接后重试。', 10000); // 显示10秒
  };

  // 警告提示
  const handleWarning = () => {
    showWarning('确认操作', '确定要删除这个学生吗？');
  };

  // 信息提示
  const handleInfo = () => {
    showInfo('系统提示', '系统将在5分钟后进行维护。');
  };

  // 自定义通知
  const handleCustom = () => {
    showNotification({
      type: NotificationType.SUCCESS,
      title: '自定义通知',
      message: '这是一个自定义通知',
      duration: 3000,
      action: {
        label: '查看详情',
        onClick: () => console.log('点击了查看详情')
      }
    });
  };

  return (
    <div>
      <button onClick={handleSuccess}>成功提示</button>
      <button onClick={handleError}>错误提示</button>
      <button onClick={handleWarning}>警告提示</button>
      <button onClick={handleInfo}>信息提示</button>
      <button onClick={handleCustom}>自定义通知</button>
    </div>
  );
}
```

### 3. 确认对话框

```typescript
import { ConfirmationDialog } from '../components/NotificationComponents';

function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const { showWarning } = useNotification();

  const handleDelete = () => {
    showWarning(
      '确认删除', 
      '确定要删除这个学生吗？此操作不可撤销。',
      '确认删除', 
      '取消',
      () => setShowDialog(true),
      () => console.log('用户取消了删除')
    );
  };

  const confirmDelete = () => {
    // 执行删除逻辑
    console.log('确认删除');
    setShowDialog(false);
  };

  return (
    <div>
      <button onClick={handleDelete}>删除学生</button>
      
      <ConfirmationDialog
        isOpen={showDialog}
        title="最终确认"
        message="这将是最后一次确认，确定要删除这个学生吗？"
        confirmLabel="确定删除"
        cancelLabel="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDialog(false)}
        type={NotificationType.ERROR}
      />
    </div>
  );
}
```

### 4. 加载指示器

```typescript
import { LoadingIndicator } from '../components/NotificationComponents';

function MyComponent() {
  const [loading, setLoading] = useState(false);

  const handleAsyncOperation = async () => {
    setLoading(true);
    try {
      // 异步操作
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('操作完成');
    } catch (error) {
      console.error('操作失败', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleAsyncOperation}>
        执行异步操作
      </button>
      
      <LoadingIndicator 
        isLoading={loading} 
        message="正在处理，请稍候..."
        overlay={true} // 或 false 表示内联显示
      />
    </div>
  );
}
```

## 通知类型

### NotificationType 枚举
- `SUCCESS`: 成功通知（绿色）
- `ERROR`: 错误通知（红色）
- `WARNING`: 警告通知（黄色）
- `INFO`: 信息通知（蓝色）

## 特性

### 自动消失
- 默认自动消失时间：5秒
- 错误通知：8秒
- 可通过 `duration` 参数自定义（0 表示不自动消失）

### 键盘支持
- 按 `ESC` 键关闭当前焦点通知

### 进度条
- 显示剩余时间
- 渐变动画效果

### 响应式设计
- 在移动设备上自适应
- 支持触摸操作

## 最佳实践

1. **选择合适的通知类型**
   - 成功操作 → `SUCCESS`
   - 验证错误 → `ERROR`
   - 确认操作 → `WARNING`
   - 一般信息 → `INFO`

2. **提供有意义的标题和消息**
   - 标题要简洁明了
   - 消息要详细说明

3. **合理设置显示时间**
   - 简短信息：3-5秒
   - 重要错误：8-10秒
   - 永久显示：0（需要用户手动关闭）

4. **重要操作使用确认对话框**
   - 删除操作
   - 批量操作
   - 数据修改

## 示例：在现有组件中使用

### 在学生管理页面中使用

```typescript
// 在 Students.tsx 中
import { useNotification } from '../contexts/NotificationContext';

function Students() {
  const { showSuccess, showError, showWarning } = useNotification();

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await deleteStudent(studentId);
      showSuccess('删除成功', '学生信息已成功删除。');
    } catch (error) {
      showError('删除失败', '无法删除学生信息，请重试。');
    }
  };

  const handleImportStudents = async (file: File) => {
    setLoading(true);
    try {
      await importStudentsFromFile(file);
      showSuccess('导入成功', '学生信息导入完成。');
    } catch (error) {
      showError('导入失败', '文件格式错误或网络问题。');
    } finally {
      setLoading(false);
    }
  };

  // ... 组件其他部分
}
```

这个通知系统将大大提升用户体验，让操作反馈更加清晰和一致。