import { NextResponse } from "next/server";

interface JiraIssue {
	key: string;
	fields: {
		summary: string;
		status: { name: string };
		assignee: { displayName: string } | null;
		updated: string;
		created: string;
		priority: { name: string };
		issuetype: { name: string };
		project: { key: string; name: string };
	};
}

interface ConfluencePage {
	id: string;
	title: string;
	status: string;
	lastModified: string;
	createdDate: string;
	history: { createdBy: { displayName: string } };
	_links: { webui: string };
}

interface WorkItem {
	id: string;
	type: "jira" | "confluence";
	title: string;
	status: string;
	assignee?: string;
	updated: string;
	created: string;
	priority?: string;
	issueType?: string;
	project?: string;
	url?: string;
	source: string;
}

async function getJiraWorkItems(): Promise<WorkItem[]> {
	try {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const formattedDate = sevenDaysAgo.toISOString().split("T")[0];

		const response = await fetch(
			`https://product-fabric.atlassian.net/rest/api/3/search?jql=assignee=currentUser() AND updated>="${formattedDate}"&maxResults=50&fields=summary,status,assignee,updated,created,priority,issuetype,project`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.ATLASSIAN_API_TOKEN}`,
					Accept: "application/json",
				},
			}
		);

		if (!response.ok) {
			console.error("Jira API error:", response.status);
			return [];
		}

		const data = (await response.json()) as { issues: JiraIssue[] };
		return data.issues.map((issue) => ({
			id: issue.key,
			type: "jira" as const,
			title: issue.fields.summary,
			status: issue.fields.status.name,
			assignee: issue.fields.assignee?.displayName,
			updated: issue.fields.updated,
			created: issue.fields.created,
			priority: issue.fields.priority?.name,
			issueType: issue.fields.issuetype.name,
			project: issue.fields.project.name,
			url: `https://product-fabric.atlassian.net/browse/${issue.key}`,
			source: "Jira",
		}));
	} catch (error) {
		console.error("Error fetching Jira work items:", error);
		return [];
	}
}

async function getConfluenceWorkItems(): Promise<WorkItem[]> {
	try {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
		const formattedDate = sevenDaysAgo.toISOString().split("T")[0];

		const response = await fetch(
			`https://product-fabric.atlassian.net/wiki/api/v2/pages?created-after=${formattedDate}&limit=50`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${process.env.ATLASSIAN_API_TOKEN}`,
					Accept: "application/json",
				},
			}
		);

		if (!response.ok) {
			console.error("Confluence API error:", response.status);
			return [];
		}

		const data = (await response.json()) as { results: ConfluencePage[] };
		return data.results.map((page) => ({
			id: page.id,
			type: "confluence" as const,
			title: page.title,
			status: page.status || "published",
			assignee: page.history?.createdBy?.displayName,
			updated: page.lastModified,
			created: page.createdDate,
			url: `https://product-fabric.atlassian.net${page._links.webui}`,
			source: "Confluence",
		}));
	} catch (error) {
		console.error("Error fetching Confluence work items:", error);
		return [];
	}
}

export async function GET() {
	try {
		const [jiraItems, confluenceItems] = await Promise.all([
			getJiraWorkItems(),
			getConfluenceWorkItems(),
		]);

		const allItems = [...jiraItems, ...confluenceItems].sort(
			(a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()
		);

		return NextResponse.json({
			success: true,
			total: allItems.length,
			jiraCount: jiraItems.length,
			confluenceCount: confluenceItems.length,
			items: allItems,
		});
	} catch (error) {
		console.error("Error in work items API:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch work items",
			},
			{ status: 500 }
		);
	}
}
