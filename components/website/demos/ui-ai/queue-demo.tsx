import {
	Queue,
	QueueList,
	QueueItem,
	QueueItemContent,
	QueueItemDescription,
	QueueItemIndicator,
	QueueItemActions,
	QueueItemAction,
	QueueItemAttachment,
	QueueItemFile,
	QueueSection,
	QueueSectionTrigger,
	QueueSectionLabel,
	QueueSectionContent,
} from "@/components/ui-ai/queue";
import { CheckIcon, CircleIcon, CopyIcon, PencilIcon, TrashIcon } from "lucide-react";

// — Default: todo list with collapsible sections —

export default function QueueDemo() {
	return (
		<Queue className="w-full max-w-sm">
			<QueueSection>
				<QueueSectionTrigger>
					<QueueSectionLabel label="Completed" count={3} icon={<CheckIcon className="size-3.5 text-muted-foreground" />} />
				</QueueSectionTrigger>
				<QueueSectionContent>
					<QueueList>
						<QueueItem>
							<div className="flex items-center gap-2">
								<QueueItemIndicator completed />
								<QueueItemContent completed>Install dependencies</QueueItemContent>
							</div>
						</QueueItem>
						<QueueItem>
							<div className="flex items-center gap-2">
								<QueueItemIndicator completed />
								<QueueItemContent completed>Set up database schema</QueueItemContent>
							</div>
						</QueueItem>
						<QueueItem>
							<div className="flex items-center gap-2">
								<QueueItemIndicator completed />
								<QueueItemContent completed>Configure authentication</QueueItemContent>
							</div>
						</QueueItem>
					</QueueList>
				</QueueSectionContent>
			</QueueSection>
			<QueueSection>
				<QueueSectionTrigger>
					<QueueSectionLabel label="Pending" count={2} icon={<CircleIcon className="size-3.5 text-muted-foreground" />} />
				</QueueSectionTrigger>
				<QueueSectionContent>
					<QueueList>
						<QueueItem>
							<div className="flex items-center gap-2">
								<QueueItemIndicator />
								<QueueItemContent>Write API endpoints</QueueItemContent>
							</div>
							<QueueItemDescription>Create REST endpoints for user CRUD operations</QueueItemDescription>
						</QueueItem>
						<QueueItem>
							<div className="flex items-center gap-2">
								<QueueItemIndicator />
								<QueueItemContent>Add unit tests</QueueItemContent>
							</div>
						</QueueItem>
					</QueueList>
				</QueueSectionContent>
			</QueueSection>
		</Queue>
	);
}

// — With actions: hover-revealed action buttons on items —

export function QueueDemoWithActions() {
	return (
		<Queue className="w-full max-w-sm">
			<QueueList>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent>Review pull request #42</QueueItemContent>
						<QueueItemActions>
							<QueueItemAction aria-label="Edit">
								<PencilIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Copy">
								<CopyIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Delete">
								<TrashIcon className="size-3.5" />
							</QueueItemAction>
						</QueueItemActions>
					</div>
				</QueueItem>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent>Update documentation</QueueItemContent>
						<QueueItemActions>
							<QueueItemAction aria-label="Edit">
								<PencilIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Copy">
								<CopyIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Delete">
								<TrashIcon className="size-3.5" />
							</QueueItemAction>
						</QueueItemActions>
					</div>
				</QueueItem>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator completed />
						<QueueItemContent completed>Fix CI pipeline</QueueItemContent>
						<QueueItemActions>
							<QueueItemAction aria-label="Edit">
								<PencilIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Copy">
								<CopyIcon className="size-3.5" />
							</QueueItemAction>
							<QueueItemAction aria-label="Delete">
								<TrashIcon className="size-3.5" />
							</QueueItemAction>
						</QueueItemActions>
					</div>
				</QueueItem>
			</QueueList>
		</Queue>
	);
}

// — With attachments: items with file badges —

export function QueueDemoWithAttachments() {
	return (
		<Queue className="w-full max-w-sm">
			<QueueList>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent>Process uploaded documents</QueueItemContent>
					</div>
					<QueueItemAttachment>
						<QueueItemFile>report-q4.pdf</QueueItemFile>
						<QueueItemFile>summary.docx</QueueItemFile>
					</QueueItemAttachment>
				</QueueItem>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator completed />
						<QueueItemContent completed>Analyze dataset</QueueItemContent>
					</div>
					<QueueItemAttachment>
						<QueueItemFile>data.csv</QueueItemFile>
					</QueueItemAttachment>
				</QueueItem>
			</QueueList>
		</Queue>
	);
}

// — Minimal: simple flat list without sections —

export function QueueDemoMinimal() {
	return (
		<Queue className="w-full max-w-sm">
			<QueueList>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator completed />
						<QueueItemContent completed>Install deps</QueueItemContent>
					</div>
				</QueueItem>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent>Run tests</QueueItemContent>
					</div>
				</QueueItem>
				<QueueItem>
					<div className="flex items-center gap-2">
						<QueueItemIndicator />
						<QueueItemContent>Deploy to staging</QueueItemContent>
					</div>
				</QueueItem>
			</QueueList>
		</Queue>
	);
}
