#!/usr/bin/env bash
set -euo pipefail

standalone_repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
spices_repo="${1:-${HOME}/cinnamon-spices-applets}"
uuid="duolingo-helper@nodeengineer.com"
source_dir="${standalone_repo}/files/${uuid}"
target_root="${spices_repo}/${uuid}"
target_dir="${target_root}/files/${uuid}"

if [[ ! -d "${spices_repo}/.git" ]]; then
  printf 'Not a git repository: %s\n' "${spices_repo}" >&2
  exit 1
fi

if [[ ! -d "${target_dir}" ]]; then
  printf 'Target applet directory not found: %s\n' "${target_dir}" >&2
  exit 1
fi

mkdir -p "${target_dir}/po"

cp -a "${source_dir}/applet.js" "${target_dir}/applet.js"
cp -a "${source_dir}/settings-schema.json" "${target_dir}/settings-schema.json"
cp -a "${source_dir}/metadata.json" "${target_dir}/metadata.json"
cp -a "${source_dir}/po/." "${target_dir}/po/"

jq 'del(."last-edited")' "${target_dir}/metadata.json" > "${target_dir}/metadata.json.tmp"
mv "${target_dir}/metadata.json.tmp" "${target_dir}/metadata.json"

cat > "${target_root}/README.md" <<'README'
# Duolingo Helper Cinnamon Spice

This applet shows public Duolingo profile statistics in the Cinnamon panel.

The previous version used Duolingo's obsolete password login endpoint and displayed daily-goal/crown/lingot data that is no longer reliable in the current Duolingo product. This version no longer asks for or stores a Duolingo password. It reads public profile data from:

```text
https://www.duolingo.com/2017-06-30/users?username=<username>
```

## Features

- No Duolingo password is requested or stored.
- Multiple Duolingo usernames can be configured.
- Optional aliases can replace usernames in the displayed applet text.
- Configure user sorting by configured order, alias/name, streak, or total XP.
- Right-click the panel applet and choose `Settings` to edit users. The label is translated by Cinnamon.
- Configure what the hover tooltip shows: summary, course details, account details, or all details.
- Configure what the left-click menu shows with the same display modes, plus profile links and manual refresh.
- Refreshes automatically every 5 minutes.

## Displayed Statistics

The current public profile endpoint exposes:

- Streak in days
- Total XP
- XP in the current course
- Current course title
- All course titles, language directions, and XP
- Display name, join date, recent activity, email verification, profile country, live event count, and achievement count
- Duolingo Plus status when present
- Error state per configured username

The panel label stays compact:

```text
<loaded-users> | <sum-of-streaks>
```

Example:

```text
3 | 42
```

## Configure

1. Right-click the Duolingo Helper applet in the Cinnamon panel.
2. Click `Settings`.
3. Choose what should be shown when hovering over the applet.
4. Choose what should be shown when clicking the applet.
5. Choose the user sort order.
6. Add one row per Duolingo username.
7. Optionally set an alias for any row.
8. Enable the rows you want to fetch.

Use the Duolingo username, not the email address.
Aliases are display-only; profile links still open the configured Duolingo username.

Clicking a loaded user in the applet menu opens that user's Duolingo profile.

## Notes

This applet uses an unofficial public Duolingo endpoint. Duolingo can change or remove it without notice.

If a configured username shows an error, verify that the profile exists and that the username is public.
README

(
  cd "${spices_repo}"
  jq . "${uuid}/files/${uuid}/metadata.json" >/dev/null
  jq . "${uuid}/files/${uuid}/settings-schema.json" >/dev/null
  for po in "${uuid}/files/${uuid}/po/"*.po; do
    msgfmt -c "${po}" -o "/tmp/$(basename "${po}" .po).mo"
  done
  git diff --check
)

printf 'Synced %s into %s\n' "${uuid}" "${spices_repo}"
