"use client";

import {
	ModelSelector,
	ModelSelectorTrigger,
	ModelSelectorContent,
	ModelSelectorList,
	ModelSelectorGroup,
	ModelSelectorItem,
	ModelSelectorName,
} from "@/components/ui-ai/model-selector";
import { Button } from "@/components/ui/button";

export default function ModelSelectorDemo() {
	return (
		<ModelSelector>
			<ModelSelectorTrigger render={<Button variant="outline" size="sm" />}>
				Select model
			</ModelSelectorTrigger>
			<ModelSelectorContent>
				<ModelSelectorList>
					<ModelSelectorGroup heading="Models">
						<ModelSelectorItem value="gpt-4o">
							<ModelSelectorName>GPT-4o</ModelSelectorName>
						</ModelSelectorItem>
						<ModelSelectorItem value="claude-3">
							<ModelSelectorName>Claude 3</ModelSelectorName>
						</ModelSelectorItem>
					</ModelSelectorGroup>
				</ModelSelectorList>
			</ModelSelectorContent>
		</ModelSelector>
	);
}
