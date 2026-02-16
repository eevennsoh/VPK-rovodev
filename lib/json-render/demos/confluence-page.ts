import type { Spec } from "@json-render/react";

export const confluencePageSpec: Spec = {
	root: "root",
	elements: {
		root: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["breadcrumb", "header", "content"],
		},
		breadcrumb: {
			type: "Breadcrumb",
			props: {
				items: [
					{ label: "Engineering", href: "/" },
					{ label: "Architecture", href: "/" },
					{ label: "API Design Guidelines" },
				],
			},
		},
		header: {
			type: "PageHeader",
			props: {
				title: "API Design Guidelines",
				description: "Standards and best practices for RESTful API design at Acme Corp",
			},
		},
		content: {
			type: "Stack",
			props: { direction: "vertical", gap: "lg" },
			children: ["alert", "overviewSection", "sep1", "codeSection", "sep2", "endpointTable", "sep3", "commentsSection"],
		},
		alert: {
			type: "Alert",
			props: {
				title: "Recently updated",
				description: "This page was last updated on March 10, 2025 by Jordan Davis.",
				variant: "info",
			},
		},

		// Overview section
		overviewSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["overviewHeading", "overviewText", "principles"],
		},
		overviewHeading: {
			type: "Heading",
			props: { level: "h3", text: "Overview" },
		},
		overviewText: {
			type: "Text",
			props: {
				content: "This document establishes the conventions for designing RESTful APIs across all services. Follow these guidelines to ensure consistency, discoverability, and backward compatibility.",
			},
		},
		principles: {
			type: "Accordion",
			props: {
				items: [
					{ title: "Resource Naming", content: "Use plural nouns for collections (e.g. /users, /projects). Use kebab-case for multi-word resources (e.g. /pull-requests). Nest resources to show relationships (e.g. /projects/{id}/issues)." },
					{ title: "Versioning", content: "Use URL path versioning (e.g. /v1/users). Major versions indicate breaking changes. Minor versions are backward compatible and use query parameters." },
					{ title: "Error Handling", content: "Return standard HTTP status codes. Include a JSON error body with code, message, and details fields. Use 4xx for client errors and 5xx for server errors." },
				],
			},
		},
		sep1: {
			type: "Separator",
			props: {},
		},

		// Code example section
		codeSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["codeHeading", "codeDescription", "codeBlock", "codeCallout"],
		},
		codeHeading: {
			type: "Heading",
			props: { level: "h3", text: "Example Request" },
		},
		codeDescription: {
			type: "Text",
			props: { content: "A standard paginated list endpoint with filtering:" },
		},
		codeBlock: {
			type: "CodeBlock",
			props: {
				language: "bash",
				code: `GET /v1/projects/acme-cloud/issues?status=open&priority=high&page=1&limit=25

Authorization: Bearer <token>
Accept: application/json

Response 200:
{
  "data": [
    {
      "id": "ISS-1234",
      "title": "Fix authentication timeout",
      "status": "open",
      "priority": "high",
      "assignee": { "id": "usr-42", "name": "Jordan Davis" }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142
  }
}`,
			},
		},
		codeCallout: {
			type: "Callout",
			props: {
				title: "Note",
				content: "Always include pagination metadata in list responses. Default to page=1 and limit=25 when not specified.",
				type: "info",
			},
		},
		sep2: {
			type: "Separator",
			props: {},
		},

		// Endpoint reference table
		endpointTable: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["tableHeading", "table"],
		},
		tableHeading: {
			type: "Heading",
			props: { level: "h3", text: "Standard Endpoints" },
		},
		table: {
			type: "Table",
			props: {
				data: [
					{ method: "GET", path: "/v1/{resource}", description: "List with pagination & filtering", auth: "Required" },
					{ method: "GET", path: "/v1/{resource}/{id}", description: "Get single resource", auth: "Required" },
					{ method: "POST", path: "/v1/{resource}", description: "Create new resource", auth: "Required" },
					{ method: "PUT", path: "/v1/{resource}/{id}", description: "Full update", auth: "Required" },
					{ method: "PATCH", path: "/v1/{resource}/{id}", description: "Partial update", auth: "Required" },
					{ method: "DELETE", path: "/v1/{resource}/{id}", description: "Delete resource", auth: "Required" },
				],
				columns: [
					{ key: "method", label: "Method" },
					{ key: "path", label: "Path" },
					{ key: "description", label: "Description" },
					{ key: "auth", label: "Auth" },
				],
			},
		},
		sep3: {
			type: "Separator",
			props: {},
		},

		// Comments section
		commentsSection: {
			type: "Stack",
			props: { direction: "vertical", gap: "sm" },
			children: ["commentsHeading", "comment1", "comment2"],
		},
		commentsHeading: {
			type: "Heading",
			props: { level: "h3", text: "Comments" },
		},
		comment1: {
			type: "Comment",
			props: {
				author: "Aisha Singh",
				time: "2 days ago",
				content: "Should we add a section about rate limiting headers? We've been inconsistent across services.",
			},
		},
		comment2: {
			type: "Comment",
			props: {
				author: "Marcus Kim",
				time: "1 day ago",
				content: "Good point. I'll draft the rate limiting section based on our gateway config. We should standardize on X-RateLimit-Limit, X-RateLimit-Remaining, and X-RateLimit-Reset headers.",
			},
		},
	},
};
