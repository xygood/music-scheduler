import { io, Socket } from 'socket.io-client';
import { STORAGE_KEYS } from './localStorage';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';
const USE_DATABASE = import.meta.env.VITE_USE_DATABASE === 'true';

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isConnected = false;

  connect(url: string = WS_URL): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.socket = io(url, {
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          resolve(true);
        });

        this.socket.on('disconnect', () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
        });

        this.socket.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.isConnected = false;
          resolve(false);
        });

        // 处理初始数据
        this.socket.on('initial_data', (data) => {
          this.handleInitialData(data);
        });

        // 处理课程更新
        this.socket.on('courses_updated', (data) => {
          this.handleCoursesUpdated(data);
        });

        // 处理禁排时间更新
        this.socket.on('blocked_slots_updated', (data) => {
          this.handleBlockedSlotsUpdated(data);
        });

      } catch (error) {
        console.error('WebSocket connection failed:', error);
        resolve(false);
      }
    });
  }

  // 断开连接
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  // 发送课程更新
  async sendCourseUpdate(courses: any[]) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_courses', courses);
    } else {
      console.warn('WebSocket not connected, cannot send course update');
    }
  }

  // 发送禁排时间更新
  async sendBlockedSlotsUpdate(slots: any[]) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_blocked_slots', slots);
    } else {
      console.warn('WebSocket not connected, cannot send blocked slots update');
    }
  }

  // 处理初始数据
  private handleInitialData(data: any) {
    if (data.scheduledCourses && data.scheduledCourses.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(data.scheduledCourses));
    }
    if (data.blockedSlots && data.blockedSlots.length > 0) {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(data.blockedSlots));
    }
    this.notifyListeners('initial_data', data);
  }

  // 处理课程更新
  private handleCoursesUpdated(data: any) {
    if (data.scheduledCourses) {
      localStorage.setItem(STORAGE_KEYS.SCHEDULED_CLASSES, JSON.stringify(data.scheduledCourses));
    }
    if (data.blockedSlots) {
      localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(data.blockedSlots));
    }
    this.notifyListeners('courses_updated', data);
  }

  // 处理禁排时间更新
  private handleBlockedSlotsUpdated(slots: any[]) {
    localStorage.setItem(STORAGE_KEYS.BLOCKED_SLOTS, JSON.stringify(slots));
    this.notifyListeners('blocked_slots_updated', slots);
  }

  // 添加事件监听器
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  // 移除事件监听器
  off(event: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(
        event,
        callbacks.filter(cb => cb !== callback)
      );
    }
  }

  // 通知监听器
  private notifyListeners(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  // 检查连接状态
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// 导出单例
const websocketService = new WebSocketService();
export default websocketService;