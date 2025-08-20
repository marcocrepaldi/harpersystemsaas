"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
  VisibilityState,
  PaginationState,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { apiFetch } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export type Status = "lead" | "prospect" | "active" | "inactive";

export const schema = z.object({
  id: z.number(),                // id da linha (DnD)
  clientId: z.string(),          // id real do backend
  header: z.string(),            // Nome
  target: z.string().nullable().optional(),   // Email
  limit: z.string().nullable().optional(),    // Telefone
  reviewer: z.string().nullable().optional(), // Documento (CPF/CNPJ)
  status: z.enum(["lead", "prospect", "active", "inactive"]).optional(),
  location: z.string().nullable().optional(), // Cidade/UF
  personType: z.enum(["PF", "PJ"]).optional(),
});
export type DataTableRow = z.infer<typeof schema>;

type DataTableProps = {
  data: DataTableRow[];
  onAdd?: () => void;
};

function DragHandle({ id }: { id: number }) {
  const { attributes, listeners } = useSortable({ id });
  return (
    <Button {...attributes} {...listeners} variant="ghost" size="icon" className="text-muted-foreground size-7 hover:bg-transparent">
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  );
}

function ActionsCell({ row }: { row: DataTableRow }) {
  const router = useRouter();
  const qc = useQueryClient();

  const deleteOne = useMutation({
    mutationFn: async (id: string) => apiFetch<void>(`/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Cliente removido.");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: unknown) =>
      toast.error("Erro ao remover cliente", { description: errorMessage(err) }),
  });

  const copyOne = useMutation({
    mutationFn: async (r: DataTableRow) =>
      apiFetch<unknown>("/clients", {
        method: "POST",
        body: {
          name: `${r.header} (copy)`,
          email: r.target || undefined,
          phone: r.limit || undefined,
          document: r.reviewer || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Cópia criada.");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: unknown) =>
      toast.error("Erro ao copiar cliente", { description: errorMessage(err) }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
          <IconDotsVertical />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {/* Edit → /clients/:id (sem /edit) */}
        <DropdownMenuItem onClick={() => router.push(`/clients/${row.clientId}`)}>
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => copyOne.mutate(row)}>Make a copy</DropdownMenuItem>
        <DropdownMenuItem>Favorite</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            if (window.confirm("Deseja realmente excluir este cliente?")) {
              deleteOne.mutate(row.clientId);
            }
          }}
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const columns: ColumnDef<DataTableRow>[] = [
  { id: "drag", header: () => null, cell: ({ row }) => <DragHandle id={row.original.id} />, enableSorting: false, enableHiding: false },
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label="Select row" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { accessorKey: "header", header: "Nome", cell: ({ row }) => <span className="font-medium">{row.original.header}</span>, enableHiding: false },
  { accessorKey: "personType", header: "Tipo", cell: ({ row }) => row.original.personType ?? "-", },
  { accessorKey: "target", header: "E-mail", cell: ({ row }) => row.original.target || "-", },
  { accessorKey: "limit", header: "Telefone", cell: ({ row }) => row.original.limit || "-", },
  { accessorKey: "reviewer", header: "Documento", cell: ({ row }) => row.original.reviewer || "-", },
  { accessorKey: "status", header: "Status", cell: ({ row }) => row.original.status || "-", },
  { accessorKey: "location", header: "Cidade/UF", cell: ({ row }) => row.original.location || "-", },
  { id: "actions", header: () => <span className="sr-only">Ações</span>, cell: ({ row }) => <ActionsCell row={row.original} /> },
];

function DraggableRow({ row }: { row: Row<DataTableRow> }) {
  const { transform, transition, setNodeRef, isDragging } = useSortable({ id: row.original.id });
  return (
    <TableRow
      data-state={row.getIsSelected() && "selected"}
      data-dragging={isDragging}
      ref={setNodeRef}
      className="relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80"
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  );
}

export function DataTable({ data: initialData, onAdd }: DataTableProps) {
  const router = useRouter();
  const qc = useQueryClient();

  const [data, setData] = React.useState<DataTableRow[]>(() => initialData);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const dataIds = React.useMemo<UniqueIdentifier[]>(() => data?.map(({ id }) => id) || [], [data]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection, columnFilters, pagination },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((d) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(d, oldIndex, newIndex);
      });
    }
  }

  // bulk delete
  const deleteMany = useMutation({
    mutationFn: async (ids: string[]) =>
      Promise.all(ids.map((id) => apiFetch<void>(`/clients/${id}`, { method: "DELETE" }))),
    onSuccess: () => {
      toast.success("Clientes removidos.");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: unknown) =>
      toast.error("Erro ao remover clientes", { description: errorMessage(err) }),
  });

  // Sem useMemo para evitar warning de deps complexas
  const selectedClientIds: string[] = table
    .getSelectedRowModel()
    .rows.map((r) => r.original.clientId)
    .filter(Boolean);

  return (
    <Tabs defaultValue="outline" className="w-full flex-col justify-start gap-6">
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => (onAdd ? onAdd() : router.push("/clients/new"))}>
            <IconPlus />
            <span className="hidden lg:inline">Add Client</span>
          </Button>
          {selectedClientIds.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (window.confirm(`Excluir ${selectedClientIds.length} cliente(s)?`)) {
                  deleteMany.mutate(selectedClientIds);
                }
              }}
            >
              <IconTrash className="mr-1" />
              Delete selected
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Customize Columns</span>
                <span className="lg:hidden">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter((c) => typeof c.accessorFn !== "undefined" && c.getCanHide())
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    className="capitalize"
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                  >
                    {c.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <TabsList className="hidden @4xl/main:flex">
        <TabsTrigger value="outline">Lista</TabsTrigger>
      </TabsList>

      <TabsContent value="outline" className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <DndContext
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
            sensors={sensors}
            id={sortableId}
          >
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((h) => (
                      <TableHead key={h.id} colSpan={h.colSpan}>
                        {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody className="**:data-[slot=table-cell]:first:w-8">
                {table.getRowModel().rows?.length ? (
                  <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                    {table.getRowModel().rows.map((row) => (
                      <DraggableRow key={row.id} row={row} />
                    ))}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DndContext>
        </div>

        <div className="flex items-center justify-between px-4">
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((ps) => (
                    <SelectItem key={ps} value={`${ps}`}>
                      {ps}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <IconChevronsLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <IconChevronLeft />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <IconChevronRight />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <IconChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
