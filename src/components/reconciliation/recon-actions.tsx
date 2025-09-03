'use client';

import * as React from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import CloseReconciliationDialog from '@/components/reconciliation/close-reconciliation-dialog';

type Props = {
  exportFormat: 'xlsx' | 'csv';
  onExportFormatChange: (v: 'xlsx' | 'csv') => void;
  activeTab: string;
  buildExportUrl: (tab: string) => string;

  search: string;
  onSearchChange: (v: string) => void;

  isLoading: boolean;
  hasInvoice: boolean;
  mesReferencia?: string;
  onDelete: () => void;
  deletePending: boolean;

  onReconcile: () => void;
  canReconcile: boolean;
  reconcilePending: boolean;

  // fechamento manual
  canCloseMonth: boolean;
  isClosed?: boolean;
  suggestedTotal?: number; // número (não BRL)
  onConfirmClose: (payload: { total: number; notes?: string }) => void;
  closingPending: boolean;
};

export function ReconActions(props: Props) {
  const {
    exportFormat,
    onExportFormatChange,
    activeTab,
    buildExportUrl,
    search,
    onSearchChange,
    isLoading,
    hasInvoice,
    mesReferencia,
    onDelete,
    deletePending,
    onReconcile,
    canReconcile,
    reconcilePending,
    canCloseMonth,
    isClosed,
    suggestedTotal,
    onConfirmClose,
    closingPending,
  } = props;

  const handleExportAllClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    if (exportFormat === 'csv') {
      e.preventDefault();
      alert('CSV não suporta exportar "Todas". Selecione XLSX ou escolha uma aba específica.');
    }
  };

  const exportHref = buildExportUrl(activeTab);
  const exportAllHref = buildExportUrl('all');

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mt-2 mb-3">
      {/* Esquerda: exportações */}
      <div className="flex items-center gap-2">
        <Select value={exportFormat} onValueChange={(v) => onExportFormatChange(v as 'xlsx' | 'csv')}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="xlsx">XLSX</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
          </SelectContent>
        </Select>

        <a href={exportHref} rel="noopener" className="inline-block">
          <Button>Exportar aba atual</Button>
        </a>

        <a href={exportAllHref} rel="noopener" className="inline-block" onClick={handleExportAllClick}>
          <Button variant="secondary">Exportar todas (XLSX)</Button>
        </a>
      </div>

      {/* Centro: busca */}
      <div className="relative w-full md:max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome, CPF ou valor (ex.: Maria • 12345678900 • 249,90)"
          className="pl-9"
        />
      </div>

      {/* Direita: excluir, conciliar e fechar mês */}
      <div className="flex items-center gap-2">
        {/* Excluir fatura do mês */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-[170px]"
              disabled={isLoading || !hasInvoice || deletePending}
            >
              {deletePending ? 'Excluindo...' : 'Excluir fatura do mês'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir fatura importada?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá todas as linhas importadas para o mês{' '}
                <strong>{mesReferencia?.slice(0, 7) || '—'}</strong> deste cliente. Essa operação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                Confirmar exclusão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Conciliar selecionadas */}
        <Button onClick={onReconcile} disabled={!canReconcile || reconcilePending}>
          {reconcilePending ? 'Conciliando...' : 'Marcar como Conciliado'}
        </Button>

        {/* Fechamento manual do mês */}
        <CloseReconciliationDialog
          disabled={!canCloseMonth || !!isClosed}
          suggestedTotal={suggestedTotal}
          pending={closingPending}
          onConfirm={onConfirmClose}
        />
      </div>
    </div>
  );
}

export default ReconActions;
