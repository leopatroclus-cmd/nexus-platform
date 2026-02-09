'use client';

import {
  ColumnDef, flexRender, getCoreRowModel, useReactTable,
} from '@tanstack/react-table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData, TValue>({ columns, data, onRowClick }: DataTableProps<TData, TValue>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="rounded-xl border border-border/60 overflow-hidden">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border/60 bg-muted/30">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, i) => (
              <tr
                key={row.id}
                className="border-b border-border/30 transition-all duration-200 hover:bg-primary/[0.03] cursor-pointer group"
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-5 py-3.5 text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-32 text-center text-sm text-muted-foreground">
                No results found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
