export type Category = "all" | "apps" | "agents" | "automation" | "skills";

export interface GalleryItem {
	id: string;
	title: string;
	type: Category;
	prompt: string;
	color: string;
	ascii: string;
	description: string;
	metadata: {
		label: string;
		value: string | string[];
	}[];
	flexGrow?: boolean;
}

// ---------------------------------------------------------------------------
// Apps ASCII art
// ---------------------------------------------------------------------------

const SPRINT_BOARD_ASCII = `  +--[ Sprint 24 ]----------------+
  |                                |
  | TO DO    IN PROG     DONE     |
  | +------+ +------+  +------+  |
  | | AUTH  | | API  |  | DOCS |  |
  | | ~~ 5p | | ~~ 3p|  | ~~ 2p|  |
  | +------+ +------+  +------+  |
  | +------+ +------+  +------+  |
  | | TESTS| | UI   |  | CI/CD|  |
  | | ~~ 3p | | ~~ 8p|  | ~~ 1p|  |
  | +------+ +------+  +------+  |
  |                                |
  |  Velocity: 24 pts   75% done  |
  +--------------------------------+`;

const TIME_TRACKER_ASCII = `    +--------------------------+
    |  [>]  02:34:18           |
    |       ~~~~~~~~~~~~       |
    |  Task: API Integration   |
    |  Project: Atlas          |
    +--------------------------+
    |  Today          6h 12m   |
    |  ~~~~~~~~~~~  ========   |
    |  This week    28h 45m    |
    |  ~~~~~~~~~~~  ========   |
    |  Billable       82%      |
    |  ~~~~~~~~~~~  =======    |
    +--------------------------+`;

const FORM_BUILDER_ASCII = `  +--[ Intake Form ]-------------+
  |                               |
  |  Name     [_______________]   |
  |  Email    [_______________]   |
  |  Team     [  Select...   v]   |
  |                               |
  |  Priority                     |
  |  ( ) Critical  ( ) High      |
  |  (*) Medium    ( ) Low       |
  |                               |
  |  [x] Notify manager          |
  |  [ ] Attach files             |
  |                               |
  |  [ Cancel ]   [ Submit >>> ]  |
  +-------------------------------+`;

const METRICS_DASHBOARD_ASCII = `  +--[ Q1 Metrics ]-------------+
  |                              |
  |  Issues    Velocity    SLA   |
  |   342       24 pts    98.2%  |
  |   +12%      ~~~~~     ~~~~~  |
  |                              |
  |   Jan ████████░░  82%       |
  |   Feb ██████████  96%       |
  |   Mar ████████░░  88%       |
  |                              |
  |        .__                   |
  |      .'   '.                 |
  |   __'       '.__             |
  |  '               '.____     |
  +------------------------------+`;

const ASSET_REGISTRY_ASCII = `  +--[ IT Assets ]---------------+
  |  Search: [___________] [Go]  |
  |                               |
  |  ID     Device     Status    |
  |  -----  ---------  -------- |
  |  A-001  MacBook    * Active  |
  |  A-002  Monitor    * Active  |
  |  A-003  Keyboard   o Spare   |
  |  A-004  Headset    x Repair  |
  |  A-005  Docking    * Active  |
  |                               |
  |  Total: 142   Active: 128   |
  |  Spare: 9     Repair: 5     |
  +-------------------------------+`;

const DIAGRAM_MAKE_ASCII = `      .---------.
      |  Start  |
      '----+----'
           |
      .----v----.
     / Condition  \\
    /  user.role?  \\
    \\              /
     '---+----+--'
         |    |
    Yes  |    |  No
    .----v-.  .--v----.
    | Admin|  | Guest |
    '---+--'  '---+---'
        |         |
    .---v---------v---.
    |    Dashboard    |
    '-----------------'`;

// ---------------------------------------------------------------------------
// Agents ASCII art
// ---------------------------------------------------------------------------

const CODE_REVIEWER_ASCII = `  .----[ Rovo: Code Review ]-----.
  |                               |
  |  PR #847  "Add auth flow"    |
  |  +-  3 files changed         |
  |  +12 / -4 lines              |
  |                               |
  |  [!] auth.ts:42              |
  |  Missing null check on       |
  |  user.session before          |
  |  accessing .token             |
  |                               |
  |  [*] Overall: Approve        |
  |  2 suggestions, 1 nit        |
  '-------------------------------'`;

const STANDUP_SCRIBE_ASCII = `  .----[ Rovo: Standup ]---------.
  |                               |
  |  Good morning, team!          |
  |  Here's today's summary:      |
  |                               |
  |  Yesterday:                   |
  |  * Merged auth PR (#847)     |
  |  * Fixed 3 bugs in search    |
  |                               |
  |  Today:                       |
  |  * API rate limiting          |
  |  * Deploy to staging          |
  |                               |
  |  Blocked:                     |
  |  * Waiting on design review  |
  '-------------------------------'`;

const INCIDENT_OPS_ASCII = `  .----[ Rovo: Incident Ops ]----.
  |                               |
  |  ! SEV-2 ACTIVE              |
  |  API latency > 2s            |
  |  Started: 14:22 UTC          |
  |  Duration: 47 min            |
  |                               |
  |  Responders:                  |
  |  @ sarah  (IC)               |
  |  @ james  (Comms)            |
  |                               |
  |  [x] Paged on-call           |
  |  [x] Status page updated     |
  |  [ ] Root cause analysis     |
  '-------------------------------'`;

const CONTENT_WRITER_ASCII = `  .----[ Rovo: Writer ]----------.
  |                               |
  |  Drafting: Release Notes     |
  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  |                               |
  |  ## What's New               |
  |                               |
  |  - SSO support for SAML     |
  |  - Bulk export to CSV        |
  |  - Dark mode (beta)          |
  |                               |
  |  ## Bug Fixes                |
  |  - Fixed login timeout       |
  |  - Resolved sync delay       |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`;

const ONBOARDING_BUDDY_ASCII = `  .----[ Rovo: Onboarding ]------.
  |                               |
  |  Welcome, Alex!               |
  |  Day 3 of 14                  |
  |  =======--------  21%        |
  |                               |
  |  Today's checklist:           |
  |  [x] Set up dev environment  |
  |  [x] Read team charter       |
  |  [ ] Meet your buddy         |
  |  [ ] First PR walkthrough    |
  |                               |
  |  Tip: Your buddy @Sam is     |
  |  online now. Say hi!          |
  '-------------------------------'`;

const TRIAGE_BOT_ASCII = `  .----[ Rovo: Triage ]----------.
  |                               |
  |  Incoming: 12 new issues      |
  |                               |
  |  Auto-classified:             |
  |  [Bug]  Login fails    - P2  |
  |         -> @backend-team      |
  |  [Task] Update docs   - P3  |
  |         -> @docs-team         |
  |  [Bug]  Slow search   - P1  |
  |         -> @platform-team     |
  |                               |
  |  Needs review: 3              |
  |  Confidence < 80%            |
  '-------------------------------'`;

// ---------------------------------------------------------------------------
// Automation ASCII art
// ---------------------------------------------------------------------------

const AUTO_ASSIGN_ASCII = `  WHEN
  +-----------+
  | Issue     |
  | created   |
  +-----+-----+
        |
  IF    v
  .-----------.
  | Component |---> Backend
  | = ?       |---> Frontend
  '-----------'---> Mobile
        |
  THEN  v
  +-----------+
  | Assign to |
  | team lead |
  +-----------+`;

const SLA_ESCALATION_ASCII = `  +----------+    +-----------+
  | Ticket   |--->| Check SLA |
  | updated  |    | remaining |
  +----------+    +-----+-----+
                        |
             +----------+----------+
             |          |          |
         > 4 hrs    1-4 hrs    < 1 hr
             |          |          |
        [Normal]   [Warning]  [!ALERT]
                        |          |
                   Send Slack   Page
                   reminder    on-call`;

const SPRINT_ROLLOVER_ASCII = `  TRIGGER: Sprint ends
  +-----------+
  | Scan all  |
  | issues    |
  +-----+-----+
        |
  .-----v------.
  | Status !=  |--No---> [Done]
  | "Done" ?   |
  '-----+------'
        | Yes
  +-----v------+
  | Move to    |
  | next sprint|
  +-----+------+
        |
  +-----v------+
  | Comment:   |
  | "Rolled    |
  |  over"     |
  +------------+`;

const STALE_PR_REMINDER_ASCII = `  SCHEDULE: Daily 9am
  +------------+
  | Scan open  |
  | pull reqs  |
  +-----+------+
        |
  .-----v-------.
  | Age > 48h?  |--No---> [Skip]
  '------+------'
         | Yes
  +------v-------+
  | DM author    |
  | on Slack     |
  +------+-------+
         |
  .------v-------.
  | Age > 7 days |--No--> [End]
  '------+-------'
         | Yes
  +------v-------+
  | Notify team  |
  | lead         |
  +--------------+`;

const APPROVAL_CHAIN_ASCII = `  REQUEST SUBMITTED
  +------+------+
  | Stage 1     |
  | Manager     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 2     |
  | Finance     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 3     |
  | VP / Legal  +---Reject---> [Denied]
  +------+------+
         | Approve
     [Approved]`;

const RELEASE_PIPELINE_ASCII = `  TRIGGER: Tag pushed
  +--------+  +-------+  +--------+
  | Build  |->| Test  |->| Stage  |
  | (CI)   |  | suite |  | deploy |
  +--------+  +---+---+  +---+----+
                  |           |
              fail|       +---v---+
             [Abort]      | Smoke |
                          | tests |
                          +---+---+
                              |pass
                         +----v----+
                         | Prod    |
                         | deploy  |
                         +---------+`;

// ---------------------------------------------------------------------------
// Skills ASCII art
// ---------------------------------------------------------------------------

const JQL_WIZARD_ASCII = `  +--[ JQL Wizard ]---------------+
  |                                |
  |  project = ATLAS              |
  |  AND status in                |
  |     (Open, "In Progress")    |
  |  AND priority >= High        |
  |  AND assignee = currentUser()|
  |  ORDER BY created DESC       |
  |                                |
  |  Preview: 24 issues match    |
  |  +--+--+--+--+--+--+--+--+  |
  |  |##|##|##|##|  |  |  |  |  |
  |  +--+--+--+--+--+--+--+--+  |
  |  [ Copy ]     [ Run >>> ]    |
  +--------------------------------+`;

const BULK_EDITOR_ASCII = `  +--[ Bulk Edit ]---------------+
  |                               |
  |  Selected: 47 issues         |
  |                               |
  |  Field        New Value      |
  |  ----------   -----------    |
  |  Status    -> In Review      |
  |  Sprint    -> Sprint 25      |
  |  Label     -> +migration     |
  |                               |
  |  Preview changes:             |
  |  47 updated, 0 skipped       |
  |                               |
  |  [ Cancel ]  [ Apply All ]   |
  +-------------------------------+`;

const CSV_IMPORTER_ASCII = `  +--[ CSV Import ]--------------+
  |                               |
  |  File: users-2026.csv        |
  |  Rows: 1,284                  |
  |  =========================== |
  |                               |
  |  Mapping:                     |
  |  csv.name   -> displayName   |
  |  csv.email  -> emailAddr     |
  |  csv.dept   -> team          |
  |  csv.role   -> (skip)        |
  |                               |
  |  Validated: 1,281 ok         |
  |  Errors:    3 rows           |
  |                               |
  |  [ Preview ]  [ Import >>> ] |
  +-------------------------------+`;

const REPORT_GENERATOR_ASCII = `  +--[ Report Generator ]-------+
  |                              |
  |  Template: Sprint Summary   |
  |  Range:    Last 30 days      |
  |                              |
  |  Sections:                   |
  |  [x] Velocity chart         |
  |  [x] Bug triage stats       |
  |  [ ] Individual breakdown   |
  |  [x] Carry-over analysis    |
  |                              |
  |  Format:                     |
  |  (*) Confluence page        |
  |  ( ) PDF export              |
  |  ( ) Slack summary           |
  |                              |
  |          [ Generate >>> ]   |
  +------------------------------+`;

const PAGE_SCAFFOLDER_ASCII = `  +--[ Page Templates ]---------+
  |                              |
  |  > Design Spec              |
  |    ## Overview               |
  |    ## User Stories            |
  |    ## Wireframes             |
  |    ## Acceptance Criteria    |
  |                              |
  |  > Runbook                   |
  |    ## Service Info           |
  |    ## Playbook               |
  |    ## Contacts               |
  |                              |
  |  Space: Engineering          |
  |  Parent: /docs/templates    |
  |                              |
  |  [ Preview ] [ Create >>> ] |
  +------------------------------+`;

const REST_CONNECTOR_ASCII = `  +--[ API Connector ]----------+
  |                              |
  |  GET /api/v2/users           |
  |                              |
  |  Headers:                    |
  |  Auth: Bearer ****7f2a      |
  |  Accept: application/json   |
  |                              |
  |  Response: 200 OK            |
  |  +------------------------+ |
  |  | { "users": [           | |
  |  |     { "id": 1,         | |
  |  |       "name": "Alex" } | |
  |  |   ], "total": 42 }    | |
  |  +------------------------+ |
  |                              |
  |  [ Save ]   [ Test >>> ]    |
  +------------------------------+`;

// ---------------------------------------------------------------------------
// Gallery items
// ---------------------------------------------------------------------------

export const GALLERY_ITEMS: GalleryItem[] = [
	// ── Apps ──────────────────────────────────────────────────────────────
	{
		id: "sprint-board",
		title: "Sprint Board",
		type: "apps",
		prompt: "Build a sprint board app with drag-and-drop columns",
		color: "text-text-subtlest",
		ascii: SPRINT_BOARD_ASCII,
		description: "A Kanban-style sprint board with drag-and-drop columns, story point tracking, and real-time velocity metrics.",
		metadata: [
			{ label: "Use case", value: ["Project management"] },
			{ label: "Remix", value: "12,408" },
			{ label: "Last updated", value: "Feb 22, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "time-tracker",
		title: "Time Tracker",
		type: "apps",
		prompt: "Build a time tracking app with daily and weekly views",
		color: "text-text-subtlest",
		ascii: TIME_TRACKER_ASCII,
		description: "Track billable hours with a live timer, daily and weekly summaries, and project-level breakdowns.",
		metadata: [
			{ label: "Use case", value: ["Administrative tools"] },
			{ label: "Remix", value: "6,731" },
			{ label: "Last updated", value: "Feb 14, 2026" },
		],
	},
	{
		id: "form-builder",
		title: "Form Builder",
		type: "apps",
		prompt: "Build a dynamic form builder with field validation",
		color: "text-text-subtlest",
		ascii: FORM_BUILDER_ASCII,
		description: "Dynamic intake forms with drag-and-drop fields, conditional logic, validation rules, and submission routing.",
		metadata: [
			{ label: "Use case", value: ["IT support and service"] },
			{ label: "Remix", value: "3,215" },
			{ label: "Last updated", value: "Jan 30, 2026" },
		],
	},
	{
		id: "metrics-dashboard",
		title: "Metrics Dashboard",
		type: "apps",
		prompt: "Build an analytics dashboard with charts and KPIs",
		color: "text-text-subtlest",
		ascii: METRICS_DASHBOARD_ASCII,
		description: "Real-time analytics dashboard with KPI scorecards, bar charts, sparklines, and trend indicators.",
		metadata: [
			{ label: "Use case", value: ["Data and analytics"] },
			{ label: "Remix", value: "8,942" },
			{ label: "Last updated", value: "Feb 18, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "asset-registry",
		title: "Asset Registry",
		type: "apps",
		prompt: "Build an IT asset management app with status tracking",
		color: "text-text-subtlest",
		ascii: ASSET_REGISTRY_ASCII,
		description: "IT asset inventory with searchable device catalog, status indicators, and fleet-level summaries.",
		metadata: [
			{ label: "Use case", value: ["IT support and service"] },
			{ label: "Remix", value: "1,847" },
			{ label: "Last updated", value: "Jan 12, 2026" },
		],
	},
	{
		id: "diagram-make",
		title: "Diagram Make",
		type: "apps",
		prompt: "Build a diagram editor for flowcharts and architecture",
		color: "text-text-subtlest",
		ascii: DIAGRAM_MAKE_ASCII,
		description: "Visual diagram editor for flowcharts, decision trees, and system architecture with export support.",
		metadata: [
			{ label: "Use case", value: ["Design and diagramming"] },
			{ label: "Remix", value: "5,603" },
			{ label: "Last updated", value: "Feb 08, 2026" },
		],
	},

	// ── Agents ────────────────────────────────────────────────────────────
	{
		id: "code-reviewer",
		title: "Code Reviewer",
		type: "agents",
		prompt: "Create an agent that reviews pull requests and suggests improvements",
		color: "text-text-subtlest",
		ascii: CODE_REVIEWER_ASCII,
		description: "Reviews pull requests for bugs, null checks, and code style, then delivers a summary with approval status.",
		metadata: [
			{ label: "Use case", value: ["Software development"] },
			{ label: "Remix", value: "9,124" },
			{ label: "Last updated", value: "Feb 20, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "standup-scribe",
		title: "Standup Scribe",
		type: "agents",
		prompt: "Create an agent that summarizes daily standups from Jira activity",
		color: "text-text-subtlest",
		ascii: STANDUP_SCRIBE_ASCII,
		description: "Generates daily standup summaries from Jira activity, grouping updates into yesterday, today, and blockers.",
		metadata: [
			{ label: "Use case", value: ["Project management"] },
			{ label: "Remix", value: "4,267" },
			{ label: "Last updated", value: "Feb 16, 2026" },
		],
	},
	{
		id: "incident-ops",
		title: "Incident Ops",
		type: "agents",
		prompt: "Create an agent that triages incidents and coordinates response",
		color: "text-text-subtlest",
		ascii: INCIDENT_OPS_ASCII,
		description: "Triages incidents by severity, pages on-call responders, updates status pages, and tracks action items.",
		metadata: [
			{ label: "Use case", value: ["IT support and service"] },
			{ label: "Remix", value: "2,856" },
			{ label: "Last updated", value: "Feb 12, 2026" },
		],
	},
	{
		id: "content-writer",
		title: "Content Writer",
		type: "agents",
		prompt: "Create an agent that drafts release notes from resolved tickets",
		color: "text-text-subtlest",
		ascii: CONTENT_WRITER_ASCII,
		description: "Drafts release notes, changelogs, and documentation from resolved Jira tickets with markdown formatting.",
		metadata: [
			{ label: "Use case", value: ["Content and communication"] },
			{ label: "Remix", value: "3,518" },
			{ label: "Last updated", value: "Feb 05, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "onboarding-buddy",
		title: "Onboarding Buddy",
		type: "agents",
		prompt: "Create an agent that guides new hires through their first two weeks",
		color: "text-text-subtlest",
		ascii: ONBOARDING_BUDDY_ASCII,
		description: "Guides new hires through onboarding checklists, buddy introductions, and progress milestones over 14 days.",
		metadata: [
			{ label: "Use case", value: ["HR and team building"] },
			{ label: "Remix", value: "1,942" },
			{ label: "Last updated", value: "Jan 22, 2026" },
		],
	},
	{
		id: "triage-bot",
		title: "Triage Bot",
		type: "agents",
		prompt: "Create an agent that classifies and routes incoming support tickets",
		color: "text-text-subtlest",
		ascii: TRIAGE_BOT_ASCII,
		description: "Classifies incoming issues by type and priority, routes them to the right team, and flags low-confidence items for review.",
		metadata: [
			{ label: "Use case", value: ["IT support and service"] },
			{ label: "Remix", value: "5,731" },
			{ label: "Last updated", value: "Feb 24, 2026" },
		],
	},

	// ── Automation ────────────────────────────────────────────────────────
	{
		id: "auto-assign",
		title: "Auto-Assign",
		type: "automation",
		prompt: "Automate issue assignment based on component labels",
		color: "text-text-subtlest",
		ascii: AUTO_ASSIGN_ASCII,
		description: "Automatically routes new issues to the right team lead based on component labels like Backend, Frontend, or Mobile.",
		metadata: [
			{ label: "Use case", value: ["Project management"] },
			{ label: "Remix", value: "7,312" },
			{ label: "Last updated", value: "Feb 19, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "sla-escalation",
		title: "SLA Escalation",
		type: "automation",
		prompt: "Automate SLA breach detection with escalation alerts",
		color: "text-text-subtlest",
		ascii: SLA_ESCALATION_ASCII,
		description: "Monitors ticket SLA timers and escalates with Slack reminders or on-call pages as deadlines approach.",
		metadata: [
			{ label: "Use case", value: ["IT support and service"] },
			{ label: "Remix", value: "4,087" },
			{ label: "Last updated", value: "Feb 10, 2026" },
		],
	},
	{
		id: "sprint-rollover",
		title: "Sprint Rollover",
		type: "automation",
		prompt: "Automate moving incomplete issues to the next sprint",
		color: "text-text-subtlest",
		ascii: SPRINT_ROLLOVER_ASCII,
		description: "When a sprint ends, scans for incomplete issues, moves them to the next sprint, and adds a rollover comment.",
		metadata: [
			{ label: "Use case", value: ["Project management"] },
			{ label: "Remix", value: "6,425" },
			{ label: "Last updated", value: "Jan 28, 2026" },
		],
	},
	{
		id: "stale-pr-reminder",
		title: "Stale PR Reminder",
		type: "automation",
		prompt: "Automate daily reminders for stale pull requests",
		color: "text-text-subtlest",
		ascii: STALE_PR_REMINDER_ASCII,
		description: "Daily scan for aging pull requests: DMs authors after 48 hours and escalates to team leads after 7 days.",
		metadata: [
			{ label: "Use case", value: ["Software development"] },
			{ label: "Remix", value: "3,194" },
			{ label: "Last updated", value: "Feb 02, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "approval-chain",
		title: "Approval Chain",
		type: "automation",
		prompt: "Automate a multi-stage approval workflow for requests",
		color: "text-text-subtlest",
		ascii: APPROVAL_CHAIN_ASCII,
		description: "Three-stage approval pipeline through Manager, Finance, and VP/Legal with automatic deny notifications.",
		metadata: [
			{ label: "Use case", value: ["Administrative tools"] },
			{ label: "Remix", value: "2,648" },
			{ label: "Last updated", value: "Jan 15, 2026" },
		],
	},
	{
		id: "release-pipeline",
		title: "Release Pipeline",
		type: "automation",
		prompt: "Automate the build-test-deploy release pipeline",
		color: "text-text-subtlest",
		ascii: RELEASE_PIPELINE_ASCII,
		description: "End-to-end CI/CD pipeline: build, test suite, staging deploy, smoke tests, and production release on tag push.",
		metadata: [
			{ label: "Use case", value: ["Software development"] },
			{ label: "Remix", value: "5,893" },
			{ label: "Last updated", value: "Feb 21, 2026" },
		],
	},

	// ── Skills ────────────────────────────────────────────────────────────
	{
		id: "jql-wizard",
		title: "JQL Wizard",
		type: "skills",
		prompt: "A skill that helps build complex JQL queries interactively",
		color: "text-text-subtlest",
		ascii: JQL_WIZARD_ASCII,
		description: "Interactive JQL query builder with clause suggestions, syntax validation, and a live preview of matching issues.",
		metadata: [
			{ label: "Use case", value: ["Software development"] },
			{ label: "Remix", value: "8,456" },
			{ label: "Last updated", value: "Feb 23, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "bulk-editor",
		title: "Bulk Editor",
		type: "skills",
		prompt: "A skill that bulk-edits Jira issues with field transformations",
		color: "text-text-subtlest",
		ascii: BULK_EDITOR_ASCII,
		description: "Select multiple issues and apply field transformations in bulk: status changes, sprint moves, and label additions.",
		metadata: [
			{ label: "Use case", value: ["Administrative tools"] },
			{ label: "Remix", value: "3,712" },
			{ label: "Last updated", value: "Feb 06, 2026" },
		],
	},
	{
		id: "csv-importer",
		title: "CSV Importer",
		type: "skills",
		prompt: "A skill that imports CSV data and maps columns to Jira fields",
		color: "text-text-subtlest",
		ascii: CSV_IMPORTER_ASCII,
		description: "Import CSV files with column-to-field mapping, row validation, error reporting, and a dry-run preview.",
		metadata: [
			{ label: "Use case", value: ["Data and analytics"] },
			{ label: "Remix", value: "2,104" },
			{ label: "Last updated", value: "Jan 18, 2026" },
		],
	},
	{
		id: "report-generator",
		title: "Report Generator",
		type: "skills",
		prompt: "A skill that generates sprint reports in Confluence",
		color: "text-text-subtlest",
		ascii: REPORT_GENERATOR_ASCII,
		description: "Generate sprint summary reports with velocity charts, bug triage stats, and carry-over analysis in multiple formats.",
		metadata: [
			{ label: "Use case", value: ["Data and analytics"] },
			{ label: "Remix", value: "4,589" },
			{ label: "Last updated", value: "Feb 11, 2026" },
		],
		flexGrow: true,
	},
	{
		id: "page-scaffolder",
		title: "Page Scaffolder",
		type: "skills",
		prompt: "A skill that scaffolds Confluence pages from templates",
		color: "text-text-subtlest",
		ascii: PAGE_SCAFFOLDER_ASCII,
		description: "Scaffold Confluence pages from templates like Design Specs and Runbooks with pre-filled section headings.",
		metadata: [
			{ label: "Use case", value: ["Content and communication"] },
			{ label: "Remix", value: "3,267" },
			{ label: "Last updated", value: "Jan 25, 2026" },
		],
	},
	{
		id: "rest-connector",
		title: "REST Connector",
		type: "skills",
		prompt: "A skill that tests and integrates REST API endpoints",
		color: "text-text-subtlest",
		ascii: REST_CONNECTOR_ASCII,
		description: "Test REST API endpoints with custom headers, inspect JSON responses, and save working configurations.",
		metadata: [
			{ label: "Use case", value: ["Software development"] },
			{ label: "Remix", value: "1,834" },
			{ label: "Last updated", value: "Dec 20, 2025" },
		],
	},
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const CATEGORIES: { value: Category; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "apps", label: "Apps" },
	{ value: "agents", label: "Agents" },
	{ value: "automation", label: "Automation" },
	{ value: "skills", label: "Skills" },
];
