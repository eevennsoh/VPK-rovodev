# VPK Sync Configuration

## `.vpk-sync.json`

Created by init, stores sync preferences (gitignored):

```json
{
  "upstream": {
    "url": "https://github.com/eevennsoh/VPK",
    "defaultBranch": "main"
  },
  "sync": {
    "strategy": "merge",
    "excludePaths": []
  },
  "push": {
    "useFork": false,
    "forkRemote": "origin"
  }
}
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `upstream.url` | - | Upstream repository URL |
| `upstream.defaultBranch` | `main` | Branch to sync with |
| `sync.strategy` | `merge` | `merge` or `rebase` |
| `sync.excludePaths` | `[]` | Additional paths to exclude |
| `push.useFork` | `false` | Push via fork instead of direct |
| `push.forkRemote` | `origin` | Remote name for fork |

## Default Upstream URL

The default upstream URL is `https://github.com/eevennsoh/VPK`. You can change this during init or by editing `.vpk-sync.json` directly.

## Excluded Paths

The following paths are always excluded from sync operations (in addition to `sync.excludePaths`):

- Credentials: `.env*`, `.asap-config`, `*.pem`, `*.key`
- Deployment: `.deploy.local`, `service-descriptor.yml`
- Personal config: `*.local.md`, `*.local.json`, `.vpk-sync.json`
- Build artifacts: `node_modules/`, `.next/`, `out/`
