import React, { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2,
  Eye,
  RefreshCw,
  Trash2,
  Settings
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

// 文件上传配置
export interface FileUploadConfig {
  maxFileSize?: number; // 最大文件大小（MB）
  acceptedTypes?: string[]; // 接受的文件类型
  maxFiles?: number; // 最大文件数量
  chunkSize?: number; // 分块大小（MB）
  concurrentUploads?: number; // 并发上传数量
  autoProcess?: boolean; // 自动处理
  showPreview?: boolean; // 显示预览
}

// 文件处理进度
export interface FileProcessingProgress {
  fileName: string;
  totalBytes: number;
  processedBytes: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
  result?: any;
  speed?: number; // 处理速度 bytes/s
  eta?: number; // 预计剩余时间（秒）
}

// 上传结果
export interface FileUploadResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: string[];
  warnings: string[];
  details?: any;
}

// 增强文件上传组件
interface EnhancedFileUploadProps {
  config?: FileUploadConfig;
  onFileSelect?: (files: File[]) => void;
  onProcess?: (file: File, onProgress: (progress: FileProcessingProgress) => void) => Promise<any>;
  onComplete?: (results: FileUploadResult) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  config = {},
  onFileSelect,
  onProcess,
  onComplete,
  onError,
  className = ''
}) => {
  const { showSuccess, showError, showWarning } = useNotification();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<Map<string, FileProcessingProgress>>(new Map());
  const [results, setResults] = useState<FileUploadResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 默认配置
  const defaultConfig: FileUploadConfig = {
    maxFileSize: 50, // 50MB
    acceptedTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ],
    maxFiles: 10,
    chunkSize: 5, // 5MB chunks
    concurrentUploads: 3,
    autoProcess: false,
    showPreview: true,
    ...config
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化速度
  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatFileSize(bytesPerSecond)}/s`;
  };

  // 格式化时间
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`;
    return `${Math.round(seconds / 3600)}小时`;
  };

  // 验证文件
  const validateFile = (file: File): string | null => {
    // 检查文件大小
    if (file.size > defaultConfig.maxFileSize! * 1024 * 1024) {
      return `文件 "${file.name}" 超过大小限制 (${defaultConfig.maxFileSize}MB)`;
    }

    // 检查文件类型 - 修复逻辑：同时支持MIME类型和扩展名验证
    if (defaultConfig.acceptedTypes && defaultConfig.acceptedTypes.length > 0) {
      const fileName = file.name.toLowerCase();
      const fileExtension = '.' + fileName.split('.').pop();
      
      // 检查扩展名
      const hasValidExtension = defaultConfig.acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileName.endsWith(type.toLowerCase());
        } else {
          return file.type === type;
        }
      });

      // 对于CSV文件，特别处理
      const isCsvFile = fileName.endsWith('.csv') || file.type === 'text/csv';
      
      if (!hasValidExtension && !isCsvFile) {
        return `文件 "${file.name}" 类型不支持`;
      }
    }

    // 检查文件数量
    if (selectedFiles.length >= defaultConfig.maxFiles!) {
      return `最多只能上传 ${defaultConfig.maxFiles} 个文件`;
    }

    return null;
  };

  // 处理文件选择
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      showError('文件验证失败', errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      onFileSelect?.(validFiles);
      
      if (defaultConfig.autoProcess) {
        processFiles(validFiles);
      }
    }
  }, [selectedFiles, defaultConfig, onFileSelect, showError]);

  // 拖拽处理
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // 文件点击上传
  const handleFileInputClick = () => {
    fileInputRef.current?.click();
  };

  // 移除文件
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // 清空所有文件
  const clearAllFiles = () => {
    setSelectedFiles([]);
    setProcessingFiles(new Map());
    setResults([]);
  };

  // 处理文件
  const processFiles = async (files: File[]) => {
    if (!onProcess) {
      showError('处理函数未设置', '请提供文件处理函数');
      return;
    }

    setIsProcessing(true);
    const newResults: FileUploadResult[] = [];
    const progressMap = new Map<string, FileProcessingProgress>();

    try {
      for (const file of files) {
        const progressId = `${file.name}-${Date.now()}`;
        
        // 初始化进度
        const initialProgress: FileProcessingProgress = {
          fileName: file.name,
          totalBytes: file.size,
          processedBytes: 0,
          status: 'pending'
        };
        
        progressMap.set(progressId, initialProgress);
        setProcessingFiles(new Map(progressMap));

        // 更新进度回调
        const updateProgress = (progress: Partial<FileProcessingProgress>) => {
          const current = progressMap.get(progressId);
          if (current) {
            const updated = { ...current, ...progress };
            progressMap.set(progressId, updated);
            setProcessingFiles(new Map(progressMap));
          }
        };

        try {
          // 开始处理
          updateProgress({ status: 'processing', processedBytes: 0 });

          const startTime = Date.now();
          let lastProcessedBytes = 0;

          // 模拟进度更新（实际项目中可以通过回调或事件监听实现）
          const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const progress = Math.min(elapsed * 0.1, 0.9); // 模拟90%的进度
            const processedBytes = file.size * progress;
            const speed = (processedBytes - lastProcessedBytes) / 0.5; // 每0.5秒更新一次
            const eta = speed > 0 ? (file.size - processedBytes) / speed : 0;

            updateProgress({
              processedBytes,
              speed,
              eta
            });

            lastProcessedBytes = processedBytes;
          }, 500);

          // 执行处理
          const result = await onProcess(file, updateProgress);
          clearInterval(progressInterval);

          // 完成处理
          updateProgress({
            status: 'completed',
            processedBytes: file.size,
            result
          });

          newResults.push({
            success: true,
            processed: 1,
            failed: 0,
            errors: [],
            warnings: [],
            details: result
          });

        } catch (error) {
          console.error(`处理文件 "${file.name}" 失败:`, error);
          
          updateProgress({
            status: 'error',
            error: error instanceof Error ? error.message : '未知错误'
          });

          newResults.push({
            success: false,
            processed: 0,
            failed: 1,
            errors: [error instanceof Error ? error.message : '未知错误'],
            warnings: []
          });
        }
      }

      setResults(newResults);
      
      // 汇总结果
      const totalProcessed = newResults.reduce((sum, r) => sum + r.processed, 0);
      const totalFailed = newResults.reduce((sum, r) => sum + r.failed, 0);
      const allErrors = newResults.flatMap(r => r.errors);
      const allWarnings = newResults.flatMap(r => r.warnings);

      const finalResult: FileUploadResult = {
        success: totalFailed === 0,
        processed: totalProcessed,
        failed: totalFailed,
        errors: allErrors,
        warnings: allWarnings,
        details: newResults
      };

      onComplete?.(finalResult);

      if (finalResult.success) {
        showSuccess('文件处理完成', `成功处理 ${totalProcessed} 个文件`);
      } else {
        showError('文件处理完成', `${totalFailed} 个文件处理失败`);
      }

    } catch (error) {
      console.error('批量处理失败:', error);
      showError('批量处理失败', error instanceof Error ? error.message : '未知错误');
      onError?.(error instanceof Error ? error.message : '未知错误');
    } finally {
      setIsProcessing(false);
    }
  };

  // 开始处理所有文件
  const handleProcessAll = () => {
    if (selectedFiles.length === 0) {
      showWarning('没有文件', '请先选择要处理的文件');
      return;
    }
    processFiles(selectedFiles);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 文件上传区域 */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer
          ${isDragging 
            ? 'border-purple-400 bg-purple-50' 
            : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'
          }
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!isProcessing ? handleFileInputClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={defaultConfig.acceptedTypes?.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isDragging ? '释放文件到这里' : '上传文件'}
            </h3>
            <p className="text-gray-500">
              拖拽文件到这里或点击选择文件
            </p>
            <p className="text-sm text-gray-400 mt-2">
              支持格式: {defaultConfig.acceptedTypes?.map(type => 
                type.includes('sheet') ? 'Excel' : 
                type.includes('excel') ? 'Excel' : 
                type.includes('csv') ? 'CSV' : type
              ).join(', ')}
              {' | '}最大 {defaultConfig.maxFileSize}MB
              {' | '}最多 {defaultConfig.maxFiles} 个文件
            </p>
          </div>

          {!isProcessing && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFileInputClick();
              }}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              选择文件
            </button>
          )}
        </div>
      </div>

      {/* 文件列表 */}
      {selectedFiles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="font-medium text-gray-900">
              已选择文件 ({selectedFiles.length})
            </h4>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllFiles}
                disabled={isProcessing}
                className="text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                清空
              </button>
              <button
                onClick={handleProcessAll}
                disabled={isProcessing}
                className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {isProcessing ? '处理中...' : '开始处理'}
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {selectedFiles.map((file, index) => {
              const progress = processingFiles.get(`${file.name}-${Date.now()}`) || 
                             processingFiles.get(file.name) ||
                             Array.from(processingFiles.values()).find(p => p.fileName === file.name);

              return (
                <div key={index} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center">
                        <FileSpreadsheet className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {progress && (
                        <div className="flex items-center gap-2 text-sm">
                          {progress.status === 'processing' && (
                            <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                          )}
                          {progress.status === 'completed' && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                          {progress.status === 'error' && (
                            <XCircle className="w-4 h-4 text-red-600" />
                          )}
                          <span className={
                            progress.status === 'completed' ? 'text-green-600' :
                            progress.status === 'error' ? 'text-red-600' :
                            'text-gray-600'
                          }>
                            {progress.status === 'processing' ? `${Math.round((progress.processedBytes / progress.totalBytes) * 100)}%` :
                             progress.status === 'completed' ? '已完成' :
                             progress.status === 'error' ? '失败' :
                             '等待中'}
                          </span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => removeFile(index)}
                        disabled={isProcessing}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 进度条 */}
                  {progress && progress.status === 'processing' && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (progress.processedBytes / progress.totalBytes) * 100)}%` 
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{formatFileSize(progress.processedBytes)} / {formatFileSize(progress.totalBytes)}</span>
                        {progress.speed && (
                          <span>速度: {formatSpeed(progress.speed)} | 剩余: {formatTime(progress.eta || 0)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 错误信息 */}
                  {progress && progress.status === 'error' && progress.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {progress.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 处理结果 */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">处理结果</h4>
          </div>
          <div className="p-4 space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {result.success ? '处理成功' : '处理失败'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    处理: {result.processed} | 失败: {result.failed}
                  </span>
                </div>
                
                {result.errors.length > 0 && (
                  <div className="space-y-1">
                    {result.errors.map((error, i) => (
                      <div key={i} className="text-sm text-red-700 flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        {error}
                      </div>
                    ))}
                  </div>
                )}
                
                {result.warnings.length > 0 && (
                  <div className="space-y-1">
                    {result.warnings.map((warning, i) => (
                      <div key={i} className="text-sm text-yellow-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};