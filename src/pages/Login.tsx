import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Music, Lock, Eye, EyeOff, User, Users, ArrowRightLeft, X } from 'lucide-react';

export default function Login() {
  const { signIn, error: authError, loggedInUsers, switchUser, removeFromLoggedInList } = useAuth();
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [switchingUserId, setSwitchingUserId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(teacherId, password);
    } catch (err: any) {
      setError(err.message || '登录失败，请检查工号和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchUser = async (userId: string) => {
    setSwitchingUserId(userId);
    try {
      await switchUser(userId);
    } catch (err) {
      setError('切换用户失败');
    } finally {
      setSwitchingUserId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full opacity-20 blur-3xl"></div>
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          {/* 学校logo */}
          <div className="mb-6">
            <img
              src="/wuchang-logo.png"
              alt="武昌理工学院"
              className="h-16 mx-auto object-contain"
            />
          </div>

          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">音乐系课程管理系统</h1>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">教师登录</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">工号</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  className="input pl-10 font-mono"
                  placeholder="请输入工号（9位数）"
                  maxLength={9}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="请输入密码"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {(error || authError) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error || authError}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
          
          {/* 已登录用户快速切换 */}
          {loggedInUsers && loggedInUsers.length > 0 && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-medium text-blue-800">已登录账户</h3>
                <span className="text-xs text-blue-600">（点击切换）</span>
              </div>
              <div className="space-y-2">
                {loggedInUsers.map((u) => (
                  <div 
                    key={u.id}
                    className="flex items-center justify-between bg-white rounded-lg p-2 border border-blue-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.teacher_id} · {u.faculty_name || '未知教研室'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSwitchUser(u.id)}
                        disabled={switchingUserId === u.id}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {switchingUserId === u.id ? (
                          <>
                            <span className="animate-spin">⏳</span>
                            切换中...
                          </>
                        ) : (
                          <>
                            <ArrowRightLeft className="w-3 h-3" />
                            切换
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => removeFromLoggedInList(u.id)}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        title="从列表中移除"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">
              首次使用请使用系统分配的工号和初始密码登录，登录后请及时修改密码。
            </p>
          </div>
        </div>
        <p className="text-center text-purple-300 text-sm mt-6">© 2026 武昌理工学院 音乐系课程管理系统</p>
      </div>
    </div>
  );
}
