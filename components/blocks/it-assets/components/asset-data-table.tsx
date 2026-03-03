"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
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
import { Lozenge } from "@/components/ui/lozenge";
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
import ShowMoreHorizontalIcon from "@atlaskit/icon/core/show-more-horizontal";
import {
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
	EyeIcon,
} from "lucide-react";
import type { ITAsset, ITAssetStatus } from "@/lib/it-asset-types";
import {
	getITAssetStatusLabel,
	getITAssetStatusVariant,
	IT_ASSET_STATUSES,
	IT_ASSET_TYPES,
} from "@/lib/it-asset-types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AssetDataTableProps {
	assets: ITAsset[];
	onEdit: (asset: ITAsset) => void;
	onDelete: (id: string) => void;
	onBulkDelete: (ids: string[]) => void;
	onAdd: () => void;
	onViewDetail: (asset: ITAsset) => void;
}

// ---------------------------------------------------------------------------
// Status Lozenge
// ---------------------------------------------------------------------------

function StatusLozenge({ status }: { status: ITAssetStatus }) {
	return (
		<Lozenge variant={getITAssetStatusVariant(status)}>
			{getITAssetStatusLabel(status)}
		</Lozenge>
	);
}

// ---------------------------------------------------------------------------
// Sortable header helper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

function getColumns(
	onEdit: (asset: ITAsset) => void,
	onDelete: (id: string) => void,
	onViewDetail: (asset: ITAsset) => void,
): ColumnDef<ITAsset>[] {
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
			header: ({ column }) => (
				<SortableHeader column={column} label="Name" />
			),
			cell: ({ row }) => (
				<button
					type="button"
					className="min-w-[180px] text-left hover:underline"
					onClick={() => onViewDetail(row.original)}
				>
					<div className="font-medium">{row.original.name}</div>
					<div className="text-muted-foreground text-xs">
						{row.original.assetTag}
						{row.original.serialNumber
							? ` · ${row.original.serialNumber}`
							: null}
					</div>
				</button>
			),
			enableHiding: false,
		},
		{
			accessorKey: "type",
			header: ({ column }) => (
				<SortableHeader column={column} label="Type" />
			),
			cell: ({ row }) => (
				<Badge variant="outline" className="text-muted-foreground text-xs">
					{row.original.type}
				</Badge>
			),
			filterFn: (row, id, value) => {
				if (!value || value === "all") return true;
				return row.getValue(id) === value;
			},
		},
		{
			accessorKey: "status",
			header: ({ column }) => (
				<SortableHeader column={column} label="Status" />
			),
			cell: ({ row }) => <StatusLozenge status={row.original.status} />,
			filterFn: (row, id, value) => {
				if (!value || value === "all") return true;
				return row.getValue(id) === value;
			},
		},
		{
			accessorKey: "assigneeName",
			header: ({ column }) => (
				<SortableHeader column={column} label="Assignee" />
			),
			cell: ({ row }) => {
				const { assigneeName, assigneeAvatar } = row.original;
				if (!assigneeName) {
					return (
						<span className="text-muted-foreground text-sm">
							Unassigned
						</span>
					);
				}
				return (
					<div className="flex items-center gap-2">
						{assigneeAvatar ? (
							<Image
								src={assigneeAvatar}
								alt={assigneeName}
								width={24}
								height={24}
								className="rounded-full"
							/>
						) : (
							<div className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-full text-xs font-medium">
								{assigneeName
									.split(" ")
									.map((n) => n[0])
									.join("")
									.slice(0, 2)}
							</div>
						)}
						<span className="text-sm">{assigneeName}</span>
					</div>
				);
			},
		},
		{
			accessorKey: "department",
			header: ({ column }) => (
				<SortableHeader column={column} label="Department" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{row.original.department ?? "—"}
				</span>
			),
		},
		{
			accessorKey: "purchaseDate",
			header: ({ column }) => (
				<SortableHeader column={column} label="Purchase Date" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-sm">
					{row.original.purchaseDate
						? new Intl.DateTimeFormat(undefined, {
								dateStyle: "medium",
							}).format(new Date(row.original.purchaseDate))
						: "—"}
				</span>
			),
		},
		{
			accessorKey: "purchaseCost",
			header: ({ column }) => (
				<div className="text-right">
					<SortableHeader column={column} label="Cost" />
				</div>
			),
			cell: ({ row }) => (
				<div className="text-right tabular-nums">
					{row.original.purchaseCost != null
						? `$${row.original.purchaseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
						: "—"}
				</div>
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
						<Icon
							render={<ShowMoreHorizontalIcon label="" size="small" />}
							label="Actions"
						/>
						<span className="sr-only">Open menu</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuGroup>
							<DropdownMenuItem
								onClick={() => onViewDetail(row.original)}
								elemBefore={
									<EyeIcon className="text-icon-subtle size-4" />
								}
							>
								View Details
							</DropdownMenuItem>
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AssetDataTable({
	assets,
	onEdit,
	onDelete,
	onBulkDelete,
	onAdd,
	onViewDetail,
}: AssetDataTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
	const [globalFilter, setGlobalFilter] = useState("");

	const columns = useMemo(
		() => getColumns(onEdit, onDelete, onViewDetail),
		[onEdit, onDelete, onViewDetail],
	);

	// eslint-disable-next-line react-hooks/incompatible-library
	const table = useReactTable({
		data: assets,
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
		globalFilterFn: (row, _columnId, filterValue) => {
			const search = filterValue.toLowerCase();
			const asset = row.original;
			return (
				asset.name.toLowerCase().includes(search) ||
				asset.assetTag.toLowerCase().includes(search) ||
				(asset.serialNumber?.toLowerCase().includes(search) ?? false) ||
				(asset.assigneeName?.toLowerCase().includes(search) ?? false) ||
				asset.type.toLowerCase().includes(search) ||
				(asset.manufacturer?.toLowerCase().includes(search) ?? false)
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
				<div className="flex flex-1 flex-wrap items-center gap-2">
					<div className="relative max-w-sm flex-1">
						<SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
						<Input
							placeholder="Search assets..."
							value={globalFilter}
							onChange={(e) => setGlobalFilter(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select
						value={
							(table
								.getColumn("status")
								?.getFilterValue() as string) ?? "all"
						}
						onValueChange={(value) =>
							table
								.getColumn("status")
								?.setFilterValue(
									value === "all" ? undefined : value,
								)
						}
						items={[
							{ label: "All Statuses", value: "all" },
							...IT_ASSET_STATUSES.map((s) => ({
								label: getITAssetStatusLabel(s),
								value: s,
							})),
						]}
					>
						<SelectTrigger className="w-[160px]" size="sm">
							<SelectValue placeholder="All Statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="all">All Statuses</SelectItem>
								{IT_ASSET_STATUSES.map((s) => (
									<SelectItem key={s} value={s}>
										{getITAssetStatusLabel(s)}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					<Select
						value={
							(table
								.getColumn("type")
								?.getFilterValue() as string) ?? "all"
						}
						onValueChange={(value) =>
							table
								.getColumn("type")
								?.setFilterValue(
									value === "all" ? undefined : value,
								)
						}
						items={[
							{ label: "All Types", value: "all" },
							...IT_ASSET_TYPES.map((t) => ({
								label: t,
								value: t,
							})),
						]}
					>
						<SelectTrigger className="w-[180px]" size="sm">
							<SelectValue placeholder="All Types" />
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								<SelectItem value="all">All Types</SelectItem>
								{IT_ASSET_TYPES.map((t) => (
									<SelectItem key={t} value={t}>
										{t}
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
						<DropdownMenuContent align="end" className="w-44">
							{table
								.getAllColumns()
								.filter(
									(column) =>
										typeof column.accessorFn !==
											"undefined" &&
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
										{column.id === "assigneeName"
											? "Assignee"
											: column.id === "purchaseDate"
												? "Purchase Date"
												: column.id === "purchaseCost"
													? "Cost"
													: column.id}
									</DropdownMenuCheckboxItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button size="sm" onClick={onAdd}>
						<PlusIcon data-icon="inline-start" />
						Add Asset
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
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef
														.header,
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
									data-state={
										row.getIsSelected() && "selected"
									}
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
									No assets found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between px-2">
				<div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
					{selectedCount} of{" "}
					{table.getFilteredRowModel().rows.length} row(s) selected.
				</div>
				<div className="flex w-full items-center gap-8 lg:w-fit">
					<div className="hidden items-center gap-2 lg:flex">
						<Label
							htmlFor="ita-rows-per-page"
							className="text-sm font-medium"
						>
							Rows per page
						</Label>
						<Select
							value={`${table.getState().pagination.pageSize}`}
							onValueChange={(value) =>
								table.setPageSize(Number(value))
							}
							items={[10, 20, 50].map((size) => ({
								label: `${size}`,
								value: `${size}`,
							}))}
						>
							<SelectTrigger
								size="sm"
								className="w-20"
								id="ita-rows-per-page"
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent side="top">
								<SelectGroup>
									{[10, 20, 50].map((size) => (
										<SelectItem
											key={size}
											value={`${size}`}
										>
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
							<span className="sr-only">
								Go to previous page
							</span>
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
							onClick={() =>
								table.setPageIndex(table.getPageCount() - 1)
							}
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
