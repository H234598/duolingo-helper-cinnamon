# Duolingo Helper for Cinnamon

A maintained local fork of the Cinnamon Duolingo helper applet.

This version removes the obsolete Duolingo password login flow and reads public profile statistics from:

```text
https://www.duolingo.com/2017-06-30/users?username=<username>
```

It is designed for Cinnamon 6.x and was tested locally on Cinnamon 6.6.7.
Successful Duolingo API responses are cached per applet under `~/.cache/duolingo-helper@H234598/` and `~/.cache/duolingo-activity@H234598/`. Cached values are reused per user if the API temporarily returns an error or cannot be parsed.

## Features

- No Duolingo password is requested or stored.
- Optional authenticated lookup for one local user can be enabled through `~/.config/duolingo-helper@H234598/auth.json`.
- Multiple instances can be added to Cinnamon panels.
- Multiple Duolingo usernames can be configured.
- Optional aliases can replace usernames in the displayed applet text.
- Users can be marked as `Standalone` so they are the only users shown when the hover or click menu is limited to Standalone users.
- Individual users can be marked as `Simmulate active` to display them as online for local testing.
- Configured users can be highlighted in the applet menu and optionally marked in the hover tooltip.
- Configured and active users can be highlighted separately in hover tooltips and in the click menu.
- Duolingo activity monitoring is integrated into the helper: active users are detected from `hasRecentActivity15`, highlighted in multi-user hover/click views, and grouped before inactive users.
- Last-seen timestamps are cached and shown below the team-share tooltip in the click menu. The time is shown only while the timestamp is from today and at most 10 hours old; older entries show the date only.
- Activity-based display can be disabled. In that mode, active/offline grouping is skipped; lists use the configured sort first and last-seen as the next tie-breaker. Online detection, last-seen cache updates, active counts, automatic icons, and panel hiding continue to work.
- Configure user sorting by configured order, alias/name, streak, or total XP. With activity-based display enabled, multi-user hover/click lists group active users before inactive users, then apply this configured sort order, then use the full last-seen timestamp as a final tie-breaker.
- Configure the panel label separately: compact user/streak/online summary, user count, total streak, total XP, only your own values, or nothing.
- Configure the panel icon from bundled Duolingo SVG variants. `Automatic` uses activity thresholds: rounded avatar through 50% online, round avatar above 50%, avatar mask above 75%, and Duoplatt above 90%. In automatic mode, if the first `Standalone` user is online, the growth-chart Duo icon overrides the threshold icon. `Random` chooses one bundled icon immediately when selected and then once per hour.
- When a user newly becomes active or inactive, the applet briefly shows a small rising speech bubble above the panel icon. Online/offline bubble text is configurable and supports `$user` and `$count`.
- Optionally hide the applet while no configured user is active.
- Right-click the panel applet and choose `Settings` to edit users. The label is translated by Cinnamon.
- Configure what the hover tooltip shows: nothing, summary, only yourself, course details, account details, or all details.
- Configure what the left-click menu shows with the same display modes, plus profile links and manual refresh. The default is course details for `Standalone` users.
- Hovering a user in the left-click menu shows that user's XP and streak share of the loaded team, followed by `Last seen`.
- Long click menus keep user details in a large scrollable area so the top entries stay reachable.
- Refreshes automatically every minute. If cached data had to be used because the API failed, the next retry is scheduled after 30 seconds.

## Displayed Statistics

Duolingo no longer has meaningful "crowns" for current course progress. This applet shows values still exposed by the current public profile endpoint:

- Streak in days
- Total XP
- XP in the current course
- Current course title
- All course titles, language directions, and XP
- Display name, join date, recent activity, email verification, profile country, live event count, and achievement count
- Duolingo Plus status when present
- Error state per configured username

The summary line intentionally does not show whether a user has Duolingo Plus.

The default panel label stays compact:

```text
<loaded-users> | <sum-of-streaks> | <active-users>
```

Example:

```text
3 | 42 | 1
```

## Activity Monitoring

The helper includes the tracker behavior. It checks the `hasRecentActivity15` field every minute. If Duolingo reports a configured user as active, multi-user hover and click lists place that user above inactive users and highlight the user row.

```text
<User> is playing Duolingo right now!
```

The German translation is:

```text
<User> zockt gerade Duolingo!
```

The field name suggests activity in roughly a 15-unit window, but Duolingo does not document whether that means 15 minutes, 15 days, or another internal rule. Treat it as Duolingo's own "recent activity" signal, not as a precise real-time presence indicator.

The standalone `duolingo-activity@H234598` applet remains in the repository for now, but the intended combined setup is to use `duolingo-helper@H234598`.

## Optional Authenticated Lookup

By default the helper uses Duolingo's public username endpoint without cookies. That is why it can see public profile fields, but not the much larger response Vivaldi shows while logged in.

To let the helper fetch one account with your logged-in Duolingo session, create this file:

```text
~/.config/duolingo-helper@H234598/auth.json
```

Example:

```json
{
  "username": "TeladiTheGreat",
  "cookie": "jwt_token=PASTE_DUOLINGO_JWT_TOKEN_OR_FULL_COOKIE_HERE",
  "headers": {}
}
```

Then restrict the file:

```bash
chmod 600 ~/.config/duolingo-helper@H234598/auth.json
```

The `username` in this file selects the configured user that should be fetched with the auth headers. All other configured users still use the public lookup. The applet also accepts a `cookies` object instead of a raw cookie string:

```json
{
  "username": "TeladiTheGreat",
  "cookies": {
    "jwt_token": "PASTE_DUOLINGO_JWT_TOKEN_HERE"
  },
  "headers": {}
}
```

Authenticated responses are parsed by a separate parser path. The helper shows an authenticated marker plus counts for visible fields and experiment entries, but it does not write the full authenticated raw response into the cache. The cache keeps only the normal display fields and aggregate experiment counts.

## Install

Clone the repository and run the local migration installer:

```bash
git clone https://github.com/H234598/duolingo-helper-cinnamon.git
cd duolingo-helper-cinnamon
./migrate-duolingo-uuids.sh
```

The migration installs both applets under the current UUIDs, copies existing Cinnamon settings from the legacy UUIDs, rewrites enabled panel entries, and stores a backup under:

```text
~/.local/share/duolingo-helper-cinnamon-migration/
```

Then reload Cinnamon if the script did not already make the applets appear:

```text
Alt+F2, r, Enter
```

Add or enable the applet from Cinnamon's applet settings if it is not already in the panel.

## Configure

1. Right-click the Duolingo Helper applet in the Cinnamon panel.
2. Click `Settings`.
3. Choose whether hovering should show all users or only `Standalone` users.
4. Choose what detail level should be shown when hovering over the applet.
5. Choose whether clicking should show all users or only `Standalone` users.
6. Choose what detail level should be shown when clicking the applet.
7. Choose what should be shown in the panel itself.
8. Choose the user sort order.
9. Add one row per Duolingo username.
10. Optionally set an alias for any row.
11. Mark rows as `Standalone` when using the Standalone-only hover or click switches.
12. Enable highlighting for rows that should stand out in the click menu.
13. Optionally enable hover highlighting for highlighted rows.
14. Enable the rows you want to fetch.

Use the Duolingo username, not the email address.
Aliases are display-only; profile links still open the configured Duolingo username.

Clicking a loaded user in the applet menu opens that user's Duolingo profile.

## What Changed From The Original Applet

- Removed the old `https://www.duolingo.com/login` password flow.
- Removed Secret Service credential storage.
- Removed crown-based display.
- Added Cinnamon settings via `settings-schema.json`.
- Made Cinnamon's Applets settings page expose the applet configuration.
- Allowed multiple applet instances.
- Added multi-user support.
- Added display aliases for configured users.
- Added a `Standalone` user marker and Standalone-only display modes.
- Added highlighted users in the applet menu.
- Added optional hover-tooltip markers for highlighted users.
- Added a dedicated translated right-click settings item.
- Added hover tooltip statistics.
- Added configurable hover and click display modes.
- Added configurable panel label modes.
- Added bundled Duolingo logo/icon assets and configurable panel icon selection.
- Added configurable user sorting.
- Added a custom helper settings user table so every user-column header can show its own tooltip.
- Added team-share tooltips for user entries in the applet menu.
- Added profile links from the user entries in the applet menu.
- Added current public profile endpoint support.
- Fixed Cinnamon 6 / Soup 3 compatibility issues while refactoring.
- Added gettext-based translations for all applet and settings text.

## Caveats

This applet uses an unofficial public Duolingo endpoint. Duolingo can change or remove it without notice.

If a configured username shows an error, verify that the profile exists and that the username is public.
If the endpoint is temporarily unavailable, the applets fall back to the last cached response for each user, mark the tooltip with `Using cached Duolingo data`, and retry after 30 seconds until live API data is available again.

## Repository Layout

```text
config/
  duolingo-helper.conf
  duolingo-activity.conf
  duolingo-helper-auth.example.json
files/duolingo-helper@H234598/
  applet.js
  SettingsLogo.py
  UsersTable.py
  metadata.json
  settings-schema.json
  stylesheet.css
  assets/
  *.png
  po/
files/duolingo-activity@H234598/
install-local.sh
install-activity-local.sh
migrate-duolingo-uuids.sh
sync-to-cinnamon-spices.sh
```

## Sync To Cinnamon Spices Fork

To mirror this standalone applet into a local checkout of `cinnamon-spices-applets`:

```bash
./sync-to-cinnamon-spices.sh ~/cinnamon-spices-applets
```

The sync script copies applet code, settings, metadata, and translations, removes the standalone-only `last-edited` metadata field, writes a Cinnamon Spices README, and runs JSON, `msgfmt`, and `git diff --check` validation.

## Validation

Local validation performed:

- Confirmed the current public Duolingo profile endpoint returns `200 OK`.
- Reloaded the applet through Cinnamon D-Bus.
- Confirmed Cinnamon installed the settings schema.
- Compiled translation files with `msgfmt`.
- Checked `~/.xsession-errors` for new JavaScript load errors after reload.
