"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  onFileAccepted: (file: File | null) => void;
  isUploading?: boolean;
  maxSizeMB?: number;
};

const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = [".csv", ".xls", ".xlsx"];

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
      if (!file || isUploading) return;

      if (file.size > maxBytes) {
        alert(`Arquivo muito grande. Máx: ${maxSizeMB} MB`);
        return;
      }
      
      const name = file.name.toLowerCase();
      const type = (file.type || "").toLowerCase();
      
      const isMimeTypeValid = ALLOWED_MIME_TYPES.includes(type);
      const isExtensionValid = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

      if (!isMimeTypeValid && !isExtensionValid) {
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

  const acceptString = [...ALLOWED_MIME_TYPES, ...ALLOWED_EXTENSIONS].join(",");

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

        const file = e.dataTransfer.files?.[0] ?? null;
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
        accept={acceptString}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          validateAndSend(file);
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

        {fileName && (
          <p className="text-xs text-muted-foreground truncate">
            Selecionado: <span className="font-medium">{fileName}</span>
          </p>
        )}

        <div className="pt-2">
          <Button type="button" variant="secondary" disabled={isUploading}>
            {isUploading ? "Enviando..." : "Selecionar arquivo"}
          </Button>
        </div>
      </div>
    </div>
  );
}