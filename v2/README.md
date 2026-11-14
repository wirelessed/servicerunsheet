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
- **Backend**: [Firebase](https://firebase.google.com) — Firestore, Authentication (Google Sign-In, plus anonymous sessions for share-link viewers), Cloud Functions (Node 22)
- **Hosting**: Firebase Hosting
- **Styling**: Tailwind CSS + shadcn/ui components

## Project Structure

```
v2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.js             # Landing / dashboard
│   │   ├── runsheet/[id]/      # Runsheet viewer/editor
│   │   ├── runsheet/[id]/print/ # Print-friendly runsheet view
│   │   ├── share/[id]/         # Share link entry point
│   │   ├── group/[token]/      # Group share link page
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
│       ├── firebase.js         # Firebase initialization, callable wrappers, share-token generator
│       └── sharedRunsheet.js   # Live runsheet view for logged-out share-link visitors
├── functions/                  # Cloud Functions (share-link validation, public mirror)
├── firestore.rules             # Firestore security rules
├── firestore.indexes.json      # Composite indexes
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
| `shareToken` | string | | Secret for the share link (16 random chars; older runsheets have 6). Rotating it revokes existing links |

Only members can read this document. It is never sent to share-link visitors.

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

### `runsheets/{id}/public/meta` (subcollection, single doc)

Email-free copy of the runsheet for share-link visitors: `id`, `name`, `date`, `time`, `category`, `groupId`, `lastUpdated`, `orderCount`, `notes`. Written only by Cloud Functions (`syncRunsheetPublicMeta` keeps it in sync on every runsheet write). Readable by members and by visitors holding a viewer pass.

### `runsheets/{id}/viewers/{uid}` (subcollection)

Viewer passes for logged-out share-link visitors. Document ID = anonymous Firebase `uid`. Written only by `getSharedRunsheet`; not readable or writable by clients.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | The runsheet's `shareToken` at the time the pass was issued. The pass stops working when the runsheet's token changes |
| `createdAt` | timestamp | ✅ | When the pass was issued |

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

Personal reference collection for each user. Readable only by that user. It grants no access by itself; it is used to find legacy runsheets that still need migrating to `memberEmails`.

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
| `shareToken` | string | | Secret for the group share link |

Readable by any signed-in user; only the creator can update or delete.

### `groupTokens` (top-level collection)

Legacy short tokens for group share URLs (`/group/{token}`). Document ID = token string. Not readable by clients; resolved only by the `getSharedGroup` function. Current links use `/group/{groupId}?token=…`.

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
              runsheets/{id}/public/meta        (email-free mirror, Cloud Functions only)
              runsheets/{id}/viewers/{uid}      (share-link viewer passes, Cloud Functions only)

groups/{id} ←──(groupId)── runsheets/{id}
    ↑
groupTokens/{token} ──(groupId)──→ groups/{id}
```

## Role System

Four roles with hierarchical permissions:

| Role | Read | Edit Metadata | Edit Programme | Log Transitions | Share | Archive / Move | Delete |
|------|------|---------------|----------------|-----------------|-------|----------------|--------|
| **Owner** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Ops** | ✅ | ❌ | `duration` / `originalDuration` only | ✅ | ❌ | ✅ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

- Ops cannot create or delete programme items, and cannot change any field other than `duration` and `originalDuration`
- "Archive / Move" means changing `category` or `groupId`, which any member may do
- Roles are stored in three locations kept in sync: `runsheets/{id}.roles`, `runsheets/{id}/users/{email}`, and `users/{email}/runsheets/{id}`. The rules read the role from `runsheets/{id}.roles` first and fall back to `runsheets/{id}/users/{email}` for legacy runsheets
- User identifier throughout is `email` (not Firebase UID)
- Enrollment: opening a valid share link or group link while signed in adds the user as `viewer`. This is done server-side by Cloud Functions; clients cannot add themselves

## Share Links

Share tokens are checked server-side. A client never receives a runsheet unless it is a member or presents a valid token.

| Link | Format | Validated by |
|------|--------|--------------|
| Runsheet | `/share/{id}?token={shareToken}` or `/runsheet/{id}?token=…` | `getSharedRunsheet` |
| Group | `/group/{groupId}?token={shareToken}` | `getSharedGroup` |
| Legacy group | `/group/{token}` | `getSharedGroup` (via `groupTokens`) |

A group token is also accepted for any runsheet in that group.

**Signed-in visitor:** the function enrolls them as `viewer`, after which the app uses normal member listeners.

**Logged-out visitor:**

1. The app signs in anonymously (invisible; `AuthContext` treats anonymous sessions as logged out).
2. `getSharedRunsheet` validates the token and writes a viewer pass at `runsheets/{id}/viewers/{uid}`.
3. The app listens live to `runsheets/{id}/programme` and `runsheets/{id}/public/meta`. Neither contains emails.
4. If anonymous sign-in is disabled, the app falls back to refetching through the function every 30 seconds.

Rotating a runsheet's `shareToken` invalidates every outstanding viewer pass for it.

### Cloud Functions

| Function | Type | Purpose |
|----------|------|---------|
| `getSharedRunsheet` | callable | Validates a runsheet or group token; returns display fields and programme; enrolls signed-in callers; issues viewer passes to anonymous callers |
| `getSharedGroup` | callable | Validates a group token (or group ownership); returns the group name and its runsheets' list fields; enrolls signed-in callers in every runsheet of the group |
| `syncRunsheetPublicMeta` | Firestore trigger | Mirrors the email-free fields of `runsheets/{id}` into `runsheets/{id}/public/meta` |

The callables never return `memberEmails`, `roles`, `shareToken` or `createdBy`.

## Dashboard Data Loading

- The dashboard listens only to **upcoming** runsheets (`memberEmails` contains the user and `date` is yesterday or later). Past and archived runsheets load on demand: when Past, Archive, a group or search is opened, or when a runsheet in a group is opened. This needs the composite index in `firestore.indexes.json`; without it the app falls back to one listener for everything.
- The runsheet page reuses the dashboard's copy of a runsheet when it has one, instead of opening a second listener.
- Groups are refetched only when the set of group IDs changes.
- The `localStorage` cache holds list fields only (no `notes`).
- Reordering writes only the programme items whose position changed.

## Firestore Security Rules

Security rules are defined in [`firestore.rules`](firestore.rules) and enforce:

- **No public reads** — nothing is readable without authentication
- **Members-only runsheets** — a runsheet, its programme and its users are readable only by members (email in `memberEmails`, or a `runsheets/{id}/users/{email}` doc for legacy runsheets). Queries must filter on the caller's own email
- **Share-link visitors** — an anonymous session with a valid viewer pass may read `programme` and `public/meta` only
- **Role-based writes** — owners/editors can modify runsheet data, programme items and collaborators
- **Ops restrictions** — ops users can only update `duration` and `originalDuration` on existing programme items
- **Member moves** — any member may change `category` and `groupId`
- **No self-enrollment** — clients cannot add themselves to a runsheet; enrollment happens in Cloud Functions after token validation
- **Creation** — a new runsheet must list only its creator in `memberEmails`, with role `owner`
- **Groups** — readable by signed-in users; only the creator can update or delete
- **Server-only collections** — `groupTokens` (read), `public/meta` (write) and `viewers` are closed to clients

The rules do not validate field types or sizes.

### Deploying Rules

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project servicerunsheet
```

### Dry-Run (validate without deploying)

```bash
npx -y firebase-tools@latest deploy --only firestore:rules --project servicerunsheet --dry-run
```

## Deployment

Prerequisites: the Blaze plan (for Cloud Functions) and **Anonymous** sign-in enabled under Authentication → Sign-in method.

Firestore rules, indexes and functions are shared by every hosted site of the project, so they affect production as soon as they deploy. Deploy in this order:

```bash
# 1. Functions and indexes
cd functions && npm install && cd ..
npx -y firebase-tools@latest deploy --only functions,firestore:indexes --project servicerunsheet

# 2. The client
npm run build
npx -y firebase-tools@latest deploy --only hosting --project servicerunsheet

# 3. Rules (last: older clients rely on reads the new rules deny)
npx -y firebase-tools@latest deploy --only firestore:rules --project servicerunsheet
```

### Beta Channel

```bash
npx -y firebase-tools@latest hosting:channel:deploy runsheetprobeta --expires 30d
```

### Security

- Server-side share links: tokens are validated in Cloud Functions; runsheet data, member emails and tokens are never sent to a client that hasn't proven access.
- Members-only Firestore rules: no public reads; writes are limited by role.
- Client-side role checks: the UI checks roles before firing state mutations or Firestore calls. These are for UX only; the rules are the enforcement.
- XSS sanitization: user-generated HTML rendered via `dangerouslySetInnerHTML` is sanitized with isomorphic-dompurify.
- Clickjacking & MIME protection: `X-Frame-Options` and `X-Content-Type-Options` headers are set in `firebase.json`.
- Share tokens are generated with `crypto.getRandomValues` (16 characters). Tokens created before this change are 6 characters and were publicly readable; rotate them.
