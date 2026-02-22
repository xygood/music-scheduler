import React, { useEffect } from 'react';
import { useNotification, Notification, NotificationType } from '../contexts/NotificationContext';

// 通知图标组件
const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
  const iconStyles = "w-5 h-5";
  
  switch (type) {
    case NotificationType.SUCCESS:
      return (
        <svg className={`${iconStyles} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case NotificationType.ERROR:
      return (
        <svg className={`${iconStyles} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case NotificationType.WARNING:
      return (
        <svg className={`${iconStyles} text-yellow-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case NotificationType.INFO:
      return (
        <svg className={`${iconStyles} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

// 获取通知类型的样式
const getNotificationStyles = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.SUCCESS:
      return 'bg-green-50 border-green-200 text-green-800';
    case NotificationType.ERROR:
      return 'bg-red-50 border-red-200 text-red-800';
    case NotificationType.WARNING:
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case NotificationType.INFO:
      return 'bg-blue-50 border-blue-200 text-blue-800';
    default:
      return 'bg-gray-50 border-gray-200 text-gray-800';
  }
};

// 单个通知项组件
const NotificationItem: React.FC<{ notification: Notification; onHide: (id: string) => void }> = ({ 
  notification, 
  onHide 
}) => {
  const { id, type, title, message, action } = notification;
  const styles = getNotificationStyles(type);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onHide(id);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [id, onHide]);

  return (
    <div 
      className={`
        relative max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto 
        ring-1 ring-black ring-opacity-5 border ${styles}
        transform transition-all duration-300 ease-in-out
        animate-in slide-in-from-right-full
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <NotificationIcon type={type} />
          </div>
          <div className="ml-3 w-0 flex-1">
            <p className="text-sm font-medium">
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm opacity-90">
                {message}
              </p>
            )}
            {action && (
              <div className="mt-3">
                <button
                  type="button"
                  onClick={action.onClick}
                  className="text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => onHide(id)}
            >
              <span className="sr-only">关闭</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* 进度条 - 显示剩余时间 */}
      {notification.duration && notification.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div 
            className={`h-full transition-all duration-${notification.duration} ease-linear ${
              type === NotificationType.SUCCESS ? 'bg-green-400' :
              type === NotificationType.ERROR ? 'bg-red-400' :
              type === NotificationType.WARNING ? 'bg-yellow-400' :
              'bg-blue-400'
            }`}
            style={{
              animation: `shrink ${notification.duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

// 通知容器组件
export const NotificationContainer: React.FC = () => {
  const { notifications, hideNotification } = useNotification();

  // 如果没有通知，不渲染任何内容
  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* CSS 动画定义 */}
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
        
        .animate-in {
          animation-fill-mode: forwards;
        }
        
        .slide-in-from-right-full {
          animation: slideInFromRight 0.3s ease-out;
        }
        
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>

      {/* 通知区域 - 固定在右上角 */}
      <div 
        aria-live="assertive" 
        className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onHide={hideNotification}
            />
          ))}
        </div>
      </div>
    </>
  );
};

// 确认对话框组件
interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: NotificationType;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
  type = NotificationType.WARNING
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const getDialogStyles = (): string => {
    switch (type) {
      case NotificationType.ERROR:
        return 'border-red-200';
      case NotificationType.SUCCESS:
        return 'border-green-200';
      case NotificationType.INFO:
        return 'border-blue-200';
      default:
        return 'border-yellow-200';
    }
  };

  const getIconColor = (): string => {
    switch (type) {
      case NotificationType.ERROR:
        return 'text-red-600';
      case NotificationType.SUCCESS:
        return 'text-green-600';
      case NotificationType.INFO:
        return 'text-blue-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`
          inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform 
          transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full
          border-2 ${getDialogStyles()}
        `}>
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`
                mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full 
                sm:mx-0 sm:h-10 sm:w-10 ${getIconColor().replace('text-', 'bg-').replace('-600', '-100')}
              `}>
                <NotificationIcon type={type} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`
                w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 
                text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm
                ${type === NotificationType.ERROR ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
                  type === NotificationType.SUCCESS ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                  type === NotificationType.INFO ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' :
                  'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
                }
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onCancel}
            >
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 加载指示器组件
interface LoadingIndicatorProps {
  isLoading: boolean;
  message?: string;
  overlay?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ 
  isLoading, 
  message = "加载中...", 
  overlay = true 
}) => {
  if (!isLoading) return null;

  const LoadingContent = () => (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
      {message && (
        <p className="text-sm font-medium text-gray-700">{message}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 shadow-xl">
          <LoadingContent />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <LoadingContent />
    </div>
  );
};