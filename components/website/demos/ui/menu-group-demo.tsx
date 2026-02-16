"use client";

import { Button } from "@/components/ui/button";
import { MenuGroup } from "@/components/ui/menu-group";

export default function MenuGroupDemo() {
	return (
		<div className="w-56 rounded-lg border bg-surface p-1">
			<MenuGroup title="Actions">
				<Button variant="ghost" className="w-full justify-start" size="sm">Edit</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Duplicate</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Archive</Button>
			</MenuGroup>
		</div>
	);
}

export function MenuGroupDemoDefault() {
	return (
		<div className="w-56 rounded-lg border bg-surface p-1">
			<MenuGroup title="Navigation">
				<Button variant="ghost" className="w-full justify-start" size="sm">Home</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Projects</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Settings</Button>
			</MenuGroup>
		</div>
	);
}

export function MenuGroupDemoMultipleGroups() {
	return (
		<div className="w-56 rounded-lg border bg-surface p-1">
			<MenuGroup title="File">
				<Button variant="ghost" className="w-full justify-start" size="sm">New</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Open</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Save</Button>
			</MenuGroup>
			<MenuGroup title="Edit">
				<Button variant="ghost" className="w-full justify-start" size="sm">Undo</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Redo</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Cut</Button>
			</MenuGroup>
		</div>
	);
}

export function MenuGroupDemoNoTitle() {
	return (
		<div className="w-56 rounded-lg border bg-surface p-1">
			<MenuGroup>
				<Button variant="ghost" className="w-full justify-start" size="sm">Profile</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Account</Button>
				<Button variant="ghost" className="w-full justify-start" size="sm">Log out</Button>
			</MenuGroup>
		</div>
	);
}
