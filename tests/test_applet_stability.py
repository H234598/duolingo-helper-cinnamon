from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APPLETS = (
    (PROJECT_ROOT / "files" / "duolingo-helper@H234598" / "applet.js", "MyApplet"),
    (PROJECT_ROOT / "files" / "duolingo-activity@H234598" / "applet.js", "DuolingoActivityApplet"),
)


def _run_applet_expression(source_path: Path, class_name: str, expression: str) -> object:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available")
    script = f"""
const vm = require("vm");
const source = require("fs").readFileSync(process.argv[1], "utf8");
const TextIconApplet = function() {{}};
TextIconApplet.prototype = {{}};
const Session = function() {{}};
const context = {{
  console: console,
  global: {{userdatadir: "/tmp", logError: function() {{}}}},
  imports: {{
    ui: {{
      applet: {{TextIconApplet: TextIconApplet}},
      main: {{}},
      modalDialog: {{}},
      popupMenu: {{}},
      settings: {{}},
      tooltips: {{}}
    }},
    misc: {{util: {{}}}},
    gi: {{
      Clutter: {{}},
      Cogl: {{}},
      St: {{}},
      Gio: {{}},
      Pango: {{}},
      Soup: {{MAJOR_VERSION: 3, Session: Session}},
      GLib: {{
        build_filenamev: function(parts) {{ return parts.join("/"); }},
        get_user_cache_dir: function() {{ return "/tmp/cache"; }},
        get_user_config_dir: function() {{ return "/tmp/config"; }},
        get_user_data_dir: function() {{ return "/tmp/data"; }},
        getenv: function() {{ return ""; }},
        source_remove: function() {{}}
      }}
    }},
    gettext: {{
      bindtextdomain: function() {{}},
      dgettext: function(uuid, text) {{ return text; }}
    }},
    byteArray: {{}}
  }}
}};
vm.createContext(context);
vm.runInContext(source + "\\nglobalThis.__AppletClass = {class_name};", context);
const applet = Object.create(context.__AppletClass.prototype);
const result = (function() {{ return ({expression}); }})();
console.log(JSON.stringify(result));
"""
    completed = subprocess.run(
        [node, "-e", script, str(source_path)],
        check=False,
        capture_output=True,
        text=True,
        timeout=10,
    )
    assert completed.returncode == 0, completed.stderr
    return json.loads(completed.stdout)


@pytest.mark.parametrize(("source_path", "class_name"), APPLETS)
def test_click_rebuilds_a_dirty_menu_only_when_needed(source_path: Path, class_name: str) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        """
        (function() {
          let calls = [];
          applet.menuNeedsRebuild = true;
          applet.rebuildMenu = function() {
            calls.push("rebuild");
            this.menuNeedsRebuild = false;
          };
          applet.menu = {toggle: function() { calls.push("toggle"); }};
          applet.on_applet_clicked();
          applet.on_applet_clicked();
          return calls;
        })()
        """,
    )

    assert result == ["rebuild", "toggle", "toggle"]


@pytest.mark.parametrize(("source_path", "_class_name"), APPLETS)
def test_periodic_display_updates_do_not_rebuild_root_menu(source_path: Path, _class_name: str) -> None:
    source = source_path.read_text(encoding="utf-8")

    assert source.count("this.rebuildMenu();") == 2
    assert "this.invalidateMenu();" in source


@pytest.mark.parametrize(("source_path", "class_name"), APPLETS)
def test_removal_releases_menu_settings_and_async_generation(source_path: Path, class_name: str) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        """
        (function() {
          let destroyed = 0;
          let removedMenus = 0;
          let finalized = 0;
          applet.instanceId = "test";
          applet.refreshGeneration = 7;
          applet.refreshTimer = 42;
          applet.speechBubbleTimer = 0;
          applet.speechBubbleRotationTimer = 0;
          applet.menu = {destroy: function() { destroyed += 1; }};
          applet.menuManager = {removeMenu: function(menu) { removedMenus += menu === applet.menu ? 1 : 0; }};
          applet.settings = {finalize: function() { finalized += 1; }};
          applet._testStopSpeechBubbleRotation = function() {};
          applet.destroySpeechBubble = function() {};
          applet.on_applet_removed_from_panel();
          return {
            removed: applet.appletRemoved,
            generation: applet.refreshGeneration,
            timer: applet.refreshTimer,
            destroyed: destroyed,
            removedMenus: removedMenus,
            finalized: finalized,
            menuReleased: applet.menu === null,
            managerReleased: applet.menuManager === null,
            settingsReleased: applet.settings === null
          };
        })()
        """,
    )

    assert result == {
        "removed": True,
        "generation": 8,
        "timer": 0,
        "destroyed": 1,
        "removedMenus": 1,
        "finalized": 1,
        "menuReleased": True,
        "managerReleased": True,
        "settingsReleased": True,
    }


@pytest.mark.parametrize(("source_path", "class_name"), APPLETS)
def test_refresh_is_ignored_after_removal(source_path: Path, class_name: str) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        """
        (function() {
          let configuredCalls = 0;
          applet.appletRemoved = true;
          applet.refreshGeneration = 4;
          applet.refreshTimer = 0;
          applet.getConfiguredUsers = function() { configuredCalls += 1; return []; };
          applet.loadAuthConfig = function() { return null; };
          applet.buildPanelLabel = function() { return ""; };
          applet.set_applet_label = function() {};
          applet.updatePanelIcon = function() {};
          applet.updatePanelVisibility = function() {};
          applet.updateAppletTooltip = function() {};
          applet.invalidateMenu = function() {};
          applet.updateDisplay = function() {};
          applet.refresh();
          return {configuredCalls: configuredCalls, generation: applet.refreshGeneration};
        })()
        """,
    )

    assert result == {"configuredCalls": 0, "generation": 4}


def test_activity_applet_ignores_stale_http_response() -> None:
    source_path, class_name = APPLETS[1]
    result = _run_applet_expression(
        source_path,
        class_name,
        """
        (function() {
          let finished = 0;
          applet.appletRemoved = false;
          applet.refreshGeneration = 5;
          applet.activeUsers = [];
          applet.inactiveUsers = [];
          applet.cacheUserResponse = function() {};
          applet.isTruthyActivity = function() { return true; };
          applet.getLastSeen = function() { return 0; };
          applet.recordLastSeen = function() { return 1; };
          applet.withActivityState = function() { return {username: "stale"}; };
          applet.finishRequest = function() { finished += 1; };
          applet.recordResponse({username: "stale"}, {users: [{}]}, false, null, 4);
          return {active: applet.activeUsers.length, inactive: applet.inactiveUsers.length, finished: finished};
        })()
        """,
    )

    assert result == {"active": 0, "inactive": 0, "finished": 0}
