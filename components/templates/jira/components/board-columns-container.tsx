"use client";

import { token } from "@/lib/tokens";
import BoardColumn from "./board-column";
import KanbanCard from "./kanban-card";
import { BOARD_COLUMNS } from "../data/board-data";

interface BoardColumnsContainerProps {
	onCardClick: (title: string, code: string) => void;
}

export default function BoardColumnsContainer({ onCardClick }: Readonly<BoardColumnsContainerProps>) {
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
				{BOARD_COLUMNS.map((column) => (
					<BoardColumn key={column.title} title={column.title} count={column.count}>
						{column.cards.map((card) => (
							<KanbanCard
								key={card.code}
								title={card.title}
								code={card.code}
								tags={card.tags.map((tag) => ({ text: tag.text, color: tag.color }))}
								priority={card.priority}
								avatarSrc={card.avatarSrc}
								onClick={() => onCardClick(card.title, card.code)}
							/>
						))}
					</BoardColumn>
				))}

				{/* Spacer for right padding */}
				<div style={{ minWidth: "24px", width: "24px", flexShrink: 0 }} />
			</div>
		</div>
	);
}
