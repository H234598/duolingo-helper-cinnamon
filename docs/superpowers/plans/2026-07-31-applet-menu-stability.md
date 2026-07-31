# Persistent Applet Menu Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give both Duolingo applets persistent menu-row pools, current mutable callbacks, a visible 200-user limit, and complete per-instance HTTP cancellation.

**Architecture:** Each popup owns a static root/footer and a grow-only dynamic row-slot pool. Current data is converted to descriptors that update slots in place; request batches are tracked and cancelled independently per applet instance.

**Tech Stack:** Cinnamon GJS JavaScript, PopupMenu/St actors, libsoup 2/3, Gio.Cancellable, pytest, Node `vm` behavioral harness.

## Global Constraints

- Work only in `/home/teladi/codex_worktrees/duolingo_helper_cinnamon/applet_stability` on `codex/applet-stability`.
- Never modify, delete, or stage untracked `backups/` or `config/`.
- Write and witness behavioral RED tests before changing production code.
- Preserve existing filtering, sorting, grouping, styles, tooltips, actions, and footer behavior.
- Render at most 200 users per applet view after filtering/sorting; metadata rows do not consume the cap.
- Show `<N> weitere Benutzer nicht angezeigt` with the actual omitted count.
- Do not push, merge, or deploy.

---

### Task 1: Persistent menu behavior and current callbacks

**Files:**
- Modify: `tests/test_applet_stability.py`
- Modify: `files/duolingo-helper@H234598/applet.js`
- Modify: `files/duolingo-activity@H234598/applet.js`

**Interfaces:**
- Produces: `createMenuRowSlot(section)`, `renderMenuRows(descriptors)`, `syncMenu()`, mutable slot fields `currentUsername` and `currentAction`.
- Consumes: existing display-line, grouping, tooltip, profile, and configuration helpers.

- [ ] **Step 1: Write failing actor-identity and current-callback tests**

  Exercise each real applet prototype with persistent menu doubles. Render user
  `old-user`, retain the first slot actor and activation handler, render
  `new-user` while `menu.isOpen === true`, activate the retained slot, and assert
  identical actor/signal identity plus `new-user` as the opened profile.

- [ ] **Step 2: Run RED**

  Run `PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider tests/test_applet_stability.py -k 'persistent or open_menu' -vv` and require behavior failures caused by the current `removeAll`/captured-user implementation.

- [ ] **Step 3: Implement the persistent shell and slot renderer**

  Build dynamic section and footer once. A row slot owns label/separator actors,
  a single activation signal, mutable callback data, and optional tooltip.
  `syncMenu()` updates descriptors and hides excess slots without `removeAll()`.

- [ ] **Step 4: Run targeted GREEN**

  Re-run the Task 1 command and require all selected tests to pass.

### Task 2: Exact 200-user rendering boundary

**Files:**
- Modify: `tests/test_applet_stability.py`
- Modify: both applet JavaScript files listed in Task 1.

**Interfaces:**
- Produces: `MAX_VISIBLE_USERS = 200`, `limitVisibleUsers(users)` returning `{users, omittedCount}`, and truncation descriptors.
- Consumes: each applet's existing filtered/sorted display list.

- [ ] **Step 1: Write failing 200/201 tests**

  Render literal fixtures of 200 and 201 users through real `syncMenu()` methods.
  Assert 200 profile-enabled user slots in both cases, no notice for 200, and
  exactly `1 weitere Benutzer nicht angezeigt` for 201. Assert the pool contains
  no more than 200 user slots.

- [ ] **Step 2: Run RED**

  Run `PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider tests/test_applet_stability.py -k 'visible_user_limit' -vv` and require the uncapped implementation to fail.

- [ ] **Step 3: Implement post-filter/post-sort limiting**

  Cap user records before building detail/group metadata descriptors, preserve
  original user order, count omissions from the pre-cap view, and append the
  exact notice only when `omittedCount > 0`.

- [ ] **Step 4: Run targeted GREEN**

  Re-run the Task 2 command and require all boundary tests to pass.

### Task 3: Per-instance Soup request cancellation and teardown

**Files:**
- Modify: `tests/test_applet_stability.py`
- Modify: both applet JavaScript files listed in Task 1.

**Interfaces:**
- Produces: `beginRequestBatch()`, `trackSoup2Message(message)`, `untrackSoup2Message(message)`, `cancelPendingRequests()`, `requestCancellable` and `pendingSoup2Messages`.
- Consumes: the existing shared libsoup session and refresh-generation guards.

- [ ] **Step 1: Write failing cancellation and cleanup tests**

  Use real lifecycle methods with deterministic cancellable/message doubles.
  Assert Soup 2 cancellation receives every tracked message, Soup 3 cancellable
  is cancelled, a refresh replaces the batch, and teardown clears trackers,
  pooled tooltips, menu, manager, and settings.

- [ ] **Step 2: Run RED**

  Run `PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider tests/test_applet_stability.py -k 'request_batch or complete_teardown' -vv` and require missing lifecycle behavior to fail.

- [ ] **Step 3: Implement request ownership**

  Cancel the old batch before each refresh. Pass the current cancellable to Soup
  3, track each Soup 2 message before queueing, untrack it on callback, and cancel
  all outstanding work during teardown without aborting the shared session.

- [ ] **Step 4: Run targeted GREEN**

  Re-run the Task 3 command and require all selected tests to pass.

### Task 4: Regression and branch verification

**Files:**
- Verify all modified files.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: verified commit on `codex/applet-stability`.

- [ ] **Step 1: Run syntax and full tests**

  Run `node --check` for both applet files, followed by
  `PYTHONDONTWRITEBYTECODE=1 pytest -p no:cacheprovider -vv`.

- [ ] **Step 2: Verify repository hygiene**

  Run `git diff --check`, inspect `git diff --stat` and `git diff`, and confirm
  `git status --porcelain=v2 --branch` still lists untouched `backups/` and
  `config/` plus only intended tracked changes.

- [ ] **Step 3: Commit explicit paths only**

  Stage the two applet files, the behavioral tests, this plan, and its design
  document explicitly. Commit with `fix: pool Duolingo menus and cancel requests`.

- [ ] **Step 4: Verify committed state**

  Re-run the full suite, `git diff --check HEAD^..HEAD`, `git status`, and record
  the final SHA without pushing, merging, deploying, or touching untracked data.
