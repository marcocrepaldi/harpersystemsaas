'use client';

import * as React from 'react';
import {
  ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import RowActions from '@/components/clients/RowActions';
import type { ClientRow } from './ClientsPage';
import { ArrowUpDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

type Props = {
  items: ClientRow[];
  colVisibility: Record<string, boolean>;
  onColVisibilityChange: (next: Record<string, boolean>) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
};

export default function ClientsTable({
  items, colVisibility, onColVisibilityChange, selectedIds, onSelectionChange,
}: Props) {
  const router = useRouter();

  const columns = React.useMemo<ColumnDef<ClientRow>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Selecionar todos"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Selecionar linha"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: () => (
        <div className="inline-flex items-center gap-1">
          Nome
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    { accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email || '—' },
    { accessorKey: 'phone', header: 'Telefone', cell: ({ row }) => row.original.phone || '—' },
    { accessorKey: 'document', header: 'Documento', cell: ({ row }) => row.original.document || '—' },
    { accessorKey: 'personType', header: 'Tipo', cell: ({ row }) => row.original.personType ?? '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ row }) => row.original.status ?? '—' },
    { accessorKey: 'cityUf', header: 'Cidade/UF', cell: ({ row }) => row.original.cityUf || '—' },
    {
      id: 'actions',
      header: () => <span className="sr-only">Ações</span>,
      cell: ({ row }) => <RowActions id={row.original.id} row={row.original} />,
      enableSorting: false,
      enableHiding: false,
    },
  ], []);

  const table = useReactTable({
    data: items,
    columns,
    state: {
      rowSelection: Object.fromEntries(selectedIds.map((id) => [id, true])),
      columnVisibility: colVisibility,
    },
    getRowId: (row) => row.id,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === 'function'
        ? updater(Object.fromEntries(selectedIds.map((id) => [id, true])))
        : updater;
      const ids = Object.entries(next).filter(([, v]) => Boolean(v)).map(([k]) => k);
      onSelectionChange(ids);
    },
    onColumnVisibilityChange: (v) => {
      const next = typeof v === 'function' ? v(colVisibility) : v;
      onColVisibilityChange(next as Record<string, boolean>);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  onClick={() => h.column.getCanSort() && h.column.toggleSorting()}
                  className={h.column.getCanSort() ? 'cursor-pointer select-none' : undefined}
                >
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && 'selected'}
              className="cursor-pointer hover:bg-accent/50 even:bg-muted/30"
              onClick={() => router.push(`/clients/${encodeURIComponent(row.original.id)}`)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  onClick={(e) => {
                    if (cell.column.id === 'select' || cell.column.id === 'actions') e.stopPropagation();
                  }}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={table.getAllLeafColumns().length} className="h-24 text-center">
                Nenhum registro para exibir.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
