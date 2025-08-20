"use client";

import { useState, Fragment } from "react";
import { Beneficiary } from "@/app/types/health";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  data: Beneficiary[];
  isLoading?: boolean;
  onNew?: () => void;
  onEdit?: (id: string) => void;
};

export function BeneficiariesTable({ data, isLoading, onNew, onEdit }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Beneficiários</CardTitle>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const titulares = data.filter((b) => b.tipo === "Titular");

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Beneficiários</CardTitle>
        <Button onClick={onNew}>Novo</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {titulares.map((t) => (
              <Fragment key={t.id}>
                <TableRow className="font-medium">
                  <TableCell
                    className="cursor-pointer"
                    onClick={() =>
                      setExpanded((e) => ({ ...e, [t.id]: !e[t.id] }))
                    }
                  >
                    {t.nomeCompleto}{" "}
                    {t.dependentes?.length ? (
                      <span className="ml-2 text-xs opacity-70">
                        ({t.dependentes.length} dep.)
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{t.cpf}</TableCell>
                  <TableCell>{t.tipo}</TableCell>
                  <TableCell>R$ {t.valorMensalidade.toFixed(2)}</TableCell>
                  <TableCell>{t.status}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="secondary" onClick={() => onEdit?.(t.id)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>

                {expanded[t.id] &&
                  (t.dependentes ?? []).map((d) => (
                    <TableRow key={d.id} className="bg-muted/40">
                      <TableCell className="pl-8">↳ {d.nomeCompleto}</TableCell>
                      <TableCell>{d.cpf}</TableCell>
                      <TableCell>{d.tipo}</TableCell>
                      <TableCell>
                        R$ {d.valorMensalidade.toFixed(2)}
                      </TableCell>
                      <TableCell>{d.status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" onClick={() => onEdit?.(d.id)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
