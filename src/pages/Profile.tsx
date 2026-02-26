import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Lock, Check, X, Eye, EyeOff, CreditCard } from 'lucide-react';
import { authService } from '../services';

export default function Profile() {
  const { user, teacher } = useAuth();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 修改密码相关状态
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // 如果用户未登录，显示加载中
  if (!user) {
    return (
      <div className="animate-fade-in max-w-2xl">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  const handleChangePassword = async () => {
    // 验证输入
    if (!currentPassword) {
      setMessage({ type: 'error', text: '请输入当前密码' });
      return;
    }
    if (!newPassword) {
      setMessage({ type: 'error', text: '请输入新密码' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码长度至少为6位' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setMessage({ type: 'success', text: '密码修改成功！' });
      // 清空密码输入框
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '密码修改失败，请检查当前密码是否正确' });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <User className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="page-title">个人资料</h1>
          <p className="text-sm text-gray-500">查看您的账户信息</p>
        </div>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* 基本信息 */}
      <div className="card mb-6">
        <h2 className="section-title mb-4">基本信息</h2>
        <div className="space-y-4">
          {/* 姓名 - 只读 */}
          <div>
            <label className="label">姓名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={teacher?.full_name || user?.full_name || '-'}
                className="input pl-10 bg-gray-50"
                disabled
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">姓名由管理员统一管理，如需修改请联系管理员</p>
          </div>

          {/* 工号 - 只读 */}
          <div>
            <label className="label">工号</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={teacher?.teacher_id || user?.work_id || '-'}
                className="input pl-10 bg-gray-50"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* 修改密码 */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-purple-600" />
          <h2 className="section-title">修改密码</h2>
        </div>

        <div className="space-y-4">
          {/* 当前密码 */}
          <div>
            <label className="label">当前密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="请输入当前密码"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 新密码 */}
          <div>
            <label className="label">新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="请输入新密码（至少6位）"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* 确认新密码 */}
          <div>
            <label className="label">确认新密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-10 pr-10"
                placeholder="请再次输入新密码"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* 修改密码按钮 */}
        <div className="mt-6">
          <button
            onClick={handleChangePassword}
            disabled={changingPassword}
            className="btn-primary px-6 py-2 disabled:opacity-50"
          >
            {changingPassword ? '修改中...' : '修改密码'}
          </button>
        </div>
      </div>
    </div>
  );
}
