import React, { useState } from 'react';
import { Upload, Info, CheckCircle, AlertTriangle } from 'lucide-react';

const BlockedTimesImport: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{success: boolean; count: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    try {
      setImporting(true);
      setError(null);
      setImportResult(null);
      
      // 读取文件内容
      const content = await file.text();
      let backupData;
      
      try {
        backupData = JSON.parse(content);
      } catch (e) {
        setError('文件格式错误，请上传有效的JSON备份文件');
        return;
      }
      
      // 验证文件结构
      if (!backupData.data || (!backupData.data.blocked_slots && !backupData.data.large_class_schedules)) {
        setError('备份文件格式不正确，缺少禁排数据');
        return;
      }
      
      // 调用API导入
      const response = await fetch('/api/import-blocked-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_data: backupData })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setImportResult({ success: true, count: result.imported_count });

        // 触发事件通知其他组件刷新
        window.dispatchEvent(new CustomEvent('blockedTimesImported'));

        // 刷新页面以重新加载缓存数据
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setError('导入失败：' + (result.error || '未知错误'));
      }
      
    } catch (err) {
      console.error('导入错误:', err);
      setError('导入失败：' + (err instanceof Error ? err.message : '网络错误'));
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImport(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-purple-600" />
          导入禁排数据
        </h3>
        <Info className="w-5 h-5 text-blue-500" />
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-blue-800">
          请上传音乐排课系统备份文件（JSON格式）
        </p>
        <p className="text-xs text-blue-600 mt-1">
          系统将自动解析 blocked_slots（系统禁排）和 large_class_schedules（专业大课/通适大课）数据
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        <label className={`relative inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 cursor-pointer ${importing ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Upload className="w-4 h-4 mr-2" />
          {importing ? '导入中...' : '选择备份文件'}
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            disabled={importing}
            className="sr-only"
          />
        </label>
        
        {importResult && (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">
              成功导入 {importResult.count} 条禁排数据
            </span>
          </div>
        )}
        
        {error && (
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>支持导入的数据类型：</p>
        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
          <li>系统禁排时间（节假日、特殊日期等）</li>
          <li>专业大课安排（劳动教育等）</li>
          <li>通适大课安排</li>
        </ul>
      </div>
    </div>
  );
};

export default BlockedTimesImport;
