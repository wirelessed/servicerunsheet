# Service Runsheet Pro

A collaborative runsheet management app built with Next.js and Firebase. Create, share, and operate runsheets in real-time with role-based access control.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (static export via `output: 'export'`)
- **Backend**: [Firebase](https://firebase.google.com) — Firestore, Authentication (Google Sign-In)
- **Hosting**: Firebase Hosting
- **Styling**: Tailwind CSS + shadcn/ui components

## Project Structure

```
v2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.js             # Landing / dashboard
│   │   ├── runsheet/[id]/      # Runsheet viewer/editor
│   │   ├── share/[id]/         # Share link entry point
│   │   ├── group/[token]/      # Public group page
│   │   ├── print/              # Print-friendly runsheet view
│   │   └── feedback/           # Feedback page (Userback widget)
│   ├── components/
│   │   └── Runsheet/           # Core components
│   │       ├── RunsheetEditor.js   # Main editor with drag-and-drop
│   │       ├── RunsheetList.js     # Dashboard list view
│   │       ├── AdvancedGrid.js     # Grid editing mode
│   │       ├── ShareDialog.js      # Quick share modal
│   │       ├── ShareTab.js         # Full share management
│   │       ├── NotesTab.js         # Rich text notes editor
│   │       └── SidebarFooter.js    # Shared sidebar footer component
│   ├── context/
│   │   ├── AuthContext.js      # Firebase Auth provider
│   │   └── DashboardContext.js # Dashboard state & Firestore queries
│   └── lib/
│       └── firebase.js         # Firebase initialization
├── functions/                  # Cloud Functions
├── firestore.rules             # Firestore security rules
└── firebase.json               # Firebase project configuration
```

## Firestore Data Model

### `runsheets` (top-level collection)

Main runsheet documents.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Runsheet title (max 500 chars) |
| `date` | string | | ISO date string (e.g. `"2026-07-05"`) |
| `time` | string | | 24h time string (e.g. `"0900"`) |
| `category` | string | ✅ | `"active"` or `"archive"` |
| `groupId` | string \| null | | FK to `groups` collection |
| `orderCount` | number | | Legacy ordering field |
| `lastUpdated` | string | | ISO timestamp from `moment().format()` |
| `notes` | string | | HTML content from TipTap rich text editor |
| `memberEmails` | array\<string\> | ✅ | All member email addresses (used for querying) |
| `roles` | map | ✅ | `{ "email@example.com": "owner" }` — email → role mapping |

### `runsheets/{id}/programme` (subcollection)

Individual programme line items within a runsheet.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | | Item title (max 1000 chars) |
| `remarks` | string | | Description — HTML or plain text (max 10000 chars) |
| `duration` | number | | Duration in minutes |
| `originalDuration` | number | | Planned duration (set by ops logging) |
| `location` | string | | Location text (max 500 chars) |
| `links` | array | | Link objects: `[{ name, url, emoji }]` (max 20) |
| `orderCount` | number | | Sort order (0-based index) |

### `runsheets/{id}/users` (subcollection)

Membership records. Document ID = email address.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Email address (same as doc ID) |
| `email` | string | ✅ | Email address |
| `role` | string | ✅ | `"owner"`, `"editor"`, `"ops"`, or `"viewer"` |
| `addedAt` | string | | ISO date string |
| `addedBy` | string | | Email of who added them |

### `users/{email}/runsheets` (top-level, keyed by email)

Personal reference collection for each user. Used by the dashboard to quickly list runsheets.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Runsheet ID (same as doc ID) |
| `role` | string | | Role string |
| `sharedBy` | string | | Email of who shared it |
| `sharedAt` | string | | ISO date string |

### `groups` (top-level collection)

Runsheet groups for organization.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Group name (max 200 chars) |
| `createdBy` | string | ✅ | Email of the creator |
| `createdAt` | string | | ISO date string |
| `archived` | bool | | `true` if archived |

### `groupTokens` (top-level collection)

Short tokens for friendly group share URLs. Document ID = token string. Read-only from client.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `groupId` | string | ✅ | FK to `groups` collection |

### Data Flow Diagram

```
users/{email}/runsheets/{runsheetId}  ←→  runsheets/{id}/users/{email}
         ↕                                          ↕
    (personal ref)                           (role assignment)
                            ↕
                   runsheets/{id}
                  (main document with
                   memberEmails[] + roles{})
                            ↕
              runsheets/{id}/programme/{itemId}

groups/{id} ←──(groupId)── runsheets/{id}
    ↑
groupTokens/{token} ──(groupId)──→ groups/{id}
```

## Role System

Four roles with hierarchical permissions:

| Role | Read | Edit Metadata | Edit Programme | Log Transitions | Share | Delete |
|------|------|---------------|----------------|-----------------|-------|--------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Ops** | ✅ | ❌ | Duration only | ✅ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

- Roles are stored in three locations kept in sync: `runsheets/{id}.roles`, `runsheets/{id}/users/{email}`, and `users/{email}/runsheets/{id}`
- User identifier throughout is `email` (not Firebase UID)
- Auto-enrollment: visiting a runsheet or share link while authenticated grants `viewer` access

## Firestore Security Rules

Security rules are defined in [`firestore.rules`](firestore.rules) and enforce:

- **Authentication** — all write operations require login
- **Role-based writes** — only owners/editors can modify runsheet data
- **Ops restrictions** — ops users can only update `duration` and `originalDuration`
- **Self-enrollment control** — users can only add themselves as `viewer`
- **Data validation** — field types, sizes, and allowed values checked on every write
- **Schema enforcement** — only defined fields are allowed, no arbitrary data
- **Public reads** — runsheets, programme, groups, and group tokens are publicly readable (supports print pages, share links, and group pages without authentication)

### Deploying Rules

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project servicerunsheet
```

### Dry-Run (validate without deploying)

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project servicerunsheet --dry-run
```

## Deployment

### Production (Firebase Hosting)

```bash
npm run build
npx -y firebase-tools@latest deploy --only hosting --project servicerunsheet
```

### Beta Channel

```bash
npx -y firebase-tools@latest hosting:channel:deploy runsheetprobeta --expires 30d
```

### Full Deploy (hosting + rules)

```bash
npm run build
npx -y firebase-tools@latest deploy --project servicerunsheet
```