'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useSocketContext } from '@/contexts/SocketContext';
import type {
  ApiResponse,
  PaginatedResponse,
  Notification,
  ServiceRequest,
  Payment,
} from '@/types';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  refetch: async () => {},
});

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { dbUser } = useAuth();
  const { socket } = useSocketContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!dbUser) return;
    setLoading(true);
    try {
      const countRes = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      setUnreadCount(countRes.data.count);
      const listRes = await api.get<PaginatedResponse<Notification>>('/notifications?page=1&limit=20');
      setNotifications(listRes.data);
    } catch {
      // API might not be available yet
    }
    setLoading(false);
  }, [dbUser]);

  // Fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !dbUser) return;

    const handleNewNotification = (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev].slice(0, 20));
      setUnreadCount((prev) => prev + 1);

      // Show toast for important notification types
      const { type, title, message } = data.notification;
      const important = [
        'REQUEST_CREATED',
        'REQUEST_ACCEPTED',
        'REQUEST_COMPLETED',
        'PAYMENT_COMPLETED',
        'PAYMENT_CREATED',
        'REMINDER_24H',
        'REMINDER_10MIN',
      ];
      if (important.includes(type)) {
        toast(
          `${title}: ${message}`,
          type === 'PAYMENT_COMPLETED' || type === 'REQUEST_COMPLETED'
            ? { icon: '\u2705' }
            : {}
        );
      }
    };

    const handleRequestAvailable = (data: { request: ServiceRequest }) => {
      if (dbUser.role === 'INTERPRETER') {
        const lang = data.request.variant?.language?.name ?? 'una lengua';
        toast(`Nueva solicitud de interpretacion en ${lang}`, { icon: '\uD83D\uDD14' });
      }
    };

    const handleRequestTaken = () => {
      if (dbUser.role === 'INTERPRETER') {
        toast('La solicitud fue tomada por otro interprete', { icon: '\u26A0\uFE0F' });
      }
    };

    const handleRequestAccepted = () => {
      if (dbUser.role === 'INSTITUTION') {
        toast.success('Tu solicitud fue aceptada por un interprete');
      }
    };

    const handleRequestStarted = () => {
      if (dbUser.role === 'INSTITUTION') {
        toast('El servicio ha iniciado', { icon: '\u25B6\uFE0F' });
      }
    };

    const handleRequestCompleted = () => {
      if (dbUser.role !== 'ADMIN') {
        toast.success('Servicio completado');
      }
    };

    const handlePaymentCompleted = () => {
      if (dbUser.role === 'INTERPRETER') {
        toast.success('Tu pago ha sido procesado');
      }
    };

    // Zoom meeting events
    const handleMeetingRenewed = () => {
      toast('La reunion de Zoom se renovo automaticamente', { icon: '\uD83D\uDD04', duration: 10000 });
    };
    const handleMeetingNoShow = () => {
      if (dbUser.role === 'ADMIN') {
        toast('Se detecto un no-show en una solicitud', { icon: '\u26A0\uFE0F' });
      }
    };
    const handleBothConnected = () => {
      if (dbUser.role !== 'ADMIN') {
        toast.success('Ambos participantes conectados. El servicio ha iniciado.');
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('request:available', handleRequestAvailable);
    socket.on('request:taken', handleRequestTaken);
    socket.on('request:accepted', handleRequestAccepted);
    socket.on('request:started', handleRequestStarted);
    socket.on('request:completed', handleRequestCompleted);
    socket.on('payment:completed', handlePaymentCompleted);
    socket.on('meeting:renewed', handleMeetingRenewed);
    socket.on('request:no_show', handleMeetingNoShow);
    socket.on('meeting:both_connected', handleBothConnected);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('request:available', handleRequestAvailable);
      socket.off('request:taken', handleRequestTaken);
      socket.off('request:accepted', handleRequestAccepted);
      socket.off('request:started', handleRequestStarted);
      socket.off('request:completed', handleRequestCompleted);
      socket.off('payment:completed', handlePaymentCompleted);
      socket.off('meeting:renewed', handleMeetingRenewed);
      socket.off('request:no_show', handleMeetingNoShow);
      socket.off('meeting:both_connected', handleBothConnected);
    };
  }, [socket, dbUser]);

  // Refetch on socket reconnect
  useEffect(() => {
    if (!socket) return;
    const handleReconnect = () => {
      fetchNotifications();
    };
    socket.io.on('reconnect', handleReconnect);
    return () => {
      socket.io.off('reconnect', handleReconnect);
    };
  }, [socket, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Silent fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  return useContext(NotificationContext);
}
