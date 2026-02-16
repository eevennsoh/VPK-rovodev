"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import ChevronUpIcon from "@atlaskit/icon/core/chevron-up";

interface CheckboxFilterDropdownProps {
	label: string;
	options: readonly string[];
	selectedValues: string[];
	onToggle: (value: string) => void;
}

export function CheckboxFilterDropdown({
	label,
	options,
	selectedValues,
	onToggle,
}: Readonly<CheckboxFilterDropdownProps>) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger
				render={
					<Button
						aria-expanded={isOpen}
						className="gap-2"
						variant="secondary"
					/>
				}
			>
				{label}
				{isOpen ? <ChevronUpIcon label="" size="small" /> : <ChevronDownIcon label="" size="small" />}
			</PopoverTrigger>
			<PopoverContent align="start" className="min-w-[200px] p-2">
				{options.map((option) => (
					<div key={option} className="py-1">
						<Label className="gap-2">
							<Checkbox
								checked={selectedValues.includes(option)}
								onCheckedChange={(checked) => {
									if (checked === true || checked === false) {
										onToggle(option);
									}
								}}
							/>
							<span>{option}</span>
						</Label>
					</div>
				))}
			</PopoverContent>
		</Popover>
	);
}
