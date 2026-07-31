# Changelog

## 2026-05-25

- Renamed the local applet UUIDs to `duolingo-helper@H234598` and `duolingo-activity@H234598`.
- Added `migrate-duolingo-uuids.sh` to back up old Cinnamon settings, install the renamed applets, copy settings, and rewrite panel entries.
- Added bundled Duolingo SVG logo/icon assets and a logo image widget above both applets' settings.
- Added `Panel icon` selection to both applets.
- Added `Automatic` icon mode to the activity applet: normal Duo icon when users are active, `duoplatt.svg` when nobody is active.
- Fixed manual panel-icon selection so choosing a specific icon disables automatic switching.
- Removed the redundant manual `Duo icon` dropdown entry.
- Added browser-like request headers for Duolingo profile API calls to avoid HTTP 406 responses.
- Added per-user response caching and cache fallback when the Duolingo API fails.
- Added dynamic retry timing: cached fallback data schedules the next API check after 30 seconds, while live API data uses the normal 1-minute interval.
- Split script config and runtime cache paths so helper and activity applets run independently.
- Added persistent last-seen tracking, activity-based menu sorting, and per-user last-seen hover tooltips to the activity applet.
- Merged tracker behavior into the helper applet: 1-minute refresh, active-user highlighting/sorting in multi-user views, last-seen tracking in team-share tooltips, optional panel hiding, and activity-threshold automatic panel icons.
- Added the luxury Duo SVG icons to the helper panel-icon dropdown.
- Added a `Random` helper panel-icon mode that chooses a bundled icon immediately when selected and then once per hour.
- Added themed Duo SVG icons to the helper panel-icon dropdown and uses the mechanic icon for the settings context-menu entry and helper settings dialog icon.
- Added the royal, cyberpunk, sleepy, wizard, rocker, astronaut, pirate, samurai, vampire, chef, and traced Duo SVG icons from local Downloads.
- Removed duplicate non-vector themed icons where vector traced variants are available.
- Removed the traced-source marker from the remaining themed icon names and dropdown entries.
- Added configurable small rising speech bubbles when users newly become active or inactive.
- Added per-user `Standalone` settings so selected users appear in Standalone-only hover and click views.
- Added per-user `Simmulate active` settings to locally display users as online.
- Kept the helper automatic panel-icon base state on the rounded avatar when up to 50% of configured users are online.
- Changed helper multi-user list sorting to always group active users before inactive users, then apply the configured user sort, then use last-seen as the final tie-breaker.
- Added active-user count as the third value in the helper compact panel label.
- Changed helper defaults to sort by streak descending, show only `Standalone` users on click, and show course details in the click menu.
- Changed multi-user hover grouping so active/inactive section headers appear only when at least one user is currently active.
- Added a Standalone-online icon override for automatic panel-icon mode: when the first `Standalone` user is active, the growth-chart Duo icon is shown.
- Added `User activity tracking` as a display switch for active/offline grouping while keeping online detection, last-seen cache updates, active counts, automatic icons, and panel hiding active.
- Added descriptive settings tooltips and made the settings logo open the GitHub issue form with its helper text in the logo tooltip.
- Replaced the helper's standard Cinnamon user list with a custom settings table so each user-column header can show a distinct tooltip.
- Made helper display sorting consistent across hover, click, and self-plus-extra-user views, and only shows active/inactive groups when at least one visible user is active.
- Fixed hover activity grouping for Standalone-only views that include multiple Standalone users.
- Merged the old `Me / Self` and `Show with Me` user-table columns into a single `Standalone` column.
- Replaced user-table checkbox ticks with the bundled superhero owl SVG while keeping click-to-toggle behavior.
- Rendered Duolingo Plus status lines in blood red in hover tooltips and the click menu.
- Kept Duolingo Plus status lines blood red without bold styling.
- Added a separate `Highlight active users` hover setting for active-user emphasis in multi-user hover tooltips.
- Added matching click-menu highlight settings for active users and manually highlighted users.
- Avoided redundant panel icon reloads when the selected icon path has not changed, reducing visible icon flicker.
- Prevented stale refresh responses and in-flight reloads from leaving disabled users behind in hover and click user lists.
- Changed current helper defaults to keep applet hiding off and selected-user hover highlighting on.
- Shortened the compact panel-display option label and added a `Factory Reset` settings button that restores defaults and restarts Cinnamon.
- Added optional file-based authenticated API lookup for one configured helper user with a separate authenticated parser and sanitized cache storage.
- Changed the `Enabled` user-column tooltip to a calmer description.
- Changed helper last-seen formatting to show the time only for activity recorded today and at most 10 hours ago.
- Changed long helper click menus to use a scrollable user-detail area.
- Fixed repeated click-menu rebuilds creating duplicate scroll areas.
- Added optional panel hiding, active-user count label, and hover/click highlighting for the activity applet.

## 2026-05-23

- Converted the applet from password-based authentication to public username-based profile lookup.
- Added Cinnamon settings support with a multi-user list.
- Added a translated right-click settings menu item.
- Added hover tooltip statistics for configured users.
- Added Duolingo profile links for user entries in the applet menu.
- Replaced crown display with currently available Duolingo profile statistics.
- Added manual refresh and Duolingo open actions to the left-click menu.
- Added gettext translations for applet UI and settings strings.
- Added local installation script that compiles translations.
- Verified loading on Cinnamon 6.6.7.
