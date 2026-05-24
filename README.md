# Duolingo Helper for Cinnamon

A maintained local fork of the Cinnamon applet `duolingo-helper@nodeengineer.com`.

This version removes the obsolete Duolingo password login flow and reads public profile statistics from:

```text
https://www.duolingo.com/2017-06-30/users?username=<username>
```

It is designed for Cinnamon 6.x and was tested locally on Cinnamon 6.6.7.

## Features

- No Duolingo password is requested or stored.
- Multiple instances can be added to Cinnamon panels.
- Multiple Duolingo usernames can be configured.
- Optional aliases can replace usernames in the displayed applet text.
- One configured user can be marked as `Me / Self`.
- Configured users can be highlighted in the applet menu and optionally marked in the hover tooltip.
- Configure user sorting by configured order, alias/name, streak, or total XP.
- Configure the panel label separately: compact summary, user count, total streak, total XP, only your own values, or nothing.
- Right-click the panel applet and choose `Settings` to edit users. The label is translated by Cinnamon.
- Configure what the hover tooltip shows: nothing, summary, only yourself, course details, account details, or all details.
- Configure what the left-click menu shows with the same display modes, plus profile links and manual refresh. The default is to show no statistics on click.
- Hovering a user in the left-click menu shows that user's XP and streak share of the loaded team.
- Refreshes automatically every 5 minutes.

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
<loaded-users> | <sum-of-streaks>
```

Example:

```text
3 | 42
```

## Activity Applet

This repository also contains a second small applet:

```text
duolingo-activity@nodeengineer.com
```

It also supports multiple Cinnamon panel instances.

It keeps its own user list in Cinnamon settings and checks only the `hasRecentActivity15` field every 5 minutes. If Duolingo reports a configured user as active, the tooltip shows:

```text
<User> is playing Duolingo right now!
```

The German translation is:

```text
<User> zockt gerade Duolingo!
```

The field name suggests activity in roughly a 15-unit window, but Duolingo does not document whether that means 15 minutes, 15 days, or another internal rule. Treat it as Duolingo's own "recent activity" signal, not as a precise real-time presence indicator.

Install it locally with:

```bash
./install-activity-local.sh
```

## Install

Clone the repository and run the local installer:

```bash
git clone https://github.com/H234598/duolingo-helper-cinnamon.git
cd duolingo-helper-cinnamon
./install-local.sh
```

Then reload Cinnamon:

```text
Alt+F2, r, Enter
```

Add or enable the applet from Cinnamon's applet settings if it is not already in the panel.

## Configure

1. Right-click the Duolingo Helper applet in the Cinnamon panel.
2. Click `Settings`.
3. Choose what should be shown when hovering over the applet.
4. Choose what should be shown when clicking the applet.
5. Choose what should be shown in the panel itself.
6. Choose the user sort order.
7. Add one row per Duolingo username.
8. Optionally set an alias for any row.
9. Mark one row as `Me / Self` when using the `Me: ...` display modes.
10. Enable highlighting for rows that should stand out in the click menu.
11. Optionally enable hover highlighting for highlighted rows.
12. Enable the rows you want to fetch.

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
- Added a `Me / Self` user marker and "only me" display modes.
- Added highlighted users in the applet menu.
- Added optional hover-tooltip markers for highlighted users.
- Added a dedicated translated right-click settings item.
- Added hover tooltip statistics.
- Added configurable hover and click display modes.
- Added configurable panel label modes.
- Added configurable user sorting.
- Added team-share tooltips for user entries in the applet menu.
- Added profile links from the user entries in the applet menu.
- Added current public profile endpoint support.
- Fixed Cinnamon 6 / Soup 3 compatibility issues while refactoring.
- Added gettext-based translations for all applet and settings text.

## Caveats

This applet uses an unofficial public Duolingo endpoint. Duolingo can change or remove it without notice.

If a configured username shows an error, verify that the profile exists and that the username is public.

## Repository Layout

```text
files/duolingo-helper@nodeengineer.com/
  applet.js
  metadata.json
  settings-schema.json
  stylesheet.css
  *.png
  po/
install-local.sh
install-activity-local.sh
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
