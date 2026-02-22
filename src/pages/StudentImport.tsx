import React, { useState, useCallback, useEffect } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Users,
  Building,
  CheckCircle,
  XCircle,
  Download,
  ChevronDown,
  Star,
  StarHalf
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../hooks/useAuth';
import { studentService, classService } from '../services';
import { useNotification } from '../contexts/NotificationContext';
import type { Student } from '../types';

// Excel模板配置
const EXCEL_TEMPLATE = {
  headers: ['班级类型', '年级', '班级', '学号', '姓名', '主项', '副项1', '副项2', '副项3', '备注'],
  sample_data: [
    ['普通班', '2024', '音乐学2401', '2024001', '张三', '钢琴', '声乐', '古筝', '', ''],
    ['普通班', '2024', '音乐学2402', '2024002', '李四', '声乐', '钢琴', '小提琴', '', ''],
  ],
  rules: [
    '班级类型：必填项，普通班、专升本',
    '年级：必填项，如2023级',
    '班级：必填项，如音乐学2301代表2023级1班',
    '学号：必填项，唯一标识每个学生',
    '姓名：必填项',
    '主项为空 + 3个副项 = 通用（不分主副项）',
    '主项有值 + 2个副项 = 有主副项',
  ]
};

const FACULTY_INSTRUMENTS = {
  'PIANO': ['钢琴'],
  'VOCAL': ['声乐'],
  'INSTRUMENT': ['古筝', '竹笛', '葫芦丝', '古琴', '小提琴', '萨克斯', '双排键']
};

const StudentImport: React.FC = () => {
  const { teacher } = useAuth();
  const { addNotification } = useNotification();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string; count: number } | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [totalStudents, setTotalStudents] = useState(0);

  // 加载已导入的学生总数
  useEffect(() => {
    const loadTotalStudents = async () => {
      const allStudents = await studentService.getAll();
      setTotalStudents(allStudents.length);
    };
    loadTotalStudents();
  }, [uploadResult]);

  // 下载模板
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(EXCEL_TEMPLATE.sample_data.map(row => {
      const obj: any = {};
      EXCEL_TEMPLATE.headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    }));
    const wb = XLSX.utils.book_new();
    
    // 设置列宽
    const cols = [
      { wch: 8 }, { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 30 }
    ];
    ws['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, ws, '学生信息');
    XLSX.writeFile(wb, '学生信息导入模板.xlsx');
  };

  // 简单的文件处理 - 直接导入，不做复杂验证
  const processFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // 获取所有数据
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | undefined)[][];

      if (data.length < 2) {
        addNotification('error', '文件格式错误', 'Excel文件内容为空或格式不正确');
        return;
      }

      // 查找字段标题行
      const headerRowIndex = data.findIndex(row =>
        row[0] === '学号' && row[1] === '姓名'
      );

      // 数据从标题行之后开始
      const rows = headerRowIndex >= 0
        ? data.slice(headerRowIndex + 1)
        : data.slice(2);

      // 简单的数据处理
      const students: Omit<Student, 'id' | 'created_at'>[] = [];
      const usedStudentIds = new Set<string>();

      rows.forEach((row, index) => {
        const actualRowIndex = headerRowIndex >= 0 ? headerRowIndex + 1 + index : 2 + index;
        const rowNum = actualRowIndex + 1;

        // 跳过空行
        if (!row[3] || !row[4]) return;

        // 基本字段提取
        const classType = String(row[0] || '').trim();
        const year = String(row[1] || '').trim();
        const className = String(row[2] || '').trim();
        const student_id = String(row[3] || '').trim();
        const name = String(row[4] || '').trim();
        const primary_instrument = String(row[5] || '').trim();
        const secondary1 = String(row[6] || '').trim();
        const secondary2 = String(row[7] || '').trim();
        const secondary3 = String(row[8] || '').trim();
        const remarks = String(row[9] || '').trim();

        // 基本验证
        if (!student_id || !name) return;
        if (usedStudentIds.has(student_id)) return;
        usedStudentIds.add(student_id);

        // 收集副项
        const secondary_instruments: string[] = [];
        if (secondary1) secondary_instruments.push(secondary1);
        if (secondary2) secondary_instruments.push(secondary2);
        if (secondary3) secondary_instruments.push(secondary3);

        // 简单的教研室判断
        let facultyCode = 'INSTRUMENT';
        if (primary_instrument) {
          for (const [code, instruments] of Object.entries(FACULTY_INSTRUMENTS)) {
            if (instruments.includes(primary_instrument)) {
              facultyCode = code;
              break;
            }
          }
        } else if (secondary_instruments.length > 0) {
          for (const [code, instruments] of Object.entries(FACULTY_INSTRUMENTS)) {
            if (instruments.includes(secondary_instruments[0])) {
              facultyCode = code;
              break;
            }
          }
        }

        // 添加学生数据
        students.push({
          teacher_id: (teacher && typeof teacher === 'object' && 'id' in teacher) ? teacher.id : 'system',
          student_id,
          name,
          major_class: className,
          grade: Math.max(1, parseInt((year || '').toString().replace(/[^0-9]/g, '')) || 1),
          student_type: classType === '专升本' ? 'upgrade' : 'general',
          primary_instrument,
          secondary_instruments,
          remarks,
          faculty_code: facultyCode,
          status: 'active' as const
        });
      });

      return students;

    } catch (error) {
      console.error('文件处理失败:', error);
      addNotification('error', '文件处理失败', '请检查文件格式是否正确');
      return null;
    }
  }, [teacher?.id || 'system', addNotification]);

  // 文件上传处理
  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      addNotification('error', '文件格式错误', '请上传Excel文件(.xlsx, .xls)或CSV文件');
      return;
    }

    setSelectedFile(file);
    addNotification('info', '文件已选择', `文件: ${file.name}`);

  }, [addNotification]);

  // 确认上传
  const handleConfirmUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    addNotification('info', '开始导入', '正在处理学生数据...');

    try {
      const students = await processFile(selectedFile);
      if (!students || students.length === 0) {
        addNotification('warning', '没有有效数据', '文件中没有找到可以导入的学生数据');
        setIsUploading(false);
        return;
      }


      // 导入到数据库
      const createdStudents = await studentService.createMany(students);

      // 同步班级数据（添加错误处理）
      try {
        const allStudents = await studentService.getAll();
        await classService.syncFromStudents(allStudents);
      } catch (syncError) {
        addNotification('warning', '部分完成', '学生数据导入成功，但班级数据同步失败');
      }

      setUploadResult({
        success: true,
        message: '导入成功',
        count: students.length
      });

      addNotification('success', '导入完成', `成功导入 ${students.length} 名学生数据`);
      setIsUploading(false);
      setSelectedFile(null);

    } catch (error) {
      console.error('导入失败:', error);
      setUploadResult({
        success: false,
        message: '导入失败',
        count: 0
      });
      addNotification('error', '导入失败', `导入过程中发生错误: ${error.message || '未知错误'}`);
      setIsUploading(false);
    }
  }, [selectedFile, processFile]);

  // 重置
  const handleReset = () => {
    setSelectedFile(null);
    setUploadResult(null);
    addNotification('info', '已重置', '上传状态已重置');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-10 h-10 text-blue-600" />
            学生数据导入
          </h1>
          <p className="text-gray-600 mt-2">
            批量导入学生数据，支持主副项专业设置，方便按主项/副项排课
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">已导入学生</p>
                <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">年级数量</p>
                <p className="text-3xl font-bold text-gray-900">4</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">主项专业数</p>
                <p className="text-3xl font-bold text-green-600">12</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">副项组合数</p>
                <p className="text-3xl font-bold text-orange-600">28</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <StarHalf className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 导入区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">学生数据导入</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <Download className="w-4 h-4" />
                  下载模板
                </button>
                <button
                  onClick={() => setShowTemplate(!showTemplate)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showTemplate ? 'rotate-180' : ''}`} />
                  查看格式
                </button>
              </div>
            </div>
          </div>

          {/* 模板显示区域 */}
          {showTemplate && (
            <div className="px-6 py-4 bg-blue-50 border-b border-blue-200">
              <p className="text-sm text-blue-800 mb-3">请按照以下格式准备 Excel 文件：</p>

              {/* 模板表格 */}
              <div className="bg-white rounded-lg p-4 overflow-x-auto mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {EXCEL_TEMPLATE.headers.map((header, index) => (
                        <th key={index} className="px-4 py-2 text-left font-medium text-gray-700">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {EXCEL_TEMPLATE.sample_data.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-gray-100">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-2 text-gray-600">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 填写规则 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">填写规则</h4>
                  <ul className="space-y-1 text-xs text-blue-700">
                    {EXCEL_TEMPLATE.rules.map((rule, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-blue-500" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-blue-800 mb-2">可选乐器</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">钢琴课程</span>
                      <span className="text-xs text-gray-600">钢琴</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">声乐课程</span>
                      <span className="text-xs text-gray-600">声乐</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">器乐课程</span>
                      <span className="text-xs text-gray-600">古筝、竹笛、葫芦丝、古琴、小提琴、萨克斯、双排键</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 文件上传区域 */}
          {!selectedFile && !uploadResult && (
            <div className="p-8">
              <div
                className="border-2 border-dashed rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-all duration-300"
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">点击选择或拖拽文件到此处</h3>
                <p className="text-gray-500 mb-4">支持 Excel 文件 (.xlsx, .xls) 和 CSV 文件</p>
                <p className="text-sm text-gray-400">最大 5MB</p>
              </div>
              
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* 文件已选择 */}
          {selectedFile && !uploadResult && (
            <div className="p-6">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <FileSpreadsheet className="w-12 h-12 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleConfirmUpload}
                  disabled={isUploading}
                  className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                    isUploading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isUploading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      导入中...
                    </span>
                  ) : (
                    '确认导入'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 上传结果 */}
          {uploadResult && (
            <div className="p-6">
              <div className={`flex items-center gap-4 p-6 rounded-lg ${
                uploadResult.success ? 'bg-green-50' : 'bg-red-50'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  uploadResult.success ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {uploadResult.success ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className={`text-xl font-semibold ${
                    uploadResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {uploadResult.message}
                  </h3>
                  {uploadResult.success && (
                    <p className="text-green-600 mt-1">
                      成功导入 <span className="font-bold">{uploadResult.count}</span> 名学生
                    </p>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  className={`px-6 py-2 text-white rounded-lg transition-colors ${
                    uploadResult.success 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  继续导入
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentImport;