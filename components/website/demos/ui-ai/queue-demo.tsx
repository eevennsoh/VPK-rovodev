import {
	Queue,
	QueueList,
	QueueItem,
	QueueItemContent,
	QueueItemDescription,
	QueueItemIndicator,
} from "@/components/ui-ai/queue";

export default function QueueDemo() {
	return (
		<Queue className="w-full">
			<QueueList>
				<QueueItem>
					<QueueItemIndicator completed />
					<QueueItemContent>
						<QueueItemDescription>Install deps</QueueItemDescription>
					</QueueItemContent>
				</QueueItem>
				<QueueItem>
					<QueueItemIndicator />
					<QueueItemContent>
						<QueueItemDescription>Run tests</QueueItemDescription>
					</QueueItemContent>
				</QueueItem>
			</QueueList>
		</Queue>
	);
}
