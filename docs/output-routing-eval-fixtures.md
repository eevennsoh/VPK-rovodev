# Output Routing — Evaluation Fixtures (QA-001)

Labeled prompt set for validating output routing accuracy across all route classes.

## Route Class Taxonomy

| Code | Route Class | Expected Path | Experience |
| --- | --- | --- | --- |
| `TASK_GenerativeUI` | Actionable / toolable task | RovoDev (tools) → GenUI LLM → json-render | `generative_ui` |
| `TASK_Clarification` | Missing context for actionable task | RovoDev → `ask_user_questions` → Question Card | `question_card` |
| `MEDIA_Image` | Image generation | Pre-classifier → AI Gateway (Google) | `image` |
| `MEDIA_Sound` | Sound / audio generation | Pre-classifier → AI Gateway (Google) | `audio` |
| `TEXT_Standard` | Informational Q&A / conversation | RovoDev (no tools) → text stream | `text` |
| `FALLBACK_Text` | GenUI generation failure | Two-step fails → instant text fallback | `text` (reason: `fallback_ui_failed`) |

---

## E2E Demo Fixture Pack (from PRD section 11)

| ID | Prompt | Expected Route | Assertion |
| --- | --- | --- | --- |
| Q1 | "How is my total compensation and benefits package structured?" | `TASK_GenerativeUI` | Tabbed UI with distinct tab content, at least one chart + one table |
| Q2 | "What are my key onboarding and benefits milestones in my first 90 days?" | `TASK_GenerativeUI` | Timeline with ordered milestones from start to end period |
| Q3 | "How should I allocate my Flex Wallet for the year?" | `TASK_GenerativeUI` | Sliders/radios/checkboxes render, output changes when controls change |
| Q4 | "Help me plan my first-year finances with salary, leave, and benefits assumptions." | `TASK_GenerativeUI` | Accordion sections with input groups, computed plan summary |
| CLAR | Same query but with missing key context | `TASK_Clarification` | Question Card appears in composer, answers accepted, retry returns GenUI |
| FAIL | Force invalid UI payload | `FALLBACK_Text` | User sees RovoDev's text instantly, no error indicator |
| FOLLOW | "Change the chart to a pie chart" (after Q1) | `TASK_GenerativeUI` | New GenUI card with pie chart renders inline below previous card |

---

## Category: TASK_GenerativeUI

Prompts that should route through RovoDev tool calls → two-step GenUI flow.

| ID | Prompt | Key Assertion |
| --- | --- | --- |
| TG-01 | "Show me a breakdown of my team's sprint velocity over the last 6 sprints" | GenUI card with chart or table |
| TG-02 | "Create an onboarding checklist for a new engineer" | GenUI card with structured list or checklist |
| TG-03 | "What Confluence pages has my team updated this week?" | GenUI card with data table |
| TG-04 | "Summarize my open Jira tickets by priority" | GenUI card with grouped table or chart |
| TG-05 | "Build me a project status dashboard with key metrics" | GenUI card with metrics + chart |

## Category: TASK_Clarification

Prompts that should trigger `ask_user_questions` tool and produce a Question Card.

| ID | Prompt | Key Assertion |
| --- | --- | --- |
| TC-01 | "Set up a new project" (no project name, team, or type given) | Question Card asking for project details |
| TC-02 | "Create a report" (no scope, time range, or metrics specified) | Question Card asking for report parameters |
| TC-03 | "Help me plan my benefits" (no employee details) | Question Card for employee context |
| TC-04 | "Review the code" (no repo, PR, or branch specified) | Question Card for code review context |

## Category: MEDIA_Image

Prompts that should bypass RovoDev and route directly to AI Gateway image generation.

| ID | Prompt | Key Assertion |
| --- | --- | --- |
| MI-01 | "Generate an image of a sunset over the ocean" | Image widget renders with generated image |
| MI-02 | "Create a logo for a tech startup called NovaByte" | Image widget renders |
| MI-03 | "Draw me an illustration of a robot reading a book" | Image widget renders |
| MI-04 | "Make a banner image for our team page" | Image widget renders |
| MI-05 | "Produce a portrait of a mountain landscape" | Image widget renders |

### Negative — Should NOT route to image

| ID | Prompt | Expected Route | Reason |
| --- | --- | --- | --- |
| MI-N01 | "Find me an image of the Eiffel Tower" | `TEXT_Standard` | Search/retrieval, not generation |
| MI-N02 | "What image format should I use for web?" | `TEXT_Standard` | Question about images, not generation |
| MI-N03 | "How do I resize an image in Confluence?" | `TEXT_Standard` | Editing instruction, not generation |

## Category: MEDIA_Sound

Prompts that should bypass RovoDev and route to AI Gateway audio generation.

| ID | Prompt | Key Assertion |
| --- | --- | --- |
| MS-01 | "Generate a sound effect of rain on a window" | Audio widget renders |
| MS-02 | "Create a text-to-speech narration of this paragraph" | Audio widget renders |
| MS-03 | "Make a jingle for our team standup" | Audio widget renders |
| MS-04 | "Read this aloud: Welcome to the new onboarding experience" | Audio widget renders |
| MS-05 | "Produce a calming ambient sound for focus mode" | Audio widget renders |

## Category: TEXT_Standard

Prompts that should stream text normally via RovoDev without triggering GenUI.

| ID | Prompt | Key Assertion |
| --- | --- | --- |
| TS-01 | "What is the difference between a story and an epic in Jira?" | Text streams, no GenUI card |
| TS-02 | "Hello, how are you?" | Text streams |
| TS-03 | "Explain the benefits enrollment process" | Text streams |
| TS-04 | "What is the company policy on remote work?" | Text streams |
| TS-05 | "Tell me about Confluence spaces" | Text streams |
| TS-06 | "Thanks for your help!" | Text streams |

## Category: FALLBACK_Text

Scenarios where GenUI generation fails and text fallback should engage.

| ID | Scenario | Key Assertion |
| --- | --- | --- |
| FT-01 | GenUI LLM returns empty / no spec patches | User sees RovoDev's text instantly |
| FT-02 | GenUI LLM returns malformed spec | User sees RovoDev's text instantly |
| FT-03 | GenUI LLM call times out or throws exception | User sees RovoDev's text instantly |
| FT-04 | Network error during GenUI LLM call | User sees RovoDev's text instantly, no error indicator |

---

## Ambiguous / Mixed-Intent Prompts

These prompts contain elements of multiple intent categories and test the routing priority order.

| ID | Prompt | Expected Route | Reasoning |
| --- | --- | --- | --- |
| AMB-01 | "What's the weather and show me my benefits dashboard" | `TASK_GenerativeUI` | Mixed-intent → RovoDev handles everything; tools called → GenUI |
| AMB-02 | "Create an image of our team and list their recent Jira tickets" | `TASK_GenerativeUI` | Task intent dominates over media; RovoDev routes to tools |
| AMB-03 | "Generate a sound of a notification and explain our alert system" | `MEDIA_Sound` | Pre-classifier detects sound first (media bypass has higher priority) |
| AMB-04 | "Can you make me a chart showing our spending?" | `TASK_GenerativeUI` | "chart" here is data visualization, not image generation |
| AMB-05 | "Draw up a project plan for Q3" | `TASK_GenerativeUI` | "Draw up" is figurative, not image generation |
| AMB-06 | "Show me a picture of the team org chart" | `TASK_GenerativeUI` | "picture" is figurative; org chart is a data visualization |

---

## Skip / Dismiss Branch Fixtures

| ID | Scenario | Expected Behavior |
| --- | --- | --- |
| SK-01 | Question Card appears → user clicks Skip | Backend receives dismiss notification; RovoDev responds |
| SK-02 | Question Card appears → user answers and submits | Answers appended to history; RovoDev retries with context |
| SK-03 | Question Card appears → user presses Escape | Card dismissed (same as Skip); backend notified |
