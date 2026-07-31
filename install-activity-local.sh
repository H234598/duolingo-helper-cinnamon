#!/usr/bin/env bash
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${repo_dir}/config/duolingo-activity.conf"
uuid="${UUID}"
src="${repo_dir}/files/${uuid}"
target="${HOME}/.local/share/cinnamon/applets/${uuid}"
locale_root="${HOME}/.local/share/locale"

mkdir -p "$(dirname "${target}")"
rm -rf "${target}"
cp -a "${src}" "${target}"

if command -v msgfmt >/dev/null 2>&1; then
  for po in "${src}"/po/*.po; do
    lang="$(basename "${po}" .po)"
    mo_dir="${locale_root}/${lang}/LC_MESSAGES"
    mkdir -p "${mo_dir}"
    msgfmt "${po}" -o "${mo_dir}/${uuid}.mo"
  done
else
  printf 'msgfmt not found; applet installed without compiled translations.\n' >&2
fi

printf 'Installed %s to %s\n' "${uuid}" "${target}"
