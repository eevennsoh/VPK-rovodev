"use client";

import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import type { InventoryItem, InventoryCategory } from "@/lib/inventory-types";
import { INVENTORY_CATEGORIES } from "@/lib/inventory-types";

interface ItemDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: InventoryItem | null;
	onSave: (
		data: Omit<InventoryItem, "id" | "createdAt" | "lastUpdated">,
	) => void;
	onUpdate?: (id: string, data: Partial<InventoryItem>) => void;
}

const EMPTY_FORM = {
	name: "",
	sku: "",
	category: "Electronics" as InventoryCategory,
	quantity: 0,
	minStock: 0,
	location: "",
	unit: "pcs",
	price: 0,
};

export function ItemDialog({
	open,
	onOpenChange,
	item,
	onSave,
	onUpdate,
}: ItemDialogProps) {
	const isEditing = !!item;
	const initialForm = item
		? {
				name: item.name,
				sku: item.sku,
				category: item.category,
				quantity: item.quantity,
				minStock: item.minStock,
				location: item.location,
				unit: item.unit,
				price: item.price,
			}
		: EMPTY_FORM;
	const [form, setForm] = useState(initialForm);

	// Reset form when dialog opens/closes or item changes
	const formKey = item?.id ?? "new";
	const [prevKey, setPrevKey] = useState(formKey);
	if (formKey !== prevKey) {
		setPrevKey(formKey);
		setForm(initialForm);
	}

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!form.name.trim() || !form.sku.trim()) return;

		if (isEditing && item && onUpdate) {
			onUpdate(item.id, form);
		} else {
			onSave(form);
		}
		onOpenChange(false);
	};

	const updateField = <K extends keyof typeof form>(
		key: K,
		value: (typeof form)[K],
	) => {
		setForm((prev) => ({ ...prev, [key]: value }));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>
							{isEditing ? "Edit Item" : "Add New Item"}
						</DialogTitle>
						<DialogDescription>
							{isEditing
								? "Update the inventory item details below."
								: "Enter the details for the new inventory item."}
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-name">Name *</Label>
								<Input
									id="item-name"
									value={form.name}
									onChange={(e) => updateField("name", e.target.value)}
									placeholder="Item name"
									required
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-sku">SKU *</Label>
								<Input
									id="item-sku"
									value={form.sku}
									onChange={(e) => updateField("sku", e.target.value)}
									placeholder="e.g. ELC-006"
									required
								/>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-category">Category</Label>
								<Select
									value={form.category}
									onValueChange={(value) =>
										updateField("category", value as InventoryCategory)
									}
									items={INVENTORY_CATEGORIES.map((c) => ({
										label: c,
										value: c,
									}))}
								>
									<SelectTrigger id="item-category">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{INVENTORY_CATEGORIES.map((cat) => (
												<SelectItem key={cat} value={cat}>
													{cat}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-location">Location</Label>
								<Input
									id="item-location"
									value={form.location}
									onChange={(e) => updateField("location", e.target.value)}
									placeholder="e.g. Aisle A, Shelf 1"
								/>
							</div>
						</div>
						<div className="grid grid-cols-3 gap-4">
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-quantity">Quantity</Label>
								<Input
									id="item-quantity"
									type="number"
									min={0}
									value={form.quantity}
									onChange={(e) =>
										updateField("quantity", parseInt(e.target.value, 10) || 0)
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-min-stock">Min Stock</Label>
								<Input
									id="item-min-stock"
									type="number"
									min={0}
									value={form.minStock}
									onChange={(e) =>
										updateField("minStock", parseInt(e.target.value, 10) || 0)
									}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<Label htmlFor="item-unit">Unit</Label>
								<Input
									id="item-unit"
									value={form.unit}
									onChange={(e) => updateField("unit", e.target.value)}
									placeholder="pcs"
								/>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="item-price">Unit Price ($)</Label>
							<Input
								id="item-price"
								type="number"
								min={0}
								step={0.01}
								value={form.price}
								onChange={(e) =>
									updateField("price", parseFloat(e.target.value) || 0)
								}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">
							{isEditing ? "Save Changes" : "Add Item"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
