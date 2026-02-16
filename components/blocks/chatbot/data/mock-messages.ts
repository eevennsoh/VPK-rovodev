export const MOCK_MESSAGES: {
	id: string;
	role: "user" | "assistant";
	content: string;
	reasoning?: string;
}[] = [
	{
		id: "1",
		role: "user",
		content: "What are React Server Components and how do they differ from Client Components?",
	},
	{
		id: "2",
		role: "assistant",
		reasoning:
			"The user is asking about RSC vs Client Components. I should cover the key differences: rendering location, bundle impact, data fetching patterns, and when to use each.",
		content:
			"React Server Components (RSC) are a new paradigm in React that allows components to render on the server. Here are the key differences:\n\n**Server Components:**\n- Render on the server only, never shipped to the client bundle\n- Can directly access databases, file systems, and server-side APIs\n- Cannot use hooks like `useState` or `useEffect`\n- Cannot use browser APIs or event handlers\n\n**Client Components:**\n- Render on both server (SSR) and client (hydration)\n- Support interactivity via hooks and event handlers\n- Are marked with the `\"use client\"` directive\n- Increase the JavaScript bundle size\n\nThe general rule is: **use Server Components by default**, and only opt into Client Components when you need interactivity, browser APIs, or React hooks.",
	},
	{
		id: "3",
		role: "user",
		content: "Can you show me an example of when I'd use each?",
	},
	{
		id: "4",
		role: "assistant",
		content:
			"Here are practical examples:\n\n**Server Component** (default in Next.js App Router):\n```tsx\n// app/users/page.tsx — no \"use client\" needed\nasync function UsersPage() {\n  const users = await db.query('SELECT * FROM users');\n  return (\n    <ul>\n      {users.map(user => (\n        <li key={user.id}>{user.name}</li>\n      ))}\n    </ul>\n  );\n}\n```\n\n**Client Component** (needs interactivity):\n```tsx\n\"use client\";\nimport { useState } from \"react\";\n\nfunction Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(c => c + 1)}>\n      Count: {count}\n    </button>\n  );\n}\n```\n\nA common pattern is to keep the page as a Server Component and extract only the interactive parts into Client Components.",
	},
];

export const MOCK_SUGGESTIONS = [
	"How do I pass data between Server and Client Components?",
	"What are the performance benefits of RSC?",
	"Can I use third-party libraries in Server Components?",
	"Show me a data fetching pattern with RSC",
];
