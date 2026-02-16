"use client"

import { Comment, CommentAction } from "@/components/ui/comment"

export default function CommentDemo() {
	return (
		<Comment
			author="Jane Smith"
			avatarSrc="/avatar-human/mia-mcdougall.png"
			time="2 hours ago"
			actions={
				<>
					<CommentAction>Reply</CommentAction>
					<span aria-hidden>·</span>
					<CommentAction>Like</CommentAction>
				</>
			}
		>
			This looks great! I think we should also consider adding unit tests for
			the new component.
		</Comment>
	)
}

export function CommentDemoDefault() {
	return (
		<Comment author="Alex Johnson">
			This is a simple comment with just an author name and content.
		</Comment>
	)
}

export function CommentDemoWithTime() {
	return (
		<Comment author="Alex Johnson" time="5 minutes ago">
			This comment includes a timestamp in the header.
		</Comment>
	)
}

export function CommentDemoWithAvatar() {
	return (
		<Comment
			author="Jane Smith"
			avatarSrc="/avatar-human/mia-mcdougall.png"
			time="1 hour ago"
		>
			This comment has an avatar image loaded from a URL.
		</Comment>
	)
}

export function CommentDemoWithActions() {
	return (
		<Comment
			author="Bob Williams"
			avatarSrc="/avatar-human/thomas-beckerie.png"
			time="3 hours ago"
			actions={
				<>
					<CommentAction>Reply</CommentAction>
					<span aria-hidden>·</span>
					<CommentAction>Edit</CommentAction>
					<span aria-hidden>·</span>
					<CommentAction>Like</CommentAction>
				</>
			}
		>
			This comment has action buttons with dot separators.
		</Comment>
	)
}

export function CommentDemoFull() {
	return (
		<Comment
			author="Scott Farquhar"
			avatarSrc="/avatar-human/anthony-chen.png"
			type="author"
			time="Mar 14, 2024"
			edited
			actions={
				<>
					<CommentAction>Reply</CommentAction>
					<span aria-hidden>·</span>
					<CommentAction>Edit</CommentAction>
					<span aria-hidden>·</span>
					<CommentAction>Like</CommentAction>
				</>
			}
		>
			During COVID we took a big bet on remote work. It made sense, as we
			already had employees in 10+ countries. Today, the majority of hires
			live over 2hrs from an office and these amazing, talented people
			couldn&apos;t work for us otherwise.
		</Comment>
	)
}

export function CommentDemoEdited() {
	return (
		<Comment
			author="Scott Farquhar"
			avatarSrc="/avatar-human/anthony-chen.png"
			time="Jul 3, 2020"
			edited
		>
			I&apos;m super proud that 69% of our almost 5,000 Atlassian employees
			donated their time for volunteering in the last year. Thanks team!
		</Comment>
	)
}

export function CommentDemoHighlighted() {
	return (
		<Comment
			author="Scott Farquhar"
			avatarSrc="/avatar-human/anthony-chen.png"
			time="Mar 14, 2024"
			highlighted
		>
			Atlassian employees choose everyday where and how they want to work
			&mdash; we call it Team Anywhere. This has been key for our continued
			growth.
		</Comment>
	)
}

export function CommentDemoSaving() {
	return (
		<Comment
			author="Scott Farquhar"
			avatarSrc="/avatar-human/anthony-chen.png"
			isSaving
		>
			Building &ldquo;soft skills,&rdquo; like effective communication and
			collaboration, are vital to a team&apos;s success.
		</Comment>
	)
}

export function CommentDemoThread() {
	return (
		<div className="flex flex-col gap-3">
			<Comment
				author="Alice Chen"
				avatarSrc="/avatar-human/olivia-yang.png"
				time="Yesterday"
				type="author"
				actions={
					<>
						<CommentAction>Reply</CommentAction>
						<span aria-hidden>·</span>
						<CommentAction>Like</CommentAction>
					</>
				}
			>
				Has anyone looked into the performance issue on the dashboard?
			</Comment>
			<div className="ml-10">
				<Comment
					author="Bob Williams"
					avatarSrc="/avatar-human/thomas-beckerie.png"
					time="10 hours ago"
					actions={
						<>
							<CommentAction>Reply</CommentAction>
							<span aria-hidden>·</span>
							<CommentAction>Like</CommentAction>
						</>
					}
				>
					Yes, I traced it to the chart rendering. Working on a fix now.
				</Comment>
			</div>
			<div className="ml-10">
				<Comment
					author="Carol Davis"
					avatarSrc="/avatar-human/priya-hansra.png"
					time="8 hours ago"
					actions={
						<>
							<CommentAction>Reply</CommentAction>
							<span aria-hidden>·</span>
							<CommentAction>Like</CommentAction>
						</>
					}
				>
					I can help with testing once the fix is ready.
				</Comment>
			</div>
		</div>
	)
}
