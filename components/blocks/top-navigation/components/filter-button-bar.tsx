"use client";

import { Button } from "@/components/ui/button";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import CustomizeIcon from "@atlaskit/icon/core/customize";
import FolderClosedIcon from "@atlaskit/icon/core/folder-closed";
import PersonIcon from "@atlaskit/icon/core/person";

export default function FilterButtonBar(): React.ReactElement {
	return (
		<div
			style={{
				padding: "0 8px 12px",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				gap: "100px",
			}}
		>
			{/* Left group */}
			<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
				<Button className="gap-2" variant="secondary">
					<FolderClosedIcon label="" size="small" />
					<span>Space</span>
					<ChevronDownIcon label="" size="small" />
				</Button>
				<Button className="gap-2" variant="secondary">
					<PersonIcon label="" size="small" />
					<span>Contributor</span>
					<ChevronDownIcon label="" size="small" />
				</Button>
				<Button aria-label="Customize filters" size="icon" variant="ghost">
					<CustomizeIcon label="" />
				</Button>
			</div>

			{/* Right group */}
			<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
				<Button className="gap-2" variant="secondary">
					<img src="/3p/google-drive/20.svg" alt="" aria-hidden="true" style={{ width: "20px", height: "20px" }} />
					<span>Google Drive</span>
				</Button>
				<Button className="gap-2" variant="secondary">
					<img src="/3p/slack/20.svg" alt="" aria-hidden="true" style={{ width: "20px", height: "20px" }} />
					<span>Slack</span>
				</Button>
				<Button variant="secondary">+47</Button>
			</div>
		</div>
	);
}
