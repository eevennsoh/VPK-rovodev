"use client";

import { useState, useCallback } from "react";
import type { AssetRequest, AssetType, Department } from "@/lib/asset-request-types";
import { ASSET_TYPES, DEPARTMENTS } from "@/lib/asset-request-types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AssetRequestFormProps {
	onSubmit: (request: Omit<AssetRequest, "id" | "submittedAt" | "status">) => void;
	className?: string;
}

export function AssetRequestForm({ onSubmit, className }: Readonly<AssetRequestFormProps>) {
	const [requesterName, setRequesterName] = useState("");
	const [department, setDepartment] = useState<Department | "">("");
	const [assetType, setAssetType] = useState<AssetType | "">("");
	const [justification, setJustification] = useState("");
	const [neededByDate, setNeededByDate] = useState("");
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [submitted, setSubmitted] = useState(false);

	const validate = useCallback(() => {
		const newErrors: Record<string, string> = {};
		if (!requesterName.trim()) newErrors.requesterName = "Name is required";
		if (!department) newErrors.department = "Department is required";
		if (!assetType) newErrors.assetType = "Asset type is required";
		if (!justification.trim()) newErrors.justification = "Justification is required";
		if (!neededByDate) newErrors.neededByDate = "Needed-by date is required";
		return newErrors;
	}, [requesterName, department, assetType, justification, neededByDate]);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const newErrors = validate();
			setErrors(newErrors);

			if (Object.keys(newErrors).length > 0) return;

			onSubmit({
				requesterName: requesterName.trim(),
				department: department as Department,
				assetType: assetType as AssetType,
				justification: justification.trim(),
				neededByDate,
			});

			// Reset form
			setRequesterName("");
			setDepartment("");
			setAssetType("");
			setJustification("");
			setNeededByDate("");
			setErrors({});
			setSubmitted(true);
			setTimeout(() => setSubmitted(false), 3000);
		},
		[requesterName, department, assetType, justification, neededByDate, validate, onSubmit],
	);

	return (
		<Card className={cn("w-full", className)}>
			<CardHeader>
				<CardTitle>New Asset Request</CardTitle>
				<CardDescription>
					Fill out the form below to request IT equipment or software.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
					{/* Requester Name */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="requester-name">
							Your Name <span className="text-text-danger">*</span>
						</Label>
						<Input
							id="requester-name"
							placeholder="e.g. Jane Smith"
							value={requesterName}
							onChange={(e) => setRequesterName(e.target.value)}
							aria-invalid={errors.requesterName ? true : undefined}
						/>
						{errors.requesterName ? (
							<p className="text-xs text-text-danger">{errors.requesterName}</p>
						) : null}
					</div>

					{/* Department */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="department">
							Department <span className="text-text-danger">*</span>
						</Label>
						<Select
							value={department}
							onValueChange={(val) => setDepartment(val as Department)}
						>
							<SelectTrigger id="department" aria-invalid={errors.department ? true : undefined}>
								<SelectValue placeholder="Select department" />
							</SelectTrigger>
							<SelectContent>
								{DEPARTMENTS.map((dept) => (
									<SelectItem key={dept} value={dept}>
										{dept}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.department ? (
							<p className="text-xs text-text-danger">{errors.department}</p>
						) : null}
					</div>

					{/* Asset Type */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="asset-type">
							Asset Type <span className="text-text-danger">*</span>
						</Label>
						<Select
							value={assetType}
							onValueChange={(val) => setAssetType(val as AssetType)}
						>
							<SelectTrigger id="asset-type" aria-invalid={errors.assetType ? true : undefined}>
								<SelectValue placeholder="Select asset type" />
							</SelectTrigger>
							<SelectContent>
								{ASSET_TYPES.map((type) => (
									<SelectItem key={type} value={type}>
										{type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.assetType ? (
							<p className="text-xs text-text-danger">{errors.assetType}</p>
						) : null}
					</div>

					{/* Needed By Date */}
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="needed-by">
							Needed By <span className="text-text-danger">*</span>
						</Label>
						<Input
							id="needed-by"
							type="date"
							value={neededByDate}
							onChange={(e) => setNeededByDate(e.target.value)}
							aria-invalid={errors.neededByDate ? true : undefined}
						/>
						{errors.neededByDate ? (
							<p className="text-xs text-text-danger">{errors.neededByDate}</p>
						) : null}
					</div>

					{/* Justification */}
					<div className="flex flex-col gap-1.5 sm:col-span-2">
						<Label htmlFor="justification">
							Justification <span className="text-text-danger">*</span>
						</Label>
						<Textarea
							id="justification"
							placeholder="Why do you need this asset? Provide details to help with approval."
							value={justification}
							onChange={(e) => setJustification(e.target.value)}
							rows={3}
							aria-invalid={errors.justification ? true : undefined}
						/>
						{errors.justification ? (
							<p className="text-xs text-text-danger">{errors.justification}</p>
						) : null}
					</div>

					{/* Submit */}
					<div className="sm:col-span-2 flex items-center gap-3">
						<Button type="submit">Submit Request</Button>
						{submitted ? (
							<span className="text-sm text-text-success">
								✓ Request submitted successfully
							</span>
						) : null}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
