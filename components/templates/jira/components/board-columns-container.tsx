"use client";

import { token } from "@/lib/tokens";
import BoardColumn from "./board-column";
import KanbanCard from "./kanban-card";
import { type BoardColumnData, type KanbanCardData } from "../data/board-data";

interface BoardColumnsContainerProps {
	boardColumns: BoardColumnData[];
	draggedCardCode: string | null;
	onCardClick: (title: string, code: string) => void;
	onCardDragStart: (card: KanbanCardData, sourceColumnTitle: string) => void;
	onCardDrop: (targetColumnTitle: string) => void;
	onCardDragEnd: () => void;
}

export default function BoardColumnsContainer({
	boardColumns,
	draggedCardCode,
	onCardClick,
	onCardDragStart,
	onCardDrop,
	onCardDragEnd,
}: Readonly<BoardColumnsContainerProps>) {
	const handleColumnDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.currentTarget.classList.add("ring-2", "ring-offset-2", "ring-border-bold");
	};

	const handleColumnDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
		event.currentTarget.classList.remove("ring-2", "ring-offset-2", "ring-border-bold");
	};

	const handleColumnDrop = (event: React.DragEvent<HTMLDivElement>, targetColumnTitle: string) => {
		event.preventDefault();
		event.currentTarget.classList.remove("ring-2", "ring-offset-2", "ring-border-bold");
		onCardDrop(targetColumnTitle);
	};

	return (
		<div
			style={{
				flex: 1,
				paddingBlock: token("space.200"),
				paddingInline: token("space.300"),
				overflowX: "auto",
				overflowY: "hidden",
				minHeight: 0,
			}}
		>
			<div className="flex items-stretch gap-3">
				{boardColumns.map((column) => (
					<div
						key={column.title}
						onDragOver={handleColumnDragOver}
						onDragLeave={handleColumnDragLeave}
						onDrop={(event) => handleColumnDrop(event, column.title)}
						style={{ borderRadius: token("radius.large") }}
					>
						<BoardColumn title={column.title} count={column.count}>
							{column.cards.map((card) => (
								<KanbanCard
									key={card.code}
									title={card.title}
									code={card.code}
									tags={card.tags.map((tag) => ({ text: tag.text, color: tag.color }))}
									priority={card.priority}
									avatarSrc={card.avatarSrc}
									isDragging={draggedCardCode === card.code}
									onClick={() => onCardClick(card.title, card.code)}
									onDragStart={() => onCardDragStart(card, column.title)}
									onDragEnd={onCardDragEnd}
								/>
							))}
						</BoardColumn>
					</div>
				))}

				{/* Spacer for right padding */}
				<div style={{ minWidth: "24px", width: "24px", flexShrink: 0 }} />
			</div>
		</div>
	);
}
