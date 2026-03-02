export const getFramesForId = (id: string): string[] | null => {
	switch (id) {
		case "metrics-dashboard":
			return [
				`  +--[ Q1 Metrics ]-------------+
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
  +------------------------------+`,
				`  +--[ Q1 Metrics ]-------------+
  |                              |
  |  Issues    Velocity    SLA   |
  |   345       24 pts    98.1%  |
  |   +13%      ~~~~~     ~~~~~  |
  |                              |
  |   Jan █████████░  85%       |
  |   Feb ██████████  96%       |
  |   Mar █████████░  90%       |
  |                              |
  |      .__                     |
  |    .'   '.                   |
  | __'       '.__               |
  |'               '.____       |
  +------------------------------+`,
				`  +--[ Q1 Metrics ]-------------+
  |                              |
  |  Issues    Velocity    SLA   |
  |   348       25 pts    98.0%  |
  |   +14%      ~~~~~     ~~~~~  |
  |                              |
  |   Jan ██████████  90%       |
  |   Feb █████████░  94%       |
  |   Mar ██████████  95%       |
  |                              |
  |    .__                       |
  |  .'   '.                     |
  | _'      '.__                 |
  |'            '.____          |
  +------------------------------+`,
				`  +--[ Q1 Metrics ]-------------+
  |                              |
  |  Issues    Velocity    SLA   |
  |   350       25 pts    98.3%  |
  |   +15%      ~~~~~     ~~~~~  |
  |                              |
  |   Jan █████████░  88%       |
  |   Feb ██████████  98%       |
  |   Mar █████████░  92%       |
  |                              |
  |  .__                         |
  |.'   '.                       |
  |'      '.__                   |
  |           '.____            |
  +------------------------------+`,
			];

		case "release-pipeline":
			return [
				`  TRIGGER: Tag pushed
  +--------+  +-------+  +--------+
  | Build  |  | Test  |  | Stage  |
  | [ooo]  |  | [   ] |  | [   ]  |
  +---+----+  +---+---+  +---+----+
      |           |          |
      >===========>==========>
              Deploying...`,
				`  TRIGGER: Tag pushed
  +--------+  +-------+  +--------+
  | Build  |  | Test  |  | Stage  |
  | [###]  |  | [ooo] |  | [   ]  |
  +---+----+  +---+---+  +---+----+
      |           |          |
      >===========>==========>
               Testing...`,
				`  TRIGGER: Tag pushed
  +--------+  +-------+  +--------+
  | Build  |  | Test  |  | Stage  |
  | [###]  |  | [###] |  | [ooo]  |
  +---+----+  +---+---+  +---+----+
      |           |          |
      >===========>==========>
               Staging...`,
				`  TRIGGER: Tag pushed
  +--------+  +-------+  +--------+
  | Build  |  | Test  |  | Stage  |
  | [###]  |  | [###] |  | [###]  |
  +---+----+  +---+---+  +---+----+
      |           |          |
      >===========>==========>
              Deployed! ✔`,
			];

		case "sprint-board":
			return [
				`  +--[ Sprint 24 ]----------------+
  |                                |
  | TO DO    IN PROG     DONE     |
  | +------+                      |
  | | AUTH |                      |
  | +------+                      |
  | +------+                      |
  | | API  |                      |
  | +------+                      |
  |                                |
  |  Velocity: 24 pts   75% done  |
  +--------------------------------+`,
				`  +--[ Sprint 24 ]----------------+
  |                                |
  | TO DO    IN PROG     DONE     |
  |          +------+             |
  |          | AUTH |             |
  |          +------+             |
  | +------+                      |
  | | API  |                      |
  | +------+                      |
  |                                |
  |  Velocity: 24 pts   75% done  |
  +--------------------------------+`,
				`  +--[ Sprint 24 ]----------------+
  |                                |
  | TO DO    IN PROG     DONE     |
  |                      +------+ |
  |                      | AUTH | |
  |                      +------+ |
  |          +------+             |
  |          | API  |             |
  |          +------+             |
  |                                |
  |  Velocity: 29 pts   82% done  |
  +--------------------------------+`,
				`  +--[ Sprint 24 ]----------------+
  |                                |
  | TO DO    IN PROG     DONE     |
  |                      +------+ |
  |                      | AUTH | |
  |                      +------+ |
  |                      +------+ |
  |                      | API  | |
  |                      +------+ |
  |                                |
  |  Velocity: 32 pts   100% done |
  +--------------------------------+`,
			];

		case "triage-bot":
			return [
				`  .----[ Rovo: Triage ]----------.
  |  Scanning inbox...     ( / )  |
  |                               |
  |  [ ] Login fails       - P?   |
  |  [ ] Update docs       - P?   |
  |  [ ] Slow search       - P?   |
  |                               |
  |  Analyzing text...            |
  |  [=>         ] 10%            |
  '-------------------------------'`,
				`  .----[ Rovo: Triage ]----------.
  |  Scanning inbox...     ( - )  |
  |                               |
  |  [x] Login fails       - P2   |
  |      -> @backend-team         |
  |  [ ] Update docs       - P?   |
  |  [ ] Slow search       - P?   |
  |                               |
  |  Analyzing text...            |
  |  [=====>     ] 50%            |
  '-------------------------------'`,
				`  .----[ Rovo: Triage ]----------.
  |  Scanning inbox...     ( \\ )  |
  |                               |
  |  [x] Login fails       - P2   |
  |  [x] Update docs       - P3   |
  |      -> @docs-team            |
  |  [ ] Slow search       - P?   |
  |                               |
  |  Analyzing text...            |
  |  [========>  ] 80%            |
  '-------------------------------'`,
				`  .----[ Rovo: Triage ]----------.
  |  Triage complete       ( | )  |
  |                               |
  |  [x] Login fails       - P2   |
  |  [x] Update docs       - P3   |
  |  [x] Slow search       - P1   |
  |      -> @platform-team        |
  |                               |
  |  All routed!                  |
  |  [===========] 100%           |
  '-------------------------------'`,
			];

		case "form-builder":
			return [
				`  +--[ Intake Form ]-------------+
  |                               |
  |  Name     [|              ]   |
  |  Email    [               ]   |
  |  Team     [  Select...   v]   |
  |                               |
  |  Priority                     |
  |  ( ) Critical  ( ) High      |
  |  ( ) Medium    ( ) Low       |
  |                               |
  |  [ Cancel ]   [ Submit >>> ]  |
  +-------------------------------+`,
				`  +--[ Intake Form ]-------------+
  |                               |
  |  Name     [Alex|          ]   |
  |  Email    [               ]   |
  |  Team     [  Select...   v]   |
  |                               |
  |  Priority                     |
  |  ( ) Critical  ( ) High      |
  |  (*) Medium    ( ) Low       |
  |                               |
  |  [ Cancel ]   [ Submit >>> ]  |
  +-------------------------------+`,
				`  +--[ Intake Form ]-------------+
  |                               |
  |  Name     [Alex           ]   |
  |  Email    [alex@acme.c|   ]   |
  |  Team     [  Design      v]   |
  |                               |
  |  Priority                     |
  |  (*) Critical  ( ) High      |
  |  ( ) Medium    ( ) Low       |
  |                               |
  |  [ Cancel ]   [ Submit >>> ]  |
  +-------------------------------+`,
				`  +--[ Intake Form ]-------------+
  |                               |
  |  Name     [Alex           ]   |
  |  Email    [alex@acme.com  ]   |
  |  Team     [  Design      v]   |
  |                               |
  |  Priority                     |
  |  (*) Critical  ( ) High      |
  |  ( ) Medium    ( ) Low       |
  |                               |
  |  [ Cancel ]   [*Submit >>>*]  |
  +-------------------------------+`,
			];

		case "diagram-maker":
			return [
				`      .---------.
      |  Start  |
      '----+----'
           o
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
    '-----------------'`,
				`      .---------.
      |  Start  |
      '----+----'
           |
      .----v----.
     / Condition  \\
    /  user.role?  \\
    \\              /
     '---o----+--'
         |    |
    Yes  v    |  No
    .----v-.  .--v----.
    | Admin|  | Guest |
    '---+--'  '---+---'
        |         |
    .---v---------v---.
    |    Dashboard    |
    '-----------------'`,
				`      .---------.
      |  Start  |
      '----+----'
           |
      .----v----.
     / Condition  \\
    /  user.role?  \\
    \\              /
     '---+----o--'
         |    |
    Yes  |    v  No
    .----v-.  .--v----.
    | Admin|  | Guest |
    '---+--'  '---+---'
        |         |
    .---v---------v---.
    |    Dashboard    |
    '-----------------'`,
				`      .---------.
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
    '---o--'  '---+---'
        |         |
    .---v---------v---.
    |  * Dashboard *  |
    '-----------------'`,
			];

		case "jql-wizard":
			return [
				`  +--[ JQL Wizard ]---------------+
  |                                |
  |  project = ATLAS |            |
  |                                |
  |                                |
  |  Suggestions:                  |
  |  > AND status = Open           |
  |  > AND assignee = currentUser()|
  |                                |
  |  Preview: 124 issues match   |
  |  [ Copy ]     [ Run >>> ]    |
  +--------------------------------+`,
				`  +--[ JQL Wizard ]---------------+
  |                                |
  |  project = ATLAS              |
  |  AND status = Open |          |
  |                                |
  |  Suggestions:                  |
  |  > AND priority = High         |
  |  > ORDER BY created DESC       |
  |                                |
  |  Preview: 52 issues match    |
  |  [ Copy ]     [ Run >>> ]    |
  +--------------------------------+`,
				`  +--[ JQL Wizard ]---------------+
  |                                |
  |  project = ATLAS              |
  |  AND status = Open            |
  |  AND priority = High |        |
  |  Suggestions:                  |
  |  > ORDER BY created DESC       |
  |                                |
  |  Preview: 18 issues match    |
  |  [ Copy ]     [ Run >>> ]    |
  +--------------------------------+`,
				`  +--[ JQL Wizard ]---------------+
  |                                |
  |  project = ATLAS              |
  |  AND status = Open            |
  |  AND priority = High          |
  |  ORDER BY created DESC |      |
  |                                |
  |  ✨ Query looks good!         |
  |                                |
  |  Preview: 18 issues match    |
  |  [ Copy ]     [*Run >>>*]    |
  +--------------------------------+`,
			];

		case "standup-scribe":
			return [
				`  .----[ Rovo: Standup ]---------.
  |                               |
  |  (^_^) / Good morning, team!  |
  |                               |
  |  Yesterday:                   |
  |  * Merged auth PR (#847)      |
  |  * Fixed 3 bugs in search     |
  |                               |
  |  Today:                       |
  |  * API rate limiting          |
  |  * Deploy to staging          |
  |                               |
  |  Blocked:                     |
  |  * Waiting on design review   |
  '-------------------------------'`,
				`  .----[ Rovo: Standup ]---------.
  |                               |
  |  (^_^) \\ Good morning, team!  |
  |                               |
  |  Yesterday:                   |
  |  * Merged auth PR (#847)      |
  |  * Fixed 3 bugs in search     |
  |                               |
  |  Today:                       |
  |  * API rate limiting          |
  |  * Deploy to staging          |
  |                               |
  |  Blocked:                     |
  |  * Waiting on design review   |
  '-------------------------------'`,
			];

		case "incident-ops":
			return [
				`  .----[ Rovo: Incident Ops ]----.
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
  '-------------------------------'`,
				`  .----[ Rovo: Incident Ops ]----.
  |                               |
  |    SEV-2 ACTIVE              |
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
  '-------------------------------'`,
				`  .----[ Rovo: Incident Ops ]----.
  |                               |
  |  ! SEV-2 ACTIVE              |
  |  API latency > 2s            |
  |  Started: 14:22 UTC          |
  |  Duration: 48 min            |
  |                               |
  |  Responders:                  |
  |  @ sarah  (IC)               |
  |  @ james  (Comms)            |
  |                               |
  |  [x] Paged on-call           |
  |  [x] Status page updated     |
  |  [ ] Root cause analysis...  |
  '-------------------------------'`,
				`  .----[ Rovo: Incident Ops ]----.
  |                               |
  |    SEV-2 ACTIVE              |
  |  API latency > 2s            |
  |  Started: 14:22 UTC          |
  |  Duration: 48 min            |
  |                               |
  |  Responders:                  |
  |  @ sarah  (IC)               |
  |  @ james  (Comms)            |
  |                               |
  |  [x] Paged on-call           |
  |  [x] Status page updated     |
  |  [x] Root cause analysis     |
  '-------------------------------'`,
			];

		case "page-scaffolder":
			return [
				`  +--[ Page Templates ]---------+
  |                              |
  |  Loading templates...        |
  |  [oooo      ]                |
  |                              |
  |                              |
  |                              |
  |  Space: Engineering          |
  |  Parent: /docs/templates    |
  |                              |
  |  [ Preview ] [ Create >>> ] |
  +------------------------------+`,
				`  +--[ Page Templates ]---------+
  |                              |
  |  > Design Spec               |
  |    ## Overview               |
  |    ## User Stories           |
  |                              |
  |                              |
  |                              |
  |  Space: Engineering          |
  |  Parent: /docs/templates    |
  |                              |
  |  [ Preview ] [ Create >>> ] |
  +------------------------------+`,
				`  +--[ Page Templates ]---------+
  |                              |
  |  > Design Spec               |
  |    ## Overview               |
  |    ## User Stories           |
  |    ## Wireframes             |
  |    ## Acceptance Criteria    |
  |                              |
  |  Space: Engineering          |
  |  Parent: /docs/templates    |
  |                              |
  |  [ Preview ] [ Create >>> ] |
  +------------------------------+`,
				`  +--[ Page Templates ]---------+
  |                              |
  |  > Design Spec  (Selected)   |
  |    ## Overview               |
  |    ## User Stories           |
  |    ## Wireframes             |
  |    ## Acceptance Criteria    |
  |                              |
  |  Space: Engineering          |
  |  Parent: /docs/templates    |
  |                              |
  |  [ Preview ] [*Create >>>*] |
  +------------------------------+`,
			];
		case "content-writer":
			return [
				`  .----[ Rovo: Writer ]----------.
  |                               |
  |  Drafting: Release Notes     |
  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  |                               |
  |  ## What's New_              |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`,
				`  .----[ Rovo: Writer ]----------.
  |                               |
  |  Drafting: Release Notes     |
  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  |                               |
  |  ## What's New               |
  |                               |
  |  - SSO support for SAML_    |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`,
				`  .----[ Rovo: Writer ]----------.
  |                               |
  |  Drafting: Release Notes     |
  |  ~~~~~~~~~~~~~~~~~~~~~~~~~~~ |
  |                               |
  |  ## What's New               |
  |                               |
  |  - SSO support for SAML     |
  |  - Bulk export to CSV_       |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`,
				`  .----[ Rovo: Writer ]----------.
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
  |  ## Bug Fixes_               |
  |                               |
  |                               |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`,
				`  .----[ Rovo: Writer ]----------.
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
  |  - Resolved sync delay_      |
  |                               |
  |  [Edit]  [Publish]           |
  '-------------------------------'`,
			];

		case "auto-assign":
			return [
				`  *WHEN*
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
  +-----------+`,
				`  WHEN
  +-----------+
  | Issue     |
  | created   |
  +-----+-----+
        *
  *IF*  v
  .-----------.
  | Component |---> Backend
  | = ?       |---> Frontend
  '-----------'---> Mobile
        |
  THEN  v
  +-----------+
  | Assign to |
  | team lead |
  +-----------+`,
				`  WHEN
  +-----------+
  | Issue     |
  | created   |
  +-----+-----+
        |
  IF    v
  .-----------.
  | Component |***> *Backend*
  | = ?       |---> Frontend
  '-----------'---> Mobile
        |
  THEN  v
  +-----------+
  | Assign to |
  | team lead |
  +-----------+`,
				`  WHEN
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
        *
  *THEN*v
  +-----------+
  | Assign to |
  | team lead |
  +-----------+`,
			];

		case "sla-escalation":
			return [
				`  +----------+    +-----------+
  | Ticket   |--->| Check SLA |
  | updated  |    | remaining |
  +----------+    +-----+-----+
                        *
             +----------+----------+
             |          |          |
         > 4 hrs    1-4 hrs    < 1 hr
             |          |          |
        [Normal]   [Warning]  [!ALERT]
                        |          |
                   Send Slack   Page
                   reminder    on-call`,
				`  +----------+    +-----------+
  | Ticket   |--->| Check SLA |
  | updated  |    | remaining |
  +----------+    +-----+-----+
                        |
             *----------+----------+
             v          |          |
         > 4 hrs    1-4 hrs    < 1 hr
             |          |          |
        [Normal]   [Warning]  [!ALERT]
                        |          |
                   Send Slack   Page
                   reminder    on-call`,
				`  +----------+    +-----------+
  | Ticket   |--->| Check SLA |
  | updated  |    | remaining |
  +----------+    +-----+-----+
                        |
             +----------*----------+
             |          v          |
         > 4 hrs    1-4 hrs    < 1 hr
             |          |          |
        [Normal]   [Warning]  [!ALERT]
                        |          |
                   Send Slack   Page
                   reminder    on-call`,
				`  +----------+    +-----------+
  | Ticket   |--->| Check SLA |
  | updated  |    | remaining |
  +----------+    +-----+-----+
                        |
             +----------+----------*
             |          |          v
         > 4 hrs    1-4 hrs    < 1 hr
             |          |          |
        [Normal]   [Warning]  [!ALERT]
                        |          |
                   Send Slack   Page
                   reminder    on-call`,
			];

		case "sprint-rollover":
			return [
				`  TRIGGER: Sprint ends
  +-----------+
  | Scan all  |
  | issues [o]|
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
  +------------+`,
				`  TRIGGER: Sprint ends
  +-----------+
  | Scan all  |
  | issues    |
  +-----+-----+
        |
  .-----v------.
  | Status !=  |--No---> [Done]
  | "Done" ?[o]|
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
  +------------+`,
				`  TRIGGER: Sprint ends
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
  | Move to [o]|
  | next sprint|
  +-----+------+
        |
  +-----v------+
  | Comment:   |
  | "Rolled    |
  |  over"     |
  +------------+`,
				`  TRIGGER: Sprint ends
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
  | "Rolled[o] |
  |  over"     |
  +------------+`,
			];

		case "stale-pr-reminder":
			return [
				`  SCHEDULE: Daily 9am
  +------------+
  | Scan open  |
  | pull reqs  |
  +-----+------+
        *
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
  +--------------+`,
				`  SCHEDULE: Daily 9am
  +------------+
  | Scan open  |
  | pull reqs  |
  +-----+------+
        |
  .-----v-------.
  | Age > 48h?  |--No---> [Skip]
  '------+------'
         * Yes
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
  +--------------+`,
				`  SCHEDULE: Daily 9am
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
         *
  .------v-------.
  | Age > 7 days |--No--> [End]
  '------+-------'
         | Yes
  +------v-------+
  | Notify team  |
  | lead         |
  +--------------+`,
				`  SCHEDULE: Daily 9am
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
         * Yes
  +------v-------+
  | Notify team  |
  | lead         |
  +--------------+`,
			];

		case "approval-chain":
			return [
				`  REQUEST SUBMITTED
  +------+------+
  | Stage 1 [ ] |
  | Manager     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 2 [ ] |
  | Finance     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 3 [ ] |
  | VP / Legal  +---Reject---> [Denied]
  +------+------+
         | Approve
     [Approved]`,
				`  REQUEST SUBMITTED
  +------+------+
  | Stage 1 [x] |
  | Manager     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 2 [ ] |
  | Finance     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 3 [ ] |
  | VP / Legal  +---Reject---> [Denied]
  +------+------+
         | Approve
     [Approved]`,
				`  REQUEST SUBMITTED
  +------+------+
  | Stage 1 [x] |
  | Manager     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 2 [x] |
  | Finance     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 3 [ ] |
  | VP / Legal  +---Reject---> [Denied]
  +------+------+
         | Approve
     [Approved]`,
				`  REQUEST SUBMITTED
  +------+------+
  | Stage 1 [x] |
  | Manager     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 2 [x] |
  | Finance     +---Reject---> [Denied]
  +------+------+
         | Approve
  +------v------+
  | Stage 3 [x] |
  | VP / Legal  +---Reject---> [Denied]
  +------+------+
         | Approve
     [*Approved*]`,
			];

		case "bulk-editor":
			return [
				`  +--[ Bulk Edit ]---------------+
  |                               |
  |  Selected: 47 issues         |
  |                               |
  |  Field        New Value      |
  |  ----------   -----------    |
  |  Status    -> In Review_     |
  |                               |
  |                               |
  |                               |
  |  Preview changes:             |
  |  0 updated, 0 skipped        |
  |                               |
  |  [ Cancel ]  [ Apply All ]   |
  +-------------------------------+`,
				`  +--[ Bulk Edit ]---------------+
  |                               |
  |  Selected: 47 issues         |
  |                               |
  |  Field        New Value      |
  |  ----------   -----------    |
  |  Status    -> In Review      |
  |  Sprint    -> Sprint 25_     |
  |                               |
  |                               |
  |  Preview changes:             |
  |  0 updated, 0 skipped        |
  |                               |
  |  [ Cancel ]  [ Apply All ]   |
  +-------------------------------+`,
				`  +--[ Bulk Edit ]---------------+
  |                               |
  |  Selected: 47 issues         |
  |                               |
  |  Field        New Value      |
  |  ----------   -----------    |
  |  Status    -> In Review      |
  |  Sprint    -> Sprint 25      |
  |  Label     -> +migration_    |
  |                               |
  |  Preview changes:             |
  |  0 updated, 0 skipped        |
  |                               |
  |  [ Cancel ]  [ Apply All ]   |
  +-------------------------------+`,
				`  +--[ Bulk Edit ]---------------+
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
  |  [ Cancel ]  [*Apply All*]   |
  +-------------------------------+`,
			];

		case "csv-importer":
			return [
				`  +--[ CSV Import ]--------------+
  |                               |
  |  File: users-2026.csv        |
  |  Rows: 1,284                  |
  |  [====>                      ]|
  |                               |
  |  Mapping:                     |
  |  csv.name   -> displayName   |
  |  csv.email  -> emailAddr     |
  |  csv.dept   -> team          |
  |  csv.role   -> (skip)        |
  |                               |
  |  Validated: 312 ok           |
  |  Errors:    0 rows           |
  |                               |
  |  [ Preview ]  [ Import >>> ] |
  +-------------------------------+`,
				`  +--[ CSV Import ]--------------+
  |                               |
  |  File: users-2026.csv        |
  |  Rows: 1,284                  |
  |  [=========>                 ]|
  |                               |
  |  Mapping:                     |
  |  csv.name   -> displayName   |
  |  csv.email  -> emailAddr     |
  |  csv.dept   -> team          |
  |  csv.role   -> (skip)        |
  |                               |
  |  Validated: 645 ok           |
  |  Errors:    1 rows           |
  |                               |
  |  [ Preview ]  [ Import >>> ] |
  +-------------------------------+`,
				`  +--[ CSV Import ]--------------+
  |                               |
  |  File: users-2026.csv        |
  |  Rows: 1,284                  |
  |  [==================>        ]|
  |                               |
  |  Mapping:                     |
  |  csv.name   -> displayName   |
  |  csv.email  -> emailAddr     |
  |  csv.dept   -> team          |
  |  csv.role   -> (skip)        |
  |                               |
  |  Validated: 982 ok           |
  |  Errors:    2 rows           |
  |                               |
  |  [ Preview ]  [ Import >>> ] |
  +-------------------------------+`,
				`  +--[ CSV Import ]--------------+
  |                               |
  |  File: users-2026.csv        |
  |  Rows: 1,284                  |
  |  [===========================]|
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
  |  [ Preview ]  [*Import >>>*] |
  +-------------------------------+`,
			];

		case "report-generator":
			return [
				`  +--[ Report Generator ]-------+
  |                              |
  |  Template: Sprint Summary   |
  |  Range:    Last 30 days      |
  |                              |
  |  Sections:                   |
  |  [ ] Velocity chart         |
  |  [ ] Bug triage stats       |
  |  [ ] Individual breakdown   |
  |  [ ] Carry-over analysis    |
  |                              |
  |  Format:                     |
  |  (*) Confluence page        |
  |  ( ) PDF export              |
  |  ( ) Slack summary           |
  |                              |
  |          [ Generate >>> ]   |
  +------------------------------+`,
				`  +--[ Report Generator ]-------+
  |                              |
  |  Template: Sprint Summary   |
  |  Range:    Last 30 days      |
  |                              |
  |  Sections:                   |
  |  [x] Velocity chart         |
  |  [ ] Bug triage stats       |
  |  [ ] Individual breakdown   |
  |  [ ] Carry-over analysis    |
  |                              |
  |  Format:                     |
  |  (*) Confluence page        |
  |  ( ) PDF export              |
  |  ( ) Slack summary           |
  |                              |
  |          [ Generate >>> ]   |
  +------------------------------+`,
				`  +--[ Report Generator ]-------+
  |                              |
  |  Template: Sprint Summary   |
  |  Range:    Last 30 days      |
  |                              |
  |  Sections:                   |
  |  [x] Velocity chart         |
  |  [x] Bug triage stats       |
  |  [ ] Individual breakdown   |
  |  [ ] Carry-over analysis    |
  |                              |
  |  Format:                     |
  |  (*) Confluence page        |
  |  ( ) PDF export              |
  |  ( ) Slack summary           |
  |                              |
  |          [ Generate >>> ]   |
  +------------------------------+`,
				`  +--[ Report Generator ]-------+
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
  |          [*Generate >>>*]   |
  +------------------------------+`,
			];

		case "rest-connector":
			return [
				`  +--[ API Connector ]----------+
  |                              |
  |  GET /api/v2/users           |
  |                              |
  |  Headers:                    |
  |  Auth: Bearer ****7f2a      |
  |  Accept: application/json   |
  |                              |
  |  Response: ...               |
  |  +------------------------+ |
  |  |                        | |
  |  |                        | |
  |  |                        | |
  |  |                        | |
  |  +------------------------+ |
  |                              |
  |  [ Save ]   [ Sending... ]  |
  +------------------------------+`,
				`  +--[ API Connector ]----------+
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
  |  |                        | |
  |  |                        | |
  |  |                        | |
  |  +------------------------+ |
  |                              |
  |  [ Save ]   [ Receiving... ]|
  +------------------------------+`,
				`  +--[ API Connector ]----------+
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
  |  |                        | |
  |  +------------------------+ |
  |                              |
  |  [ Save ]   [ Receiving... ]|
  +------------------------------+`,
				`  +--[ API Connector ]----------+
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
  |  [ Save ]   [*Test >>>*]    |
  +------------------------------+`,
			];
		case "asset-registry":
			return [
				`  +--[ IT Assets ]---------------+
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
  +-------------------------------+`,
				`  +--[ IT Assets ]---------------+
  |  Search: [___________] [Go]  |
  |                               |
  |  ID     Device     Status    |
  |  -----  ---------  -------- |
  |  A-001  MacBook    * Active  |
  |  A-002  Monitor    * Active  |
  |  A-003  Keyboard   . Pending |
  |  A-004  Headset    x Repair  |
  |  A-005  Docking    * Active  |
  |                               |
  |  Total: 142   Active: 128   |
  |  Spare: 8     Repair: 5     |
  +-------------------------------+`,
				`  +--[ IT Assets ]---------------+
  |  Search: [___________] [Go]  |
  |                               |
  |  ID     Device     Status    |
  |  -----  ---------  -------- |
  |  A-001  MacBook    * Active  |
  |  A-002  Monitor    * Active  |
  |  A-003  Keyboard   * Active  |
  |  A-004  Headset    x Repair  |
  |  A-005  Docking    * Active  |
  |                               |
  |  Total: 142   Active: 129   |
  |  Spare: 8     Repair: 5     |
  +-------------------------------+`,
				`  +--[ IT Assets ]---------------+
  |  Search: [___________] [Go]  |
  |                               |
  |  ID     Device     Status    |
  |  -----  ---------  -------- |
  |  A-001  MacBook    * Active  |
  |  A-002  Monitor    * Active  |
  |  A-003  Keyboard   * Active  |
  |  A-004  Headset    . Sending |
  |  A-005  Docking    * Active  |
  |                               |
  |  Total: 142   Active: 129   |
  |  Spare: 8     Repair: 4     |
  +-------------------------------+`,
			];

		case "onboarding-buddy":
			return [
				`  .----[ Rovo: Onboarding ]------.
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
  '-------------------------------'`,
				`  .----[ Rovo: Onboarding ]------.
  |                               |
  |  Welcome, Alex!               |
  |  Day 3 of 14                  |
  |  ========-------  25%        |
  |                               |
  |  Today's checklist:           |
  |  [x] Set up dev environment  |
  |  [x] Read team charter       |
  |  [x] Meet your buddy         |
  |  [ ] First PR walkthrough    |
  |                               |
  |  Tip: Your buddy @Sam is     |
  |  online now. Say hi!          |
  '-------------------------------'`,
				`  .----[ Rovo: Onboarding ]------.
  |                               |
  |  Welcome, Alex!               |
  |  Day 3 of 14                  |
  |  =========------  30%        |
  |                               |
  |  Today's checklist:           |
  |  [x] Set up dev environment  |
  |  [x] Read team charter       |
  |  [x] Meet your buddy         |
  |  [ ] First PR walkthrough... |
  |                               |
  |  Tip: Your buddy @Sam is     |
  |  online now. Say hi!          |
  '-------------------------------'`,
				`  .----[ Rovo: Onboarding ]------.
  |                               |
  |  Welcome, Alex!               |
  |  Day 3 of 14                  |
  |  ==========-----  35%        |
  |                               |
  |  Today's checklist:           |
  |  [x] Set up dev environment  |
  |  [x] Read team charter       |
  |  [x] Meet your buddy         |
  |  [x] First PR walkthrough    |
  |                               |
  |  🎉 All done for today!      |
  |                               |
  '-------------------------------'`,
			];

		case "code-reviewer":
			return [
				`  .----[ Rovo: Code Review ]-----.
  |                               |
  |  PR #847  "Add auth flow"    |
  |  +-  3 files changed         |
  |  +12 / -4 lines              |
  |                               |
  |  [ ] auth.ts:42              |
  |  Missing null check on       |
  |  user.session before          |
  |  accessing .token             |
  |                               |
  |  [*] Overall: Approve        |
  |  2 suggestions, 1 nit        |
  '-------------------------------'`,
				`  .----[ Rovo: Code Review ]-----.
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
  '-------------------------------'`,
			];

	}

	return null;
};
