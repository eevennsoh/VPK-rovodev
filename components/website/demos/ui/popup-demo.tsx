"use client";

import { Button } from "@/components/ui/button";
import {
	Popup,
	PopupContent,
	PopupDescription,
	PopupHeader,
	PopupTitle,
	PopupTrigger,
} from "@/components/ui/popup";

export default function PopupDemo() {
	return (
		<Popup>
			<PopupTrigger render={<Button variant="outline" size="sm" />}>
				Open popup
			</PopupTrigger>
			<PopupContent>
				<PopupHeader>
					<PopupTitle>Popup title</PopupTitle>
					<PopupDescription>This is a popup description.</PopupDescription>
				</PopupHeader>
			</PopupContent>
		</Popup>
	);
}

export function PopupDemoDefault() {
	return (
		<Popup>
			<PopupTrigger render={<Button variant="outline" />}>
				Open popup
			</PopupTrigger>
			<PopupContent>
				<PopupHeader>
					<PopupTitle>Details</PopupTitle>
					<PopupDescription>
						Additional information shown in a popup overlay.
					</PopupDescription>
				</PopupHeader>
			</PopupContent>
		</Popup>
	);
}

export function PopupDemoPlacements() {
	return (
		<div className="flex flex-wrap gap-2">
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Bottom
				</PopupTrigger>
				<PopupContent side="bottom" className="w-40">
					Popup on bottom
				</PopupContent>
			</Popup>
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Top
				</PopupTrigger>
				<PopupContent side="top" className="w-40">
					Popup on top
				</PopupContent>
			</Popup>
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Left
				</PopupTrigger>
				<PopupContent side="left" className="w-40">
					Popup on left
				</PopupContent>
			</Popup>
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Right
				</PopupTrigger>
				<PopupContent side="right" className="w-40">
					Popup on right
				</PopupContent>
			</Popup>
		</div>
	);
}

export function PopupDemoAlignments() {
	return (
		<div className="flex gap-6">
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Start
				</PopupTrigger>
				<PopupContent align="start" className="w-40">
					Aligned to start
				</PopupContent>
			</Popup>
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					Center
				</PopupTrigger>
				<PopupContent align="center" className="w-40">
					Aligned to center
				</PopupContent>
			</Popup>
			<Popup>
				<PopupTrigger render={<Button variant="outline" size="sm" />}>
					End
				</PopupTrigger>
				<PopupContent align="end" className="w-40">
					Aligned to end
				</PopupContent>
			</Popup>
		</div>
	);
}

export function PopupDemoWithContent() {
	return (
		<Popup>
			<PopupTrigger render={<Button variant="outline" />}>
				Show details
			</PopupTrigger>
			<PopupContent className="w-64" align="start">
				<PopupHeader>
					<PopupTitle>Item details</PopupTitle>
					<PopupDescription>
						View and manage the properties of this item.
					</PopupDescription>
				</PopupHeader>
				<div className="flex items-center justify-end gap-2 pt-2">
					<Button variant="outline" size="sm">Cancel</Button>
					<Button size="sm">Save</Button>
				</div>
			</PopupContent>
		</Popup>
	);
}
