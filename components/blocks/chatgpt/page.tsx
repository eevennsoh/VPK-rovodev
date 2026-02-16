"use client"

import {
	ExampleWrapper,
} from "@/components/example"
import { PromptForm } from "./components/prompt-form"
import { ModelSelector } from "./components/model-selector"
import { GroupChatDialog } from "./components/group-chat-dialog"
import { CreateProjectForm } from "./components/create-project-form"

export default function ChatGPTBlock() {
	return (
		<ExampleWrapper>
			<PromptForm />
			<ModelSelector />
			<GroupChatDialog />
			<CreateProjectForm />
		</ExampleWrapper>
	)
}
