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
  "application/csv",
  "application/vnd.ms-excel", // .csv (alguns browsers) e .xls
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
] as const;

const ACCEPT_EXT = [".csv", ".xls", ".xlsx"] as const;

export function UploadDropzone({
  onFileAccepted,
  isUploading = false,
  maxSizeMB = 50,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setDragging] = React.useState(false);
  const [fileName, setFileName] = React.useState<string>("");

  const maxBytes = maxSizeMB * 1024 * 1024;

  const validateAndSend = React.useCallback(
    (file: File | null) => {
      if (!file) return;
      if (isUploading) return;

      // tamanho
      if (file.size > maxBytes) {
        alert(`Arquivo muito grande. Máx: ${maxSizeMB} MB`);
        return;
      }

      // extensão e mimetype (mimetype pode vir inconsistente, então basta UMA das verificações passar)
      const name = file.name.toLowerCase();
      const type = (file.type || "").toLowerCase();
      const okExt = ACCEPT_EXT.some((ext) => name.endsWith(ext));
      const okMime = ACCEPT_MIME.includes(type as (typeof ACCEPT_MIME)[number]);

      if (!okExt && !okMime) {
        alert("Tipo de arquivo não suportado. Envie CSV, XLS ou XLSX.");
        return;
      }

      setFileName(file.name);
      onFileAccepted(file);
    },
    [isUploading, maxBytes, maxSizeMB, onFileAccepted]
  );

  const openPicker = () => {
    if (!isUploading) inputRef.current?.click();
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (isUploading) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openPicker();
    }
  };

  return (
    <div
      className={cn(
        "w-full rounded-lg border border-dashed p-6 text-center transition",
        isDragging ? "bg-muted/70 border-primary" : "bg-muted/40",
        isUploading ? "opacity-60 pointer-events-none" : "cursor-pointer"
      )}
      onClick={openPicker}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isUploading) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (isUploading) return;

        // pega apenas o primeiro arquivo
        const file = e.dataTransfer.files && e.dataTransfer.files[0] ? e.dataTransfer.files[0] : null;
        validateAndSend(file);
      }}
      role="button"
      tabIndex={0}
      aria-label="Área para soltar ou selecionar arquivo"
      aria-disabled={isUploading}
    >
      <input
        ref={inputRef}
        type="file"
        accept={[...ACCEPT_MIME, ...ACCEPT_EXT].join(",")}
        onChange={(e) => {
          const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
          validateAndSend(file);
          // limpa para permitir re-seleção do mesmo arquivo
          e.currentTarget.value = "";
        }}
        className="hidden"
        disabled={isUploading}
      />

      <div className="space-y-2">
        <p className="text-sm">
          Arraste e solte o arquivo aqui, ou{" "}
          <span className="font-semibold">clique para selecionar</span>.
        </p>
        <p className="text-xs text-muted-foreground">
          Aceita: CSV, XLS, XLSX • Máx {maxSizeMB} MB
        </p>

        {fileName ? (
          <p className="text-xs text-muted-foreground truncate">
            Selecionado: <span className="font-medium">{fileName}</span>
          </p>
        ) : null}

        <div className="pt-2">
          <Button type="button" variant="secondary" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Selecionar arquivo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
