"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onFileAccepted: (file: File | null) => void;
  isUploading?: boolean;
  maxSizeMB?: number;
};

const ACCEPT_MIME = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
const ACCEPT_EXT = [".csv", ".xls", ".xlsx"];

export function UploadDropzone({ onFileAccepted, isUploading, maxSizeMB = 50 }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = React.useState(false);

  const validateAndSend = (file: File | null) => {
    if (!file) return;
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`Arquivo muito grande. Máx: ${maxSizeMB} MB`);
      return;
    }
    const okMime = ACCEPT_MIME.includes(file.type);
    const okExt = ACCEPT_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!okMime && !okExt) {
      alert("Tipo de arquivo não suportado. Envie CSV, XLS ou XLSX.");
      return;
    }
    onFileAccepted(file);
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-dashed p-6 text-center transition",
        isDragging ? "bg-muted/70 border-primary" : "bg-muted/40",
        isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"
      )}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!isUploading) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); if (!isUploading) validateAndSend(e.dataTransfer.files?.[0] ?? null); }}
      role="button"
      aria-label="Área para soltar ou selecionar arquivo"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_EXT.join(",")}
        onChange={(e) => { validateAndSend(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }}
        className="hidden"
        disabled={isUploading}
      />
      <div className="space-y-2">
        <p className="text-sm">
          Arraste e solte o arquivo aqui, ou <span className="font-semibold">clique para selecionar</span>.
        </p>
        <p className="text-xs text-muted-foreground">Aceita: CSV, XLS, XLSX • Máx {maxSizeMB} MB</p>
        <div className="pt-2">
          <Button type="button" variant="secondary" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Selecionar arquivo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
