"use client";

interface WorkItemDescriptionProps {
	description: string;
}

export function WorkItemDescription({ description }: Readonly<WorkItemDescriptionProps>) {
	const paragraphs = description.split("\n\n");

	return (
		<div className="space-y-4">
			{paragraphs.map((paragraph, index) => (
				<div key={index}>
					{paragraph.includes("-") && paragraph.includes("Criteria") ? (
						<div>
							<p className="font-semibold text-text mb-2">{paragraph.split("\n")[0]}</p>
							<ul className="space-y-1 ml-4">
								{paragraph
									.split("\n")
									.slice(1)
									.map((item, i) => (
										<li key={i} className="text-sm text-text-subtle flex items-start gap-2">
											<span className="text-text-subtle">•</span>
											<span>{item.replace(/^-\s*/, "")}</span>
										</li>
									))}
							</ul>
						</div>
					) : (
						<p className="text-sm text-text-subtle leading-relaxed">{paragraph}</p>
					)}
				</div>
			))}
		</div>
	);
}
