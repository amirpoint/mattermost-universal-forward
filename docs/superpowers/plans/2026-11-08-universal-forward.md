# Universal Forward Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A webapp-only Mattermost plugin that adds "Forward to…" to the "..." menu of every post (channel, search, Saved, Mentions, RHS), sending a permalink or a text copy.

**Architecture:** `index.tsx` registers the menu action and a root modal. Pure functions (`decideMode`, `buildCopyMessage`) hold the decisions. A thin `api.ts` wraps `/api/v4` with `fetch` using the logged-in user's session and CSRF token. `forwardPost` orchestrates; `ForwardModal` is the UI.

**Tech Stack:** TypeScript, React, webpack, Jest (+ React Testing Library), Mattermost plugin webapp registry.

**Spec:** `docs/superpowers/specs/2026-11-08-universal-forward-design.md`

## Global Constraints

- Target server: Mattermost Enterprise 10.5.2, self-hosted.
- Webapp only: no server component, `plugin.json` has no `server` section.
- All API calls use the current user's session; no bot or admin tokens.
- Menu item text: `Forward to…`.
- Link vs copy rules (spec §3):
  - DM destination: permalink iff the other user is a member of the source channel, else copy.
  - Channel destination: permalink iff the source channel is public (`type "O"`) and in the same team as the destination; else copy (source private, DM or GM).
- Copy format: `> <message>` then the line `فوروارد از @<username> در ~<channel name>، <YYYY-MM-DD HH:mm>`.
- Attachments are never copied; names are listed in the text.
- Errors from the server are shown in the modal and the modal stays open.

## Review Focus

- System/deleted posts (`post.type` non-empty or `delete_at > 0`): menu item must not appear.
- Post with empty message and only files: copy must still produce sensible text (the file names).
- Copy longer than 16383 chars (Mattermost post limit): must be truncated with `…`, not rejected.
- Destination channel archived or user cannot post: server error shown in modal, no crash.
- Copied text containing `@channel`, `@all`, `@here`: must not notify (neutralized).

---

### Task 1: Scaffold and menu smoke test (de-risk)

**Files:**
- Create: `plugin.json`, `webapp/package.json`, `webapp/tsconfig.json`, `webapp/webpack.config.js`, `webapp/jest.config.js`, `webapp/src/index.tsx`, `.gitignore`, `Makefile` (target `dist` builds `dist/com.example.universal-forward.tar.gz`)

**Interfaces:**
- Produces: `Plugin` class in `index.tsx` with `initialize(registry, store)`; plugin id `com.example.universal-forward`.

- [ ] **Step 1:** Scaffold the files, copying the structure of `mattermost-plugin-starter-template` webapp (no server). `plugin.json` has `id`, `name`, `min_server_version: "10.5.0"`, `webapp.bundle_path: "main.js"`. Externals in webpack: `react`, `react-dom`, `redux`, `react-redux`, `react-bootstrap`.
- [ ] **Step 2:** In `initialize`, call `registry.registerPostDropdownMenuAction('Forward to…', post => alert(post.id), post => !post.type && !post.delete_at)`.
- [ ] **Step 3:** `cd webapp && npm install && npm run build`. Expected: `dist/main.js` created without errors.
- [ ] **Step 4:** Package, upload via System Console → Plugins → Upload, enable. Manually verify the "Forward to…" item shows and alerts a post id in: a channel, search results, Saved messages, Mentions, an open thread in RHS.
- [ ] **Step 5:** Record results in `docs/superpowers/notes/menu-smoke.md`. **If any location lacks the item, stop and report to the user before continuing** (spec §1 risk).
- [ ] **Step 6:** Commit `feat: scaffold webapp plugin with menu smoke action`.

### Task 2: `decideMode`

**Files:**
- Create: `webapp/src/decideMode.ts`
- Test: `webapp/src/decideMode.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Mode = 'permalink' | 'copy';
  type Dest = {kind: 'dm'; userIsSourceMember: boolean} | {kind: 'channel'; teamId: string};
  decideMode(source: {type: string; teamId: string}, dest: Dest): Mode
  ```

- [ ] **Step 1:** Write failing tests in `decideMode.test.ts`: DM + member → `permalink`; DM + non-member → `copy`; channel dest, source `O` same team → `permalink`; source `O` different team → `copy`; source `P` → `copy`; source `D` → `copy`; source `G` → `copy`.
- [ ] **Step 2:** Run `npx jest decideMode`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement `decideMode` per Global Constraints.
- [ ] **Step 4:** Run `npx jest decideMode`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add link-vs-copy decision`.

### Task 3: `buildCopyMessage`

**Files:**
- Create: `webapp/src/buildCopyMessage.ts`
- Test: `webapp/src/buildCopyMessage.test.ts`

**Interfaces:**
- Produces:
  ```ts
  buildCopyMessage(input: {message: string; username: string; channelName: string; createAt: number; fileNames: string[]; note?: string}): string
  ```
  Output order: optional `note`, quoted message, file names line, source line. Max length 16383.

- [ ] **Step 1:** Failing tests: (a) `"hi"` → contains `> hi` and `فوروارد از @ali در ~town-square، 2026-11-08 10:30` (fix the timezone with `TZ=UTC` in jest config and `createAt` accordingly); (b) multi-line message: every line is prefixed with `> `; (c) empty message with `fileNames: ['a.pdf']` → contains `a.pdf`, no empty `> ` line; (d) `@channel`, `@all`, `@here` become `@​channel` etc. (zero-width space after `@`); (e) 20000-char message → result length ≤ 16383 and ends the quoted part with `…`, source line still present; (f) `note` appears first.
- [ ] **Step 2:** Run `npx jest buildCopyMessage`. Expected: FAIL.
- [ ] **Step 3:** Implement `buildCopyMessage`. Truncate the quoted message only, reserving room for the other lines.
- [ ] **Step 4:** Run `npx jest buildCopyMessage`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add copy message builder`.

### Task 4: API layer

**Files:**
- Create: `webapp/src/api.ts`
- Test: `webapp/src/api.test.ts`

**Interfaces:**
- Produces (all throw `Error(message_from_server)` on non-2xx; all send `X-Requested-With: XMLHttpRequest` and `X-CSRF-Token` from the `MMCSRF` cookie, `credentials: 'same-origin'`):
  ```ts
  getChannel(id: string): Promise<{id; type; team_id; name; display_name}>
  getTeam(id: string): Promise<{id; name}>
  getUserIsChannelMember(channelId: string, userId: string): Promise<boolean>   // 404 → false
  searchChannels(term: string): Promise<Channel[]>      // user's channels, via /users/{me}/channels filtered client-side by term
  searchUsers(term: string): Promise<User[]>            // POST /users/search
  createDirectChannel(userId: string): Promise<Channel> // POST /channels/direct [me, userId]
  createPost(channelId: string, message: string): Promise<Post>
  getFileNames(postId: string): Promise<string[]>       // GET /posts/{id}/files/info
  ```

- [ ] **Step 1:** Failing tests with `global.fetch` mocked: header/CSRF present on a call; non-2xx throws the server `message`; `getUserIsChannelMember` returns false on 404 and true on 200; `createPost` posts `{channel_id, message}`.
- [ ] **Step 2:** Run `npx jest api`. Expected: FAIL.
- [ ] **Step 3:** Implement with one internal `request(path, init)` helper.
- [ ] **Step 4:** Run `npx jest api`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add API layer`.

### Task 5: `forwardPost` orchestrator

**Files:**
- Create: `webapp/src/forwardPost.ts`
- Test: `webapp/src/forwardPost.test.ts`

**Interfaces:**
- Consumes: Tasks 2–4.
- Produces:
  ```ts
  type Target = {kind: 'channel'; channel: Channel} | {kind: 'user'; user: User};
  planForward(post: Post, target: Target): Promise<{mode: Mode; destChannelId: string | null}>
  forwardPost(post: Post, target: Target, note: string, siteUrl: string): Promise<{mode: Mode}>
  ```
  `planForward` resolves the mode without sending (used by the modal to show the copy warning). `destChannelId` is null for a user target with no existing DM until send. `forwardPost` creates the DM if needed, then `createPost` with: permalink mode → `[note\n]${siteUrl}/${teamName}/pl/${post.id}`; copy mode → `buildCopyMessage(...)` (author username and channel name from API/store lookups passed through `getChannel`; username via `GET /users/{id}`, add `getUser` to `api.ts` with its test in this task).

- [ ] **Step 1:** Failing tests with `api` mocked: DM target member → permalink body contains `/pl/<id>` and team name; DM target non-member → copy body contains `> `; channel target public same team → permalink; private source → copy; DM target without DM channel → `createDirectChannel` called once before `createPost`; `createPost` rejection propagates the error message.
- [ ] **Step 2:** Run `npx jest forwardPost`. Expected: FAIL.
- [ ] **Step 3:** Implement both functions; `planForward` uses `getChannel(post.channel_id)`, `getUserIsChannelMember` for user targets, and `decideMode`.
- [ ] **Step 4:** Run `npx jest forwardPost`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: add forward orchestrator`.

### Task 6: `ForwardModal` and wiring

**Files:**
- Create: `webapp/src/ForwardModal.tsx`, `webapp/src/modalState.ts` (tiny open/close store: `openForward(post)`, subscription for the root component)
- Modify: `webapp/src/index.tsx` (replace the smoke alert with `openForward(post)`; `registerRootComponent(ForwardModal)`; filter keeps `!post.type && !post.delete_at`)
- Test: `webapp/src/ForwardModal.test.tsx`

**Interfaces:**
- Consumes: `searchChannels`, `searchUsers`, `planForward`, `forwardPost`.
- Produces: `ForwardModal` (no props, driven by `modalState`).

- [ ] **Step 1:** Failing tests (RTL, `api`/`forwardPost` mocked): typing in the search box lists channel and user results; selecting a result enables Send; selecting a target whose plan is `copy` shows the warning text `متن پیام کپی می‌شود (گیرنده به کانال مبدأ دسترسی ندارد)`; Send calls `forwardPost` with the note and closes the modal; when `forwardPost` rejects with `"no permission"`, that text is shown and the modal stays open.
- [ ] **Step 2:** Run `npx jest ForwardModal`. Expected: FAIL.
- [ ] **Step 3:** Implement the modal (debounced search ≥ 2 chars, optional note textarea, Send/Cancel). `siteUrl` from `window.location.origin`.
- [ ] **Step 4:** Run `npx jest`. Expected: all suites PASS.
- [ ] **Step 5:** `npm run build`, package, upload to the 10.5.2 server. Manually verify, for each of channel, search, Saved, Mentions, RHS: forward to a DM and to a channel in both permalink and copy modes (private source → copy), plus the Review Focus cases (system post has no item; file-only post; archived destination shows error; `@channel` in a copied message does not notify).
- [ ] **Step 6:** Commit `feat: add forward modal and wire up menu action`.
