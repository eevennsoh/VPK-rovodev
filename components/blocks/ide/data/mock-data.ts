export const MOCK_FILE_TREE = [
	{
		type: "folder",
		name: "src",
		path: "src",
		children: [
			{
				type: "folder",
				name: "components",
				path: "src/components",
				children: [
					{ type: "file", name: "button.tsx", path: "src/components/button.tsx" },
					{ type: "file", name: "card.tsx", path: "src/components/card.tsx" },
					{ type: "file", name: "dialog.tsx", path: "src/components/dialog.tsx" },
				],
			},
			{
				type: "folder",
				name: "lib",
				path: "src/lib",
				children: [
					{ type: "file", name: "utils.ts", path: "src/lib/utils.ts" },
					{ type: "file", name: "api.ts", path: "src/lib/api.ts" },
				],
			},
			{ type: "file", name: "app.tsx", path: "src/app.tsx" },
			{ type: "file", name: "index.ts", path: "src/index.ts" },
		],
	},
	{ type: "file", name: "package.json", path: "package.json" },
	{ type: "file", name: "tsconfig.json", path: "tsconfig.json" },
];

export const MOCK_CODE_FILES: Record<string, { language: string; code: string }> = {
	"src/components/button.tsx": {
		language: "tsx",
		code: `import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}`,
	},
	"src/lib/utils.ts": {
		language: "typescript",
		code: `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(date);
}`,
	},
};

export const MOCK_TERMINAL_OUTPUT = `\x1b[32m$\x1b[0m npx tsc --noEmit
\x1b[32m$\x1b[0m eslint src/ --ext .ts,.tsx
\x1b[33mwarning\x1b[0m  Unexpected any type  @typescript-eslint/no-explicit-any
  \x1b[2msrc/lib/api.ts:12:18\x1b[0m

\x1b[32m\u2713\x1b[0m 1 warning, 0 errors
\x1b[32m$\x1b[0m vitest run
 \x1b[32m\u2713\x1b[0m src/components/button.test.tsx (3 tests) 12ms
 \x1b[32m\u2713\x1b[0m src/lib/utils.test.ts (2 tests) 4ms

 Test Files  2 passed (2)
      Tests  5 passed (5)
   Duration  1.24s`;

export const MOCK_CHAT_MESSAGES: {
	id: string;
	role: "user" | "assistant";
	content: string;
	toolCall?: {
		name: string;
		state: "output-available";
		input: Record<string, unknown>;
		output: Record<string, unknown>;
	};
}[] = [
	{
		id: "ide-1",
		role: "user",
		content: "Add a disabled state to the Button component",
	},
	{
		id: "ide-2",
		role: "assistant",
		content: "I'll add a disabled variant to the Button component with proper styling and accessibility.",
		toolCall: {
			name: "editFile",
			state: "output-available",
			input: { path: "src/components/button.tsx", operation: "add disabled styles" },
			output: { success: true, linesChanged: 4 },
		},
	},
];
