import type * as React from "react";
import { Fragment } from "react";
import Link from "next/link";

import { cn } from "@acme/ui";
import { Alert, AlertDescription, AlertTitle } from "@acme/ui/alert";
import { Badge } from "@acme/ui/badge";
import { Button } from "@acme/ui/button";
import { Skeleton } from "@acme/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@acme/ui/table";

export interface AdminDataListColumn<TRow> {
  cell: (row: TRow) => React.ReactNode;
  className?: string;
  header: React.ReactNode;
  headerClassName?: string;
  id: string;
  mobileLabel?: string;
  rowHeader?: boolean;
  sort?: AdminDataListColumnSort;
}

export type AdminDataListSortDirection = "ascending" | "descending";

export interface AdminDataListColumnSort {
  ariaLabel?: string;
  current?: AdminDataListSortDirection;
  href: string;
  label: string;
}

export interface AdminDataListFilter {
  href?: string;
  label: string;
  value: string;
}

export interface AdminDataListPagination {
  hrefForPage?: (page: number) => string | undefined;
  page: number;
  pageSize: number;
  totalItems: number;
}

export interface AdminDataListStateCopy {
  description?: string;
  title: string;
}

export interface AdminDataListRowActions<TRow> {
  className?: string;
  header?: React.ReactNode;
  headerClassName?: string;
  mobileLabel?: string;
  render: (row: TRow) => React.ReactNode;
}

export interface AdminDataListProps<TRow> {
  actions?: React.ReactNode;
  activeFilters?: readonly AdminDataListFilter[];
  columns: readonly AdminDataListColumn<TRow>[];
  description?: string;
  emptyState: AdminDataListStateCopy;
  errorState?: AdminDataListStateCopy;
  filteredEmptyState?: AdminDataListStateCopy;
  filterBar?: React.ReactNode;
  getRowKey: (row: TRow) => string;
  id: string;
  loadingRowCount?: number;
  pagination?: AdminDataListPagination;
  renderMobileCard?: (row: TRow) => React.ReactNode;
  rowActions?: AdminDataListRowActions<TRow>;
  rows: readonly TRow[];
  state?: "error" | "loading" | "ready";
  tableCaption: string;
  title: string;
  totalLabel?: string;
}

export function AdminDataList<TRow>(props: AdminDataListProps<TRow>) {
  const state = props.state ?? "ready";
  const activeFilters = props.activeFilters ?? [];
  const hasFilters = activeFilters.length > 0;
  const isEmpty = state === "ready" && props.rows.length === 0;
  const emptyState =
    hasFilters && props.filteredEmptyState
      ? props.filteredEmptyState
      : props.emptyState;
  const columnCount = props.columns.length + (props.rowActions ? 1 : 0);

  return (
    <section
      aria-labelledby={`${props.id}-heading`}
      className="border-border bg-card text-card-foreground flex min-w-0 flex-col overflow-hidden rounded-lg border shadow-xs"
      data-admin-data-list={props.id}
      data-admin-data-list-state={state}
    >
      <AdminDataListHeader
        actions={props.actions}
        description={props.description}
        headingId={`${props.id}-heading`}
        title={props.title}
        totalLabel={props.totalLabel}
      />

      {props.filterBar ? (
        <div className="border-border border-b p-4 sm:p-5">
          {props.filterBar}
        </div>
      ) : null}

      <AdminDataListActiveFilters filters={activeFilters} />

      {state === "loading" ? (
        <AdminDataListLoadingState
          columnCount={columnCount}
          rowCount={props.loadingRowCount ?? 5}
        />
      ) : state === "error" ? (
        <AdminDataListErrorState
          description={props.errorState?.description}
          title={props.errorState?.title ?? "No se pudieron cargar los datos"}
        />
      ) : isEmpty ? (
        <AdminDataListEmptyState state={emptyState} />
      ) : (
        <AdminDataListReadyContent
          columns={props.columns}
          getRowKey={props.getRowKey}
          renderMobileCard={props.renderMobileCard}
          rowActions={props.rowActions}
          rows={props.rows}
          tableCaption={props.tableCaption}
        />
      )}

      {props.pagination && state === "ready" && !isEmpty ? (
        <AdminDataListPaginationControls pagination={props.pagination} />
      ) : null}
    </section>
  );
}

function AdminDataListHeader(props: {
  actions?: React.ReactNode;
  description?: string;
  headingId: string;
  title: string;
  totalLabel?: string;
}) {
  return (
    <div className="border-border flex min-w-0 flex-col gap-3 border-b p-4 sm:p-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h3
          className="text-xl font-semibold tracking-normal"
          id={props.headingId}
        >
          {props.title}
        </h3>
        {props.description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            {props.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {props.totalLabel ? (
          <Badge variant="secondary">{props.totalLabel}</Badge>
        ) : null}
        {props.actions}
      </div>
    </div>
  );
}

function AdminDataListActiveFilters(props: {
  filters: readonly AdminDataListFilter[];
}) {
  if (props.filters.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Filtros activos"
      className="border-border flex flex-wrap gap-2 border-b px-4 py-3 sm:px-5"
    >
      {props.filters.map((filter) => (
        <AdminDataListActiveFilter
          filter={filter}
          key={`${filter.label}:${filter.value}`}
        />
      ))}
    </div>
  );
}

function AdminDataListActiveFilter(props: { filter: AdminDataListFilter }) {
  const label = `${props.filter.label}: ${props.filter.value}`;

  if (!props.filter.href) {
    return <Badge variant="outline">{label}</Badge>;
  }

  return (
    <Button
      asChild
      className="h-7 rounded-md px-2 text-xs"
      size="sm"
      variant="outline"
    >
      <Link href={props.filter.href}>{label}</Link>
    </Button>
  );
}

function AdminDataListReadyContent<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  renderMobileCard?: (row: TRow) => React.ReactNode;
  rowActions?: AdminDataListRowActions<TRow>;
  rows: readonly TRow[];
  tableCaption: string;
}) {
  return (
    <>
      <div className="grid gap-3 p-4 md:hidden">
        {props.rows.map((row) => (
          <AdminDataListMobileRow
            columns={props.columns}
            key={props.getRowKey(row)}
            renderMobileCard={props.renderMobileCard}
            row={row}
            rowActions={props.rowActions}
          />
        ))}
      </div>
      <AdminDataListDesktopTable
        columns={props.columns}
        getRowKey={props.getRowKey}
        rowActions={props.rowActions}
        rows={props.rows}
        tableCaption={props.tableCaption}
      />
    </>
  );
}

function AdminDataListMobileRow<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  renderMobileCard?: (row: TRow) => React.ReactNode;
  row: TRow;
  rowActions?: AdminDataListRowActions<TRow>;
}) {
  if (props.renderMobileCard) {
    return <Fragment>{props.renderMobileCard(props.row)}</Fragment>;
  }

  return (
    <DefaultMobileCard
      columns={props.columns}
      row={props.row}
      rowActions={props.rowActions}
    />
  );
}

function AdminDataListDesktopTable<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  getRowKey: (row: TRow) => string;
  rowActions?: AdminDataListRowActions<TRow>;
  rows: readonly TRow[];
  tableCaption: string;
}) {
  return (
    <div
      className="hidden min-w-0 overflow-x-auto md:block"
      data-admin-data-list-table-scroll
    >
      <Table className="min-w-[760px] table-fixed">
        <TableCaption className="sr-only">{props.tableCaption}</TableCaption>
        <AdminDataListTableHeader
          columns={props.columns}
          rowActions={props.rowActions}
        />
        <TableBody>
          {props.rows.map((row) => (
            <AdminDataListTableRow
              columns={props.columns}
              key={props.getRowKey(row)}
              row={row}
              rowActions={props.rowActions}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AdminDataListTableHeader<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  rowActions?: AdminDataListRowActions<TRow>;
}) {
  return (
    <TableHeader className="bg-muted/70 sticky top-0 z-10">
      <TableRow>
        {props.columns.map((column) => (
          <TableHead
            aria-sort={getColumnAriaSort(column)}
            className={cn(
              "px-3 py-3 break-words whitespace-normal",
              column.headerClassName,
            )}
            key={column.id}
            scope="col"
          >
            <AdminDataListColumnHeader column={column} />
          </TableHead>
        ))}
        {props.rowActions ? (
          <TableHead
            className={cn(
              "w-px px-3 py-3 text-right whitespace-nowrap",
              props.rowActions.headerClassName,
            )}
            scope="col"
          >
            {props.rowActions.header ?? "Acciones"}
          </TableHead>
        ) : null}
      </TableRow>
    </TableHeader>
  );
}

function AdminDataListTableRow<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  row: TRow;
  rowActions?: AdminDataListRowActions<TRow>;
}) {
  return (
    <TableRow>
      {props.columns.map((column) => (
        <AdminDataListTableCell
          column={column}
          key={column.id}
          row={props.row}
        />
      ))}
      {props.rowActions ? (
        <TableCell
          className={cn(
            "px-3 py-3 text-right align-top whitespace-normal",
            props.rowActions.className,
          )}
          data-admin-data-list-cell="actions"
        >
          <div className="inline-flex max-w-full flex-wrap justify-end gap-2">
            {props.rowActions.render(props.row)}
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
}

function AdminDataListTableCell<TRow>(props: {
  column: AdminDataListColumn<TRow>;
  row: TRow;
}) {
  const Cell = props.column.rowHeader ? TableHead : TableCell;

  return (
    <Cell
      className={cn(
        "min-w-0 px-3 py-3 align-top break-words whitespace-normal",
        props.column.className,
      )}
      scope={props.column.rowHeader ? "row" : undefined}
    >
      {props.column.cell(props.row)}
    </Cell>
  );
}

function AdminDataListColumnHeader<TRow>(props: {
  column: AdminDataListColumn<TRow>;
}) {
  const sort = props.column.sort;

  if (!sort) {
    return <>{props.column.header}</>;
  }

  return (
    <Link
      aria-label={sort.ariaLabel ?? getSortLinkAriaLabel(sort)}
      className="focus-visible:border-ring focus-visible:ring-ring/50 inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-sm text-left underline-offset-4 outline-none hover:underline focus-visible:ring-[3px]"
      href={sort.href}
    >
      <span className="min-w-0 break-words">{props.column.header}</span>
      <span
        aria-hidden="true"
        className="border-border bg-background text-muted-foreground shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] leading-none font-medium"
      >
        {getSortVisualLabel(sort.current)}
      </span>
    </Link>
  );
}

function getColumnAriaSort<TRow>(
  column: AdminDataListColumn<TRow>,
): NonNullable<React.AriaAttributes["aria-sort"]> | undefined {
  if (!column.sort) {
    return undefined;
  }

  return column.sort.current ?? "none";
}

function getSortLinkAriaLabel(sort: AdminDataListColumnSort) {
  if (!sort.current) {
    return `Ordenar por ${sort.label}`;
  }

  return `${sort.label}, ordenado ${getSortDirectionLabel(sort.current)}. Cambiar orden`;
}

function getSortDirectionLabel(direction: AdminDataListSortDirection) {
  return direction === "ascending" ? "ascendente" : "descendente";
}

function getSortVisualLabel(direction?: AdminDataListSortDirection) {
  if (!direction) {
    return "Ordenar";
  }

  return direction === "ascending" ? "Asc" : "Desc";
}

function DefaultMobileCard<TRow>(props: {
  columns: readonly AdminDataListColumn<TRow>[];
  row: TRow;
  rowActions?: AdminDataListRowActions<TRow>;
}) {
  return (
    <article className="border-border bg-background rounded-lg border p-4">
      <dl className="grid gap-3 text-sm">
        {props.columns.map((column) => (
          <div className="min-w-0" key={column.id}>
            <dt className="text-muted-foreground text-xs font-medium">
              {column.mobileLabel ?? column.header}
            </dt>
            <dd className="mt-1 min-w-0 break-words">
              {column.cell(props.row)}
            </dd>
          </div>
        ))}
      </dl>
      {props.rowActions ? (
        <div
          aria-label={props.rowActions.mobileLabel ?? "Acciones"}
          className="mt-4 flex flex-wrap gap-2"
        >
          {props.rowActions.render(props.row)}
        </div>
      ) : null}
    </article>
  );
}

function AdminDataListLoadingState(props: {
  columnCount: number;
  rowCount: number;
}) {
  const rows = Array.from({ length: props.rowCount }, (_, index) => index);

  return (
    <div aria-busy="true" className="grid gap-3 p-4 sm:p-5">
      {rows.map((row) => (
        <div
          className="grid gap-3 md:grid-cols-[repeat(var(--admin-data-list-columns),minmax(0,1fr))]"
          key={row}
          style={
            {
              "--admin-data-list-columns": props.columnCount,
            } as React.CSSProperties
          }
        >
          {Array.from({ length: props.columnCount }, (_, index) => (
            <Skeleton className="h-9 w-full" key={index} />
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminDataListErrorState(props: {
  description?: string;
  title: string;
}) {
  return (
    <div className="p-4 sm:p-5">
      <Alert variant="destructive">
        <AlertTitle>{props.title}</AlertTitle>
        {props.description ? (
          <AlertDescription>
            <p>{props.description}</p>
          </AlertDescription>
        ) : null}
      </Alert>
    </div>
  );
}

function AdminDataListEmptyState(props: { state: AdminDataListStateCopy }) {
  return (
    <div className="p-4 sm:p-5">
      <div className="border-border bg-background rounded-lg border p-5">
        <p className="font-semibold">{props.state.title}</p>
        {props.state.description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-6">
            {props.state.description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AdminDataListPaginationControls(props: {
  pagination: AdminDataListPagination;
}) {
  const totalPages = Math.max(
    1,
    Math.ceil(props.pagination.totalItems / props.pagination.pageSize),
  );
  const page = Math.min(Math.max(props.pagination.page, 1), totalPages);
  const start =
    props.pagination.totalItems === 0
      ? 0
      : (page - 1) * props.pagination.pageSize + 1;
  const end = Math.min(
    props.pagination.totalItems,
    page * props.pagination.pageSize,
  );
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="border-border flex min-w-0 flex-col gap-3 border-t p-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <p className="text-muted-foreground">
        Mostrando {start}-{end} de {props.pagination.totalItems}
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <PaginationButton
          disabled={!canGoPrevious}
          href={props.pagination.hrefForPage?.(page - 1)}
        >
          Anterior
        </PaginationButton>
        <span className="text-muted-foreground px-2 text-sm">
          Página {page} de {totalPages}
        </span>
        <PaginationButton
          disabled={!canGoNext}
          href={props.pagination.hrefForPage?.(page + 1)}
        >
          Siguiente
        </PaginationButton>
      </div>
    </div>
  );
}

function PaginationButton(props: {
  children: React.ReactNode;
  disabled: boolean;
  href?: string;
}) {
  if (props.disabled || !props.href) {
    return (
      <Button disabled size="sm" type="button" variant="outline">
        {props.children}
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={props.href}>{props.children}</Link>
    </Button>
  );
}
