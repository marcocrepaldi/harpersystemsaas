'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';

export type InsuranceLine = 'HEALTH' | 'DENTAL' | 'LIFE' | 'P_AND_C' | 'OTHER';

export type InsurerRow = {
  id: string;
  slug: string;
  legalName: string;
  tradeName: string;
  website?: string | null;
  lines: InsuranceLine[];
  isActive: boolean;
  updatedAt: string; // ISO para controle otimista
};

type Props = {
  items: InsurerRow[];
  onEdit: (row: InsurerRow) => void;
  onToggleActive: (row: InsurerRow) => void;
  onDelete: (row: InsurerRow) => void;
};

export default function InsurersTable({ items, onEdit, onToggleActive, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full border-collapse">
        <thead className="bg-muted/40">
          <tr className="text-left">
            <th className="px-4 py-3 text-sm font-semibold">Trade name</th>
            <th className="px-4 py-3 text-sm font-semibold">Legal name</th>
            <th className="px-4 py-3 text-sm font-semibold">Slug</th>
            <th className="px-4 py-3 text-sm font-semibold">Linhas</th>
            <th className="px-4 py-3 text-sm font-semibold">Status</th>
            <th className="px-4 py-3 text-sm font-semibold">Site</th>
            <th className="px-4 py-3 text-right text-sm font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma seguradora encontrada.
              </td>
            </tr>
          ) : (
            items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{row.tradeName}</div>
                </td>
                <td className="px-4 py-3">{row.legalName}</td>
                <td className="px-4 py-3">{row.slug}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.lines.map((l) => (
                      <span
                        key={l}
                        className="inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {row.isActive ? (
                    <span className="text-xs font-semibold text-emerald-700">ATIVA</span>
                  ) : (
                    <span className="text-xs font-semibold text-red-700">INATIVA</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.website ? (
                    <a className="text-primary underline-offset-2 hover:underline" href={row.website} target="_blank">
                      {row.website}
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onToggleActive(row)}>
                      {row.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(row)}>
                      Excluir
                    </Button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
