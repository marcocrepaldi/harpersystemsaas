'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { errorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, PencilLine, Copy, Trash2 } from 'lucide-react';

type Props = {
  id: string;
  row: {
    name: string;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
    personType?: 'PF' | 'PJ' | null;
    status?: 'LEAD' | 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | null;
  };
};

export default function RowActions({ id, row }: Props) {
  const router = useRouter();
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async () => apiFetch<void>(`/clients/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Cliente removido.');
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (e) => toast.error('Falha ao remover cliente.', { description: errorMessage(e) }),
  });

  const duplicate = useMutation({
    mutationFn: async () =>
      apiFetch('/clients', {
        method: 'POST',
        body: {
          name: `${row.name} (cópia)`,
          email: row.email || undefined,
          phone: row.phone || undefined,
          document: row.document || undefined,
          personType: row.personType || undefined,
          status: row.status || undefined,
        },
      }),
    onSuccess: () => {
      toast.success('Cópia criada.');
      qc.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (e) => toast.error('Falha ao copiar cliente.', { description: errorMessage(e) }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Ações</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => router.push(`/clients/${encodeURIComponent(id)}`)}>
          <PencilLine className="mr-2 h-4 w-4" /> Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => duplicate.mutate()}>
          <Copy className="mr-2 h-4 w-4" /> Duplicar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => {
            if (confirm('Deseja excluir este cliente?')) del.mutate();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
