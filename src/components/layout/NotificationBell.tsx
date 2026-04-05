'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  FileText,
  CheckCircle,
  Play,
  XCircle,
  CreditCard,
  DollarSign,
  Clock,
  Info,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import type { NotificationType } from '@/types';

const notificationIcons: Record<
  NotificationType,
  { icon: typeof Bell; color: string }
> = {
  REQUEST_CREATED: { icon: FileText, color: 'text-blue-500' },
  REQUEST_ACCEPTED: { icon: CheckCircle, color: 'text-green-500' },
  REQUEST_STARTED: { icon: Play, color: 'text-purple-500' },
  REQUEST_COMPLETED: { icon: CheckCircle, color: 'text-green-600' },
  REQUEST_CANCELLED: { icon: XCircle, color: 'text-red-500' },
  PAYMENT_CREATED: { icon: CreditCard, color: 'text-redin-gold-500' },
  PAYMENT_COMPLETED: { icon: DollarSign, color: 'text-green-600' },
  REMINDER_24H: { icon: Clock, color: 'text-amber-500' },
  REMINDER_10MIN: { icon: Bell, color: 'text-red-500' },
  INTERPRETER_ASSIGNED: { icon: CheckCircle, color: 'text-green-500' },
  GENERAL: { icon: Info, color: 'text-gray-500' },
};

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-redin-earth-100 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-redin-earth-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-redin-earth-200 z-50 transition-all duration-200 ease-out">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-redin-earth-100">
            <h3 className="text-sm font-semibold text-redin-earth-900">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-redin-gold-500 hover:text-redin-gold-600 font-medium"
              >
                Marcar todas
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-redin-earth-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-redin-earth-300 mx-auto mb-2" />
                <p className="text-sm text-redin-earth-400">
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const iconDef = notificationIcons[n.type] ?? notificationIcons.GENERAL;
                const IconComp = iconDef.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-redin-earth-50 transition-colors',
                      !n.isRead && 'border-l-2 border-redin-gold-400 bg-redin-gold-50/30'
                    )}
                  >
                    <div className={cn('shrink-0 mt-0.5', iconDef.color)}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-redin-earth-900 truncate">
                        {n.title}
                      </p>
                      <p className="text-xs text-redin-earth-500 line-clamp-1">
                        {n.message}
                      </p>
                      <p className="text-[11px] text-redin-earth-400 mt-0.5">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="shrink-0 mt-2 h-2 w-2 rounded-full bg-redin-gold-400" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
