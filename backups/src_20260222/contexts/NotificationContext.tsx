import React, { createContext, useContext, useState, ReactNode } from 'react';

// 通知类型枚举
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning'
}

// 通知接口
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 自动消失时间（毫秒），0表示不自动消失
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 通知上下文接口
export interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // 便利方法
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
}

// 创建上下文
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// 生成唯一ID
const generateId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// 通知提供者组件
interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 显示通知
  const showNotification = (notification: Omit<Notification, 'id'>) => {
    const id = generateId();
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration ?? 5000 // 默认5秒后消失
    };

    setNotifications(prev => [...prev, newNotification]);

    // 如果设置了自动消失时间，则定时移除
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, newNotification.duration);
    }
  };

  // 隐藏通知
  const hideNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // 清除所有通知
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // 便利方法
  const showSuccess = (title: string, message?: string, duration?: number) => {
    showNotification({
      type: NotificationType.SUCCESS,
      title,
      message,
      duration
    });
  };

  const showError = (title: string, message?: string, duration?: number) => {
    showNotification({
      type: NotificationType.ERROR,
      title,
      message,
      duration: duration ?? 8000 // 错误信息显示更久一些
    });
  };

  const showInfo = (title: string, message?: string, duration?: number) => {
    showNotification({
      type: NotificationType.INFO,
      title,
      message,
      duration
    });
  };

  const showWarning = (title: string, message?: string, duration?: number) => {
    showNotification({
      type: NotificationType.WARNING,
      title,
      message,
      duration
    });
  };

  const value: NotificationContextType = {
    notifications,
    showNotification,
    hideNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook 用于使用通知上下文
export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// 导出已在上面完成