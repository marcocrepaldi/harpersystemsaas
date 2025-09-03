'use client';

import * as React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export type RowVariant = 'ok' | 'error' | undefined;

export type ReconRowWithId = { id: string } & Record<string, any>;

export type ColumnDef<T extends ReconRowWithId> = {
  header: string;
  key: keyof T & string;
  align?: 'left' | 'right' | 'center';
  emphasize?: boolean;
};

export function ReconTable<T extends ReconRowWithId>({
  columns,
  data,
  getRowVariant,
  selectedIds,
  onSelectChange,
}: {
  columns: ColumnDef<T>[];
  data: T[];
  getRowVariant?: (row: T) => RowVariant;
  selectedIds: string[];
  onSelectChange: (id: string, isChecked: boolean) => void;
}) {
  const allIds = data.map((d) => d.id);
  const allChecked = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id));

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              {data.length > 0 && (
                <Checkbox
                  checked={allChecked}
                  onCheckedChange={(checked) => {
                    if (checked) allIds.forEach((id) => onSelectChange(id, true));
                    else allIds.forEach((id) => onSelectChange(id, false));
                  }}
                  aria-label="Selecionar todos"
                />
              )}
            </TableHead>
            {columns.map((c) => (
              <TableHead
                key={c.header}
                className={
                  c.align === 'right'
                    ? 'text-right'
                    : c.align === 'center'
                    ? 'text-center'
                    : ''
                }
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + 1}
                className="text-center text-sm text-muted-foreground"
              >
                Nenhum registro para exibir.
              </TableCell>
            </TableRow>
          ) : (
            data.map((r) => {
              const variant = getRowVariant?.(r);
              const rowClass =
                variant === 'error'
                  ? 'bg-red-50/70 hover:bg-red-50'
                  : variant === 'ok'
                  ? 'bg-emerald-50/70 hover:bg-emerald-50'
                  : undefined;

              return (
                <TableRow key={r.id} className={rowClass}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(r.id)}
                      onCheckedChange={(checked) => onSelectChange(r.id, !!checked)}
                      aria-label="Selecionar linha"
                    />
                  </TableCell>
                  {columns.map((col) => {
                    let cell: any = r[col.key];
                    if (Array.isArray(cell)) cell = cell.join(', ');
                    const alignCls =
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : '';
                    const emphasizeCls =
                      col.emphasize && variant === 'error'
                        ? 'font-semibold text-red-700'
                        : col.emphasize && variant === 'ok'
                        ? 'font-semibold text-emerald-700'
                        : '';
                    return (
                      <TableCell key={`${r.id}-${col.key}`} className={`${alignCls} ${emphasizeCls}`}>
                        {String(cell ?? '—')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
