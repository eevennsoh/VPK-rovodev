# Forge App Builder Skill

Guides creation, deployment, and installation of Atlassian Forge apps (Jira widgets, Confluence macros, issue panels, dashboard gadgets, etc.). Use when building any Forge app. Provides automated `forge create` workflow, module selection, CLI commands, and deployment scripts.

## Installation

### Cursor

1. Clone this repository into your Cursor skills directory:

   ```bash
   git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git ~/.cursor/skills/forge-app-builder
   ```

2. The skill will be automatically discovered by Cursor. Use it when building Forge apps by mentioning creating a new Forge app.

**Alternative (project-scoped):** To make the skill available only for a specific project, clone into the project's `.cursor/skills/` directory:

```bash
mkdir -p .cursor/skills
git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git .cursor/skills/forge-app-builder
```

---

### Rovo Dev

1. Clone this repository into your Rovo Dev skills directory:

   ```bash
   git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git ~/.agents/skills/forge-app-builder
   ```

2. The skill will be automatically discovered by Rovo Dev. Use it when building Forge apps by mentioning Forge, Jira widgets, Confluence macros, or similar.

**Alternative (project-scoped):** To make the skill available only for a specific project, clone into the project's `.agents/skills/` directory:

```bash
mkdir -p .agents/skills
git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git .agents/skills/forge-app-builder
```

---

### Claude Code

1. Clone this repository into your Claude Code skills directory:

   ```bash
   git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git ~/.claude/skills/forge-app-builder
   ```

2. The skill will be automatically discovered by Claude Code. Use it when building Forge apps by mentioning Forge, Jira widgets, Confluence macros, or similar.

**Alternative (project-scoped):** To make the skill available only for a specific project, clone into the project's `.claude/skills/` directory:

```bash
mkdir -p .claude/skills
git clone https://bitbucket.org/atlassianlabs/forge-app-builder-skill.git .claude/skills/forge-app-builder
```

---


## What This Skill Provides

- **Automated workflow** — Discovers dev spaces, creates apps with `forge create`, deploys and installs
- **Module selection** — Guidance for Jira panels, Confluence macros, dashboard gadgets, Rovo agents, and more
- **Helper scripts** — Python scripts for dev spaces, templates, and deployment
- **Reference docs** — CLI workflow, module selector, project setup

See [SKILL.md](SKILL.md) for the full skill content.
