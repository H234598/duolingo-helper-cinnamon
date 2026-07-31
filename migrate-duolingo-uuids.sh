#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${repo_dir}/config/duolingo-helper.conf"
helper_uuid="${UUID}"
old_helper_uuid="${OLD_UUID}"
source "${repo_dir}/config/duolingo-activity.conf"
activity_uuid="${UUID}"
old_activity_uuid="${OLD_UUID}"

backup_root="${HOME}/.local/share/duolingo-helper-cinnamon-migration"
timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="${backup_root}/${timestamp}"
applet_dir="${HOME}/.local/share/cinnamon/applets"
settings_dir="${HOME}/.config/cinnamon/spices"
locale_dir="${HOME}/.local/share/locale"

mkdir -p "${backup_dir}"

backup_path() {
  local path="$1"
  local name="$2"

  if [[ -e "${path}" ]]; then
    mkdir -p "${backup_dir}/$(dirname "${name}")"
    cp -a "${path}" "${backup_dir}/${name}"
  fi
}

move_if_present() {
  local path="$1"
  local name="$2"

  if [[ -e "${path}" ]]; then
    mkdir -p "${backup_dir}/$(dirname "${name}")"
    mv "${path}" "${backup_dir}/${name}"
  fi
}

copy_settings_dir() {
  local old_uuid="$1"
  local new_uuid="$2"

  if [[ -d "${settings_dir}/${old_uuid}" ]]; then
    mkdir -p "${settings_dir}/${new_uuid}"
    cp -a "${settings_dir}/${old_uuid}/." "${settings_dir}/${new_uuid}/"
  fi
}

backup_path "${settings_dir}/${old_helper_uuid}" "settings/${old_helper_uuid}"
backup_path "${settings_dir}/${old_activity_uuid}" "settings/${old_activity_uuid}"
backup_path "${applet_dir}/${old_helper_uuid}" "applets/${old_helper_uuid}"
backup_path "${applet_dir}/${old_activity_uuid}" "applets/${old_activity_uuid}"
gsettings get org.cinnamon enabled-applets > "${backup_dir}/enabled-applets.before.txt"

"${repo_dir}/install-local.sh"
"${repo_dir}/install-activity-local.sh"

copy_settings_dir "${old_helper_uuid}" "${helper_uuid}"
copy_settings_dir "${old_activity_uuid}" "${activity_uuid}"

enabled_applets="$(gsettings get org.cinnamon enabled-applets)"
enabled_applets="${enabled_applets//${old_helper_uuid}/${helper_uuid}}"
enabled_applets="${enabled_applets//${old_activity_uuid}/${activity_uuid}}"
gsettings set org.cinnamon enabled-applets "${enabled_applets}"
gsettings get org.cinnamon enabled-applets > "${backup_dir}/enabled-applets.after.txt"

move_if_present "${settings_dir}/${old_helper_uuid}" "retired-settings/${old_helper_uuid}"
move_if_present "${settings_dir}/${old_activity_uuid}" "retired-settings/${old_activity_uuid}"
move_if_present "${applet_dir}/${old_helper_uuid}" "retired-applets/${old_helper_uuid}"
move_if_present "${applet_dir}/${old_activity_uuid}" "retired-applets/${old_activity_uuid}"

for mo in "${locale_dir}"/*/LC_MESSAGES/"${old_helper_uuid}.mo" "${locale_dir}"/*/LC_MESSAGES/"${old_activity_uuid}.mo"; do
  [[ -e "${mo}" ]] || continue
  rel="${mo#${locale_dir}/}"
  move_if_present "${mo}" "retired-locale/${rel}"
done

printf 'Migrated Duolingo Cinnamon applets.\n'
printf 'Backup: %s\n' "${backup_dir}"
printf 'Reload Cinnamon, or run:\n'
printf "gdbus call --session --dest org.Cinnamon --object-path /org/Cinnamon --method org.Cinnamon.ReloadXlet '%s' 'APPLET'\n" "${helper_uuid}"
printf "gdbus call --session --dest org.Cinnamon --object-path /org/Cinnamon --method org.Cinnamon.ReloadXlet '%s' 'APPLET'\n" "${activity_uuid}"
