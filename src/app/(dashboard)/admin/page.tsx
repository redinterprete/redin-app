'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, FileText, Clock, CheckCircle, Building2, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { formatDateTime } from '@/lib/utils';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type {
  ApiResponse,
  DashboardStats,
  WeeklyData,
  ServiceRequest,
  TopLanguage,
} from '@/types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyData[]>([]);
  const [recent, setRecent] = useState<ServiceRequest[]>([]);
  const [topLangs, setTopLangs] = useState<TopLanguage[]>([]);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const { socket } = useSocketContext();

  const fetchDashboard = useCallback(() => {
    api.get<ApiResponse<{
      stats: DashboardStats;
      weekly: WeeklyData[];
      recent: ServiceRequest[];
      topLangs: TopLanguage[];
    }>>('/dashboard/all')
      .then((res) => {
        setStats(res.data.stats);
        setWeekly(res.data.weekly);
        setRecent(res.data.recent);
        setTopLangs(res.data.topLangs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Real-time: debounced refetch on request events
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!socket) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchDashboard, 500);
    };
    socket.on('request:created', debouncedRefetch);
    socket.on('request:accepted', debouncedRefetch);
    socket.on('request:started', debouncedRefetch);
    socket.on('request:completed', debouncedRefetch);
    socket.on('request:cancelled', debouncedRefetch);
    return () => {
      socket.off('request:created', debouncedRefetch);
      socket.off('request:accepted', debouncedRefetch);
      socket.off('request:started', debouncedRefetch);
      socket.off('request:completed', debouncedRefetch);
      socket.off('request:cancelled', debouncedRefetch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, fetchDashboard]);

  const maxWeekly = Math.max(...weekly.map((w) => w.count), 1);
  const maxLang = Math.max(...topLangs.map((l) => l.count), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-redin-earth-900">Dashboard</h1>
        <p className="text-redin-earth-500">Resumen de actividad de REDIN</p>
      </div>

      {/* Alert banners */}
      {stats && (stats.pendingInstitutions ?? 0) > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-amber-600" />
            <span className="text-sm text-amber-800">
              {stats.pendingInstitutions} institucion{(stats.pendingInstitutions ?? 0) > 1 ? 'es' : ''} pendiente{(stats.pendingInstitutions ?? 0) > 1 ? 's' : ''} de aprobacion
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/instituciones')}>Revisar</Button>
        </div>
      )}
      {stats && (stats.pendingPaymentReviews ?? 0) > 0 && (
        <div className="p-4 bg-redin-gold-50 border border-redin-gold-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard size={20} className="text-redin-gold-600" />
            <span className="text-sm text-redin-gold-800">
              {stats.pendingPaymentReviews} pago{(stats.pendingPaymentReviews ?? 0) > 1 ? 's' : ''} pendiente{(stats.pendingPaymentReviews ?? 0) > 1 ? 's' : ''} de revision
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/pagos')}>Revisar</Button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatsCard
              title="Intérpretes activos"
              value={stats.totalInterpreters}
              icon={Users}
              accentColor="forest"
            />
            <StatsCard
              title="Solicitudes este mes"
              value={stats.requestsThisMonth}
              icon={FileText}
              accentColor="gold"
            />
            <StatsCard
              title="Pendientes"
              value={stats.pendingRequests}
              icon={Clock}
              accentColor="amber"
            />
            <StatsCard
              title="Completadas hoy"
              value={stats.completedToday}
              icon={CheckCircle}
              accentColor="green"
            />
          </>
        ) : null}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly chart */}
        <Card
          variant="default"
          header={
            <h3 className="font-semibold text-redin-earth-900">
              Servicios por semana
            </h3>
          }
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="h-48 bg-redin-earth-100 rounded animate-pulse" />
          ) : (
            <div className="flex items-end gap-2 h-48">
              {weekly.map((w, i) => (
                <div key={w.week} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-redin-earth-600">
                    {w.count}
                  </span>
                  <div
                    className="w-full bg-redin-gold-400 rounded-t transition-all duration-500"
                    style={{
                      height: `${(w.count / maxWeekly) * 100}%`,
                      minHeight: w.count > 0 ? '8px' : '2px',
                    }}
                  />
                  <span className="text-xs text-redin-earth-400">
                    S{i + 1}
                  </span>
                </div>
              ))}
              {weekly.length === 0 && (
                <p className="text-sm text-redin-earth-400 m-auto">
                  Sin datos aún
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Top languages */}
        <Card
          variant="default"
          header={
            <h3 className="font-semibold text-redin-earth-900">
              Lenguas más solicitadas
            </h3>
          }
        >
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-6 bg-redin-earth-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {topLangs.slice(0, 5).map((lang) => (
                <div key={lang.languageId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-redin-earth-700 font-medium">
                      {lang.name}
                    </span>
                    <span className="text-redin-earth-500">{lang.count}</span>
                  </div>
                  <div className="h-2 bg-redin-earth-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-redin-forest-400 rounded-full transition-all duration-500"
                      style={{ width: `${(lang.count / maxLang) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {topLangs.length === 0 && (
                <p className="text-sm text-redin-earth-400">Sin datos aún</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Recent requests */}
      <Card
        variant="default"
        header={
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-redin-earth-900">
              Solicitudes recientes
            </h3>
            <Link
              href="/admin/solicitudes"
              className="text-sm text-redin-gold-500 hover:text-redin-gold-600 font-medium"
            >
              Ver todas &rarr;
            </Link>
          </div>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Institución</TableHead>
                <TableHead>Lengua</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Intérprete</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{formatDateTime(req.createdAt)}</TableCell>
                  <TableCell>{req.institution.name}</TableCell>
                  <TableCell>{req.variant.language.name}</TableCell>
                  <TableCell className="text-xs">{req.variant.name}</TableCell>
                  <TableCell>
                    <StatusBadge status={req.status} size="sm" />
                  </TableCell>
                  <TableCell>
                    {req.interpreter?.user.name ?? (
                      <span className="text-redin-earth-300">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-redin-earth-400">
                    Sin solicitudes recientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
