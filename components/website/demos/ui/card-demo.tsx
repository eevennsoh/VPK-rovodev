import { CaptionsIcon, PlusIcon } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import ChevronDownIcon from "@atlaskit/icon/core/chevron-down";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function CardDemo() {
	return (
		<Card size="sm" className="w-56">
			<CardHeader>
				<CardTitle>Project alpha</CardTitle>
				<CardDescription>A demo card component</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-xs text-muted-foreground">Card content goes here.</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoDefaultSize() {
	return (
		<Card size="default" className="mx-auto w-full max-w-sm">
			<CardHeader>
				<CardTitle>Default Card</CardTitle>
				<CardDescription>
					This card uses the default size variant.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					The card component supports a size prop that defaults to
					&quot;default&quot; for standard spacing and sizing.
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="outline" className="w-full">
					Action
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoDefault() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card description</CardDescription>
			</CardHeader>
			<CardContent>
				<p>This is the main content area of the card. You can place any content here.</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoFooterWithBorderSmall() {
	return (
		<Card size="sm" className="mx-auto w-full max-w-sm">
			<CardContent>
				<p>
					The footer has a border-t class applied, creating a visual
					separation between the content and footer sections.
				</p>
			</CardContent>
			<CardFooter className="border-t">
				<Button variant="outline" size="sm" className="w-full">
					Footer with Border
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoFooterWithBorder() {
	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardContent>
				<p>
					The footer has a border-t class applied, creating a visual
					separation between the content and footer sections.
				</p>
			</CardContent>
			<CardFooter className="border-t">
				<Button variant="outline" className="w-full">
					Footer with Border
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoHeaderWithBorderSmall() {
	return (
		<Card size="sm" className="mx-auto w-full max-w-sm">
			<CardHeader className="border-b">
				<CardTitle>Header with Border</CardTitle>
				<CardDescription>
					This is a small card with a header that has a bottom border.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					The header has a border-b class applied, creating a visual
					separation between the header and content sections.
				</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoHeaderWithBorder() {
	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardHeader className="border-b">
				<CardTitle>Header with Border</CardTitle>
				<CardDescription>
					This is a card with a header that has a bottom border.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					The header has a border-b class applied, creating a visual
					separation between the header and content sections.
				</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoLogin() {
	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardHeader>
				<CardTitle>Login to your account</CardTitle>
				<CardDescription>
					Enter your email below to login to your account
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								id="email"
								type="email"
								placeholder="m@example.com"
								required
							/>
						</Field>
						<Field>
							<div className="flex items-center">
								<FieldLabel htmlFor="password">Password</FieldLabel>
								<a
									href="#"
									className="ml-auto inline-block underline-offset-4 hover:underline"
								>
									Forgot your password?
								</a>
							</div>
							<Input id="password" type="password" required />
						</Field>
					</FieldGroup>
				</form>
			</CardContent>
			<CardFooter className="flex-col gap-2">
				<Button type="submit" className="w-full">
					Login
				</Button>
				<Button variant="outline" className="w-full">
					Login with Google
				</Button>
				<div className="mt-4 text-center">
					Don&apos;t have an account?{" "}
					<a href="#" className="underline underline-offset-4">
						Sign up
					</a>
				</div>
			</CardFooter>
		</Card>
	);
}

export function CardDemoMeetingNotes() {
	return (
		<Card className="mx-auto w-full max-w-sm">
			<CardHeader>
				<CardTitle>Meeting Notes</CardTitle>
				<CardDescription>
					Transcript from the meeting with the client.
				</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">
						<CaptionsIcon data-icon="inline-start" />
						Transcribe
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>
					Client requested dashboard redesign with focus on mobile
					responsiveness.
				</p>
				<ol className="mt-4 flex list-decimal flex-col gap-2 pl-6">
					<li>New analytics widgets for daily/weekly metrics</li>
					<li>Simplified navigation menu</li>
					<li>Dark mode support</li>
					<li>Timeline: 6 weeks</li>
					<li>Follow-up meeting scheduled for next Tuesday</li>
				</ol>
			</CardContent>
			<CardFooter>
				<AvatarGroup>
					<Avatar>
						<AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
					<Avatar>
						<AvatarImage
							src="https://github.com/maxleiter.png"
							alt="@maxleiter"
						/>
						<AvatarFallback>LR</AvatarFallback>
					</Avatar>
					<Avatar>
						<AvatarImage
							src="https://github.com/evilrabbit.png"
							alt="@evilrabbit"
						/>
						<AvatarFallback>ER</AvatarFallback>
					</Avatar>
					<AvatarGroupCount>+8</AvatarGroupCount>
				</AvatarGroup>
			</CardFooter>
		</Card>
	);
}

export function CardDemoSimple() {
	return (
		<Card>
			<CardContent>
				<p>A minimal card with just content and no header or footer.</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoSmallSize() {
	return (
		<Card size="sm" className="mx-auto w-full max-w-sm">
			<CardHeader>
				<CardTitle>Small Card</CardTitle>
				<CardDescription>
					This card uses the small size variant.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<p>
					The card component supports a size prop that can be set to
					&quot;sm&quot; for a more compact appearance.
				</p>
			</CardContent>
			<CardFooter>
				<Button variant="outline" size="sm" className="w-full">
					Action
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoSmall() {
	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle>Small Card</CardTitle>
				<CardDescription>A compact card variant</CardDescription>
			</CardHeader>
			<CardContent>
				<p>This card uses the small size variant with reduced padding and spacing.</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoWithAction() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Card with Action</CardTitle>
				<CardDescription>This card has an action button in the header</CardDescription>
				<CardAction>
					<Button variant="outline" size="sm">
						Edit
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent>
				<p>The action button is positioned in the top-right corner of the header.</p>
			</CardContent>
		</Card>
	);
}

export function CardDemoWithImageSmall() {
	return (
		<Card size="sm" className="relative mx-auto w-full max-w-sm pt-0">
			<div className="bg-primary absolute inset-0 z-30 aspect-video opacity-50 mix-blend-color" />
			<img
				src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
				alt="Photo by mymind on Unsplash"
				title="Photo by mymind on Unsplash"
				className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
			/>
			<CardHeader>
				<CardTitle>Beautiful Landscape</CardTitle>
				<CardDescription>
					A stunning view that captures the essence of natural beauty.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button size="sm" className="w-full">
					<PlusIcon data-icon="inline-start" />
					Button
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoWithImage() {
	return (
		<Card size="default" className="relative mx-auto w-full max-w-sm pt-0">
			<div className="bg-primary absolute inset-0 z-30 aspect-video opacity-50 mix-blend-color" />
			<img
				src="https://images.unsplash.com/photo-1604076850742-4c7221f3101b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
				alt="Photo by mymind on Unsplash"
				title="Photo by mymind on Unsplash"
				className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale"
			/>
			<CardHeader>
				<CardTitle>Beautiful Landscape</CardTitle>
				<CardDescription>
					A stunning view that captures the essence of natural beauty.
				</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button className="w-full">
					<PlusIcon data-icon="inline-start" />
					Button
				</Button>
			</CardFooter>
		</Card>
	);
}

export function CardDemoAppPreview() {
	const [isExpanded, setIsExpanded] = useState(true);
	const detailsId = useId();

	return (
			<Card className={`mx-auto w-full max-w-[380px] gap-0 p-0 transition-[height] duration-200 ${isExpanded ? "h-[458px]" : "h-16"}`}>
				<CardHeader className={`h-16 ${isExpanded ? "border-b" : ""} px-4 py-3`}>
				<div className="flex items-center gap-3">
					<Image
						src="/3p/google-calendar/32.svg"
						alt="Google Calendar logo"
						width={32}
						height={32}
					/>
					<div className="flex flex-col">
						<CardTitle className="text-sm leading-5 font-bold">
							Schedule meeting
						</CardTitle>
						<CardDescription className="text-xs leading-4">
							Extra description
						</CardDescription>
					</div>
				</div>
				<CardAction className="self-center">
					<Button
						variant="ghost"
						size="icon"
						className="text-text-subtle aria-expanded:border-transparent aria-expanded:bg-transparent aria-expanded:text-text-subtle"
						aria-controls={detailsId}
						aria-expanded={isExpanded}
						aria-label={isExpanded ? "Collapse card details" : "Expand card details"}
						onClick={() => setIsExpanded((previous) => !previous)}
					>
						<span className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : "rotate-0"}`}>
							<ChevronDownIcon label="" size="small" />
						</span>
					</Button>
				</CardAction>
			</CardHeader>
			{isExpanded ? (
				<>
					<CardContent id={detailsId} className="px-4 py-4">
						<div className="h-[298px] w-full bg-neutral-300" />
					</CardContent>
						<CardFooter className="h-16 justify-end !bg-card px-4 py-4">
							<Button variant="outline" className="h-8 min-w-[117px]">
								Open preview
							</Button>
						</CardFooter>
				</>
			) : null}
		</Card>
	);
}
