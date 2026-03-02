"use client";

import { useState, useMemo } from "react";
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnFiltersState,
	type SortingState,
	type VisibilityState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
	DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectGroup,
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
import { Icon } from "@/components/ui/icon";
import EditIcon from "@atlaskit/icon/core/edit";
import DeleteIcon from "@atlaskit/icon/core/delete";
import {
	EllipsisVerticalIcon,
	SearchIcon,
	PlusIcon,
	Trash2Icon,
	Columns3Icon,
	ChevronDownIcon,
	ChevronsLeftIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ChevronsRightIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	ArrowDownIcon,
} from "lucide-react";
import type { InventoryItem } from "@/lib/inventory-types";
import {
	getStockStatus,
	getStockStatusLabel,
	INVENTORY_CATEGORIES,
} from "@/lib/inventory-types";

interface InventoryTableProps {
	items: InventoryItem[];
	onEdit: (item: InventoryItem) => void;
	onDelete: (id: string) => void;
	onBulkDelete: (ids: string[]) => void;
	onAdd: () => void;
}

function StockBadge({ item }: { item: InventoryItem }) {
	const status = getStockStatus(item);
	const label = getStockStatusLabel(status);

	const variants: Record<string, string> = {
		"in-stock": "bg-bg-success-bold text-text-inverse",
		"low-stock": "bg-bg-warning-bold text-text-inverse",
		"out-of-stock": "bg-bg-danger-bold text-text-inverse",
	};

	return (
		<Badge className={`${variants[status]} text-xs`}>
			{label}
		</Badge>
	);
}

function SortableHeader<T>({
	column,
	label,
}: {
	column: import("@tanstack/react-table").Column<T>;
	label: string;
}) {
	const sorted = column.getIsSorted();
	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-3 h-8"
			onClick={() => column.toggleSorting(sorted === "asc")}
		>
			{label}
			{sorted === "asc" ? (
				<ArrowUpIcon className="ml-1 size-3" />
			) : sorted === "desc" ? (
				<ArrowDownIcon className="ml-1 size-3" />
			) : (
				<ArrowUpDownIcon className="ml-1 size-3 opacity-50" />
			)}
		</Button>
	);
}

function getColumns(
	onEdit: (item: InventoryItem) => void,
	onDelete: (id: string) => void,
): ColumnDef<InventoryItem>[] {
	return [
		{
			id: "select",
			header: ({ table }) => (
				<div className="flex items-center justify-center">
					<Checkbox
						checked={table.getIsAllPageRowsSelected()}
						indeterminate={
							table.getIsSomePageRowsSelected() &&
							!table.getIsAllPageRowsSelected()
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
						aria-label="Select all"
					/>
				</div>
			),
			cell: ({ row }) => (
				<div className="flex items-center justify-center">
					<Checkbox
						checked={row.getIsSelected()}
						onCheckedChange={(value) => row.toggleSelected(!!value)}
						aria-label="Select row"
					/>
				</div>
			),
			enableSorting: false,
			enableHiding: false,
		},
		{
			accessorKey: "name",
			header: ({ column }) => <SortableHeader column={column} label="Name" />,
			cell: ({ row }) => (
				<div className="min-w-[150px]">
					<div className="font-medium">{row.original.name}</div>
					<div className="text-muted-foreground text-xs">
						{row.original.sku}
					</div>
				</div>
			),
			enableHiding: false,
		},
		{
			accessorKey: "category",
			header: ({ column }) => (
				<SortableHeader column={column} label="Category" />
			),
			cell: ({ row }) => (
				<Badge variant="outline" className="text-muted-foreground text-xs">
					{row.original.category}
				</Badge>
			),
			filterFn: (row, id, value) => {
				if (!value || value === "all") return true;
				return row.getValue(id) === value;
			},
		},
		{
			accessorKey: "quantity",
			header: ({ column }) => (
				<SortableHeader column={column} label="Quantity" />
			),
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<span className="tabular-nums">{row.original.quantity.toLocaleString()}</span>
					<span className="text-muted-foreground text-xs">
						{row.original.unit}
					</span>
				</div>
			),
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => <StockBadge item={row.original} />,
			accessorFn: (row) => getStockStatus(row),
		},
		{
			accessorKey: "minStock",
			header: ({ column }) => (
				<SortableHeader column={column} label="Min Stock" />
			),
			cell: ({ row }) => (
				<span className="tabular-nums">{row.original.minStock}</span>
			),
		},
		{
			accessorKey: "location",
			header: ({ column }) => (
				<SortableHeader column={column} label="Location" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{row.original.location}
				</span>
			),
		},
		{
			accessorKey: "price",
			header: ({ column }) => (
				<div className="text-right">
					<SortableHeader column={column} label="Unit Price" />
				</div>
			),
			cell: ({ row }) => (
				<div className="text-right tabular-nums">
					${row.original.price.toFixed(2)}
				</div>
			),
		},
		{
			accessorKey: "lastUpdated",
			header: ({ column }) => (
				<SortableHeader column={column} label="Last Updated" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{new Intl.DateTimeFormat(undefined, {
						dateStyle: "medium",
					}).format(new Date(row.original.lastUpdated))}
				</span>
			),
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								variant="ghost"
								className="data-open:bg-bg-neutral-subtle-hovered text-icon-subtle flex size-8"
								size="icon"
							/>
						}
					>
						<EllipsisVerticalIcon />
						<span className="sr-only">Open menu</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => onEdit(row.original)}
								elemBefore={
									<Icon
										render={<EditIcon label="" size="small" />}
										label="Edit"
										className="text-icon-subtle"
									/>
								}
							>
								Edit
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => onDelete(row.original.id)}
								elemBefore={
									<Icon
										render={<DeleteIcon label="" size="small" />}
										label="Delete"
										className="text-icon-danger"
									/>
								}
							>
								Delete
							</DropdownMenuItem>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];
}

export function InventoryTable({
	items,
	onEdit,
	onDelete,
	onBulkDelete,
	onAdd,
}: InventoryTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	const [globalFilter, setGlobalFilter] = useState("");

	const columns = useMemo(() => getColumns(onEdit, onDelete), [onEdit, onDelete]);

	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: items,
		columns,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			pagination,
			globalFilter,
		},
		getRowId: (row) => row.id,
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onPaginationChange: setPagination,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		globalFilterFn: (row, columnId, filterValue) => {
			const search = filterValue.toLowerCase();
			const item = row.original;
			return (
				item.name.toLowerCase().includes(search) ||
				item.sku.toLowerCase().includes(search) ||
				item.location.toLowerCase().includes(search)
			);
		},
	});

	const selectedCount = table.getFilteredSelectedRowModel().rows.length;
	const selectedIds = table
		.getFilteredSelectedRowModel()
		.rows.map((row) => row.original.id);

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-1 items-center gap-2">
					<div className="relative max-w-sm flex-1">
						<SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
						<Input
							placeholder="Search items..."
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={
							(table.getColumn("category")?.getFilterValue() as string) ??
							"all"
						}
						onValueChange={(value) =>
							table
								.getColumn("category")
								?.setFilterValue(value === "all" ? undefined : value)
						}
						items={[
							{ label: "All Categories", value: "all" },
							...INVENTORY_CATEGORIES.map((c) => ({ label: c, value: c })),
						]}
					>
						<SelectTrigger className="w-[180px]" size="sm">
							<SelectValue placeholder="All Categories" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="all">All Categories</SelectItem>
								{INVENTORY_CATEGORIES.map((cat) => (
									<SelectItem key={cat} value={cat}>
										{cat}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</div>
				<div className="flex items-center gap-2">
					{selectedCount > 0 ? (
						<Button
							variant="destructive"
							size="sm"
							onClick={() => {
								onBulkDelete(selectedIds);
								setRowSelection({});
							}}
						>
							<Trash2Icon data-icon="inline-start" />
							Delete {selectedCount}
						</Button>
					) : null}
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="outline" size="sm" />}
						>
							<Columns3Icon data-icon="inline-start" />
							Columns
							<ChevronDownIcon data-icon="inline-end" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-40">
							{table
								.getAllColumns()
								.filter(
									(column) =>
										typeof column.accessorFn !== "undefined" &&
										column.getCanHide(),
								)
								.map((column) => (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={(value) =>
											column.toggleVisibility(!!value)
										}
									>
										{column.id}
									</DropdownMenuCheckboxItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button size="sm" onClick={onAdd}>
						<PlusIcon data-icon="inline-start" />
						Add Item
					</Button>
				</div>
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-lg border">
				<Table>
					<TableHeader className="bg-muted">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center"
								>
									No items found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between px-2">
				<div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
					{selectedCount} of {table.getFilteredRowModel().rows.length} row(s)
					selected.
				</div>
				<div className="flex w-full items-center gap-8 lg:w-fit">
					<div className="hidden items-center gap-2 lg:flex">
						<Label htmlFor="inv-rows-per-page" className="text-sm font-medium">
							Rows per page
						</Label>
						<Select
							value={`${table.getState().pagination.pageSize}`}
							onValueChange={(value) => table.setPageSize(Number(value))}
							items={[10, 20, 50].map((size) => ({
								label: `${size}`,
								value: `${size}`,
							}))}
						>
							<SelectTrigger size="sm" className="w-20" id="inv-rows-per-page">
								<SelectValue />
							</SelectTrigger>
							<SelectContent side="top">
								<SelectGroup>
									{[10, 20, 50].map((size) => (
										<SelectItem key={size} value={`${size}`}>
											{size}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<div className="flex w-fit items-center justify-center text-sm font-medium">
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()}
					</div>
					<div className="ml-auto flex items-center gap-2 lg:ml-0">
						<Button
							variant="outline"
							className="hidden size-8 lg:flex"
							size="icon"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<span className="sr-only">Go to first page</span>
							<ChevronsLeftIcon />
						</Button>
						<Button
							variant="outline"
							className="size-8"
							size="icon"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<span className="sr-only">Go to previous page</span>
							<ChevronLeftIcon />
						</Button>
						<Button
							variant="outline"
							className="size-8"
							size="icon"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<span className="sr-only">Go to next page</span>
							<ChevronRightIcon />
						</Button>
						<Button
							variant="outline"
							className="hidden size-8 lg:flex"
							size="icon"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<span className="sr-only">Go to last page</span>
							<ChevronsRightIcon />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
