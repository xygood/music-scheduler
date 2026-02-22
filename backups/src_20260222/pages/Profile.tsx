import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Building, BookOpen, Check, X, Info } from 'lucide-react';
import { FACULTY_INSTRUMENTS, FACULTIES } from '../types';

// 专业分类配置
const FACULTY_CATEGORIES = [
  { facultyCode: 'PIANO', facultyName: '钢琴专业', instruments: ['钢琴'] },
  { facultyCode: 'VOCAL', facultyName: '声乐专业', instruments: ['声乐'] },
  { facultyCode: 'INSTRUMENT', facultyName: '器乐专业', instruments: ['双排键', '小提琴', '古筝', '笛子', '古琴', '葫芦丝', '萨克斯'] },
];

export default function Profile() {
  const { user, teacher, updateProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [facultyCode, setFacultyCode] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [canTeachInstruments, setCanTeachInstruments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (teacher) {
      setFullName(teacher.full_name || '');
      setFacultyCode(teacher.faculty_code || '');
      setFacultyName(teacher.department || '');
      setCanTeachInstruments(teacher.can_teach_instruments || []);
    }
  }, [teacher]);

  const handleToggleInstrument = (instrument: string) => {
    if (canTeachInstruments.includes(instrument)) {
      setCanTeachInstruments(canTeachInstruments.filter(i => i !== instrument));
    } else {
      setCanTeachInstruments([...canTeachInstruments, instrument]);
    }
  };

  const handleFacultyChange = (code: string) => {
    setFacultyCode(code);
    const faculty = FACULTIES.find(f => f.faculty_code === code);
    setFacultyName(faculty?.faculty_name || '');
    // 自动选择该专业对应的乐器
    const instruments = FACULTY_INSTRUMENTS[code] || [];
    setCanTeachInstruments(instruments.length > 0 ? [instruments[0]] : []);
  };

  const handleSave = async () => {
    if (canTeachInstruments.length === 0) {
      setMessage({ type: 'error', text: '请至少选择一个乐器' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        fullName,
        facultyCode,
        specialty: canTeachInstruments,
      });
      setMessage({ type: 'success', text: '保存成功！' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '保存失败，请重试' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
          <User className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h1 className="page-title">个人资料</h1>
          <p className="text-sm text-gray-500">管理您的账户信息和可教授乐器</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">姓名</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input pl-10"
                placeholder="请输入姓名"
              />
            </div>
          </div>
          <div>
            <label className="label">专业</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={facultyCode}
                onChange={(e) => handleFacultyChange(e.target.value)}
                className="input pl-10"
              >
                <option value="">请选择专业</option>
                {FACULTIES.map(f => (
                  <option key={f.faculty_code} value={f.faculty_code}>{f.faculty_name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                className="input pl-10 bg-gray-50"
                placeholder="邮箱"
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* 可教授乐器设置 */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h2 className="section-title">可教授乐器</h2>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-purple-600 mt-0.5" />
            <div className="text-sm text-purple-700">
              <p className="font-medium mb-1">乐器设置说明：</p>
              <ul className="list-disc list-inside space-y-1 opacity-80">
                <li>选择您可以教授的乐器</li>
                <li>系统会根据您的设置自动过滤学生和课程</li>
                <li>例如：声乐老师只会看到声乐专业的学生和课程</li>
                <li>双排键老师可以同时选择"双排键"和"钢琴"</li>
              </ul>
            </div>
          </div>
        </div>

        {FACULTY_CATEGORIES.map((category) => (
          <div key={category.facultyCode} className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{category.facultyName}</h3>
            <div className="flex flex-wrap gap-2">
              {category.instruments.map((instrument) => (
                <button
                  key={instrument}
                  onClick={() => handleToggleInstrument(instrument)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    canTeachInstruments.includes(instrument)
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {instrument}
                  {canTeachInstruments.includes(instrument) && <Check className="w-4 h-4 ml-1 inline" />}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 已选乐器显示 */}
        {canTeachInstruments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">已选择 {canTeachInstruments.length} 个乐器：</p>
            <div className="flex flex-wrap gap-2">
              {canTeachInstruments.map((instrument) => (
                <span key={instrument} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {instrument}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 保存按钮 */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || canTeachInstruments.length === 0}
          className="btn-primary px-8 py-3 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存修改'}
        </button>
      </div>
    </div>
  );
}
