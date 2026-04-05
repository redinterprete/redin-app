'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import type { PaginatedResponse, Institution } from '@/types';

export default function InstitutionsPage() {
  const [data, setData] = useState<Institution[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (page: number, q: string) => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<Institution>>(
        `/institutions?page=${page}&limit=20${q ? `&search=${encodeURIComponent(q)}` : ''}`
      );
      setData(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData(1, search);
  }, [fetchData, search]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-redin-earth-900">Instituciones</h1>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar institución..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Sin instituciones"
            description="No se encontraron instituciones."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Solicitudes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>
                      {inst.type && <Badge variant="gold" size="sm">{inst.type}</Badge>}
                    </TableCell>
                    <TableCell>{inst.city ?? '—'}</TableCell>
                    <TableCell>{inst.state ?? '—'}</TableCell>
                    <TableCell className="text-xs">{inst.user.email}</TableCell>
                    <TableCell>{inst._count?.requests ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-redin-earth-500">
              <span>{pagination.total} instituciones</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1, search)}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchData(pagination.page + 1, search)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
