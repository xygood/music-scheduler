import React, { useState, useEffect, useRef } from 'react';
import LargeClassList from '../components/LargeClassSchedule/LargeClassList';
import { useAuth } from '../hooks/useAuth';
import { largeClassScheduleService } from '../services';
import { largeClassExcelUtils } from '../utils/excel';
import type { LargeClassEntry } from '../types';
import { Upload, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function LargeClass() {
  const { teacher, isAdmin } = useAuth();
  const [largeClassEntries, setLargeClassEntries] = useState<LargeClassEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | ''; message: string }>({ type: '', message: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载通适大课数据
  useEffect(() => {
    const fetchLargeClassData = async () => {
      try {
        setLoading(true);
        // 获取所有大课表数据
        const allLargeClasses = await largeClassScheduleService.getAll();
        // 合并所有学期的大课表条目
        const allEntries = allLargeClasses.flatMap(s => s.entries);
        setLargeClassEntries(allEntries);
      } catch (error) {
        console.error('加载通适大课数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLargeClassData();
  }, []);

  // 处理大课表文件上传
  const handleLargeClassFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus({ type: '', message: '' });

    try {
      // 读取Excel文件
      const { rawData, sheetName } = await largeClassExcelUtils.readFile(file);
      
      // 从文件名推断学年和学期
      const fileName = file.name;
      const academicYearMatch = fileName.match(/(\d{4}-\d{4})/);
      const academicYear = academicYearMatch ? academicYearMatch[1] : '2025-2026';
      const semesterMatch = fileName.match(/(\d)学期/);
      const semester = semesterMatch ? parseInt(semesterMatch[1]) : 2;
      const semesterLabel = `${academicYear}-${semester}`;
      
      // 解析大课表数据（使用改进版解析函数）
      const entries = largeClassExcelUtils.parseLargeClassScheduleImproved(rawData, academicYear, semesterLabel);
      console.log('解析出大课表条目数量:', entries.length);
      
      // 导入到系统
      await largeClassScheduleService.importSchedule(fileName, academicYear, semesterLabel, entries);
      console.log('大课表导入完成');

      // 刷新大课表数据 - 获取所有大课表条目
      const allLargeClasses = await largeClassScheduleService.getAll();
      console.log('重新获取到大课表数量:', allLargeClasses.length);
      
      const allEntries = allLargeClasses.flatMap(s => s.entries);
      console.log('重新获取到大课表条目总数:', allEntries.length);
      
      setLargeClassEntries(allEntries);
      
      setImportStatus({
        type: 'success',
        message: `成功导入 ${entries.length} 条大课表记录！`
      });
    } catch (error) {
      console.error('导入大课表失败:', error);
      setImportStatus({
        type: 'error',
        message: '导入失败：请确保上传的是正确的课表Excel文件'
      });
    } finally {
      setIsImporting(false);
      // 清空文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 触发文件选择
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // 清除所有大课表数据
  const handleClearAll = async () => {
    if (window.confirm('确定要清除所有大课表数据吗？此操作不可恢复。')) {
      try {
        await largeClassScheduleService.clearAll();
        // 刷新大课表数据
        const allLargeClasses = await largeClassScheduleService.getAll();
        const allEntries = allLargeClasses.flatMap(s => s.entries);
        setLargeClassEntries(allEntries);
        alert('大课表数据已成功清除！');
      } catch (error) {
        console.error('清除大课表数据失败:', error);
        alert('清除大课表数据失败，请重试。');
      }
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">通适大课</h1>
        <div className="flex items-center gap-3">
          {/* 导入大课表按钮 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleLargeClassFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <button
            onClick={triggerFileInput}
            disabled={isImporting}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {isImporting ? '导入中...' : '导入大课表'}
          </button>
          <button
            onClick={handleClearAll}
            className="btn-secondary flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            清除大课表数据
          </button>
        </div>
      </div>

      {/* 导入状态提示 */}
      {importStatus.message && (
        <div className={`card mb-6 ${importStatus.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {importStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            )}
            <span className={importStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {importStatus.message}
            </span>
          </div>
        </div>
      )}

      {/* 通适大课列表 */}
      <LargeClassList largeClassEntries={largeClassEntries} loading={loading} />

      {/* 导入说明 */}
      <div className="card mt-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 直接上传通适大课Excel文件，系统会自动解析并显示为列表</li>
              <li>• 支持 .xlsx 和 .xls 格式的Excel文件</li>
              <li>• 系统会自动识别Excel文件中的列名</li>
              <li>• 导入后的数据可以直接用于查看和分析</li>
              <li>• 数据会自动用于专业大课和专业小课的禁排检测</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
