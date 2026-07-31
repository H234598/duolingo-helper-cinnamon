from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
APPLETS = (
    (PROJECT_ROOT / "files" / "duolingo-helper@H234598" / "applet.js", "MyApplet", "helper"),
    (
        PROJECT_ROOT / "files" / "duolingo-activity@H234598" / "applet.js",
        "DuolingoActivityApplet",
        "activity",
    ),
)


def _run_applet_expression(
    source_path: Path,
    class_name: str,
    expression: str,
    *,
    soup_major: int = 3,
) -> object:
    node = shutil.which("node")
    if not node:
        pytest.skip("node is not available")

    script = r'''
const vm = require("vm");
const source = require("fs").readFileSync(process.argv[1], "utf8");

function FakeActor() {
  this.visible = true;
  this.destroyed = false;
  this.styleClasses = [];
  this._delegate = null;
}
FakeActor.prototype.show = function() { this.visible = true; };
FakeActor.prototype.hide = function() { this.visible = false; };
FakeActor.prototype.destroy = function() { this.destroyed = true; this.visible = false; };
FakeActor.prototype.add_style_class_name = function(name) {
  if (this.styleClasses.indexOf(name) === -1) this.styleClasses.push(name);
};
FakeActor.prototype.remove_style_class_name = function(name) {
  this.styleClasses = this.styleClasses.filter(current => current !== name);
};
FakeActor.prototype.has_style_class_name = function(name) {
  return this.styleClasses.indexOf(name) !== -1;
};
FakeActor.prototype.set_style = function(style) { this.style = style || ""; };
FakeActor.prototype.set_clip_to_allocation = function(value) { this.clip = value; };
FakeActor.prototype.add_actor = function(actor) { this.child = actor; };

function FakeLabel(text) {
  this.text = text || "";
  this.style = "";
}
FakeLabel.prototype.set_text = function(text) { this.text = String(text); };
FakeLabel.prototype.get_text = function() { return this.text; };
FakeLabel.prototype.set_style = function(style) { this.style = style || ""; };

let nextSignalId = 1;
function PopupMenuItem(text) {
  this.actor = new FakeActor();
  this.actor._delegate = this;
  this.label = new FakeLabel(text);
  this.handlers = [];
  this.connectCount = 0;
  this.sensitive = true;
}
PopupMenuItem.prototype.connect = function(signal, handler) {
  this.connectCount += 1;
  this.handlers.push({signal: signal, handler: handler, id: nextSignalId});
  return nextSignalId++;
};
PopupMenuItem.prototype.activate = function() {
  for (const binding of this.handlers) {
    if (binding.signal === "activate") binding.handler(this);
  }
};
PopupMenuItem.prototype.setSensitive = function(value) { this.sensitive = value; };
PopupMenuItem.prototype.addActor = function(actor) { this.child = actor; };

function PopupSeparatorMenuItem() {
  this.actor = new FakeActor();
  this.actor._delegate = this;
}

function PopupMenuSection() {
  this.actor = new FakeActor();
  this.actor._delegate = this;
  this.items = [];
}
PopupMenuSection.prototype.addMenuItem = function(item, position) {
  if (position === undefined || position < 0 || position >= this.items.length) {
    this.items.push(item);
  } else {
    this.items.splice(position, 0, item);
  }
};
PopupMenuSection.prototype._getMenuItems = function() { return this.items.slice(); };

function AppletPopupMenu() {
  this.items = [];
  this.isOpen = false;
  this.removeAllCalls = 0;
  this.destroyed = false;
  this.passEvents = false;
  this.box = {get_children: () => this.items.map(item => item.actor)};
}
AppletPopupMenu.prototype.addMenuItem = PopupMenuSection.prototype.addMenuItem;
AppletPopupMenu.prototype.removeAll = function() {
  this.removeAllCalls += 1;
  for (const item of this.items) {
    if (item.actor && item.actor.destroy) item.actor.destroy();
  }
  this.items = [];
};
AppletPopupMenu.prototype.toggle = function() { this.isOpen = !this.isOpen; };
AppletPopupMenu.prototype.destroy = function() { this.destroyed = true; };

function PopupMenuManager() { this.menus = []; this.destroyed = false; }
PopupMenuManager.prototype.addMenu = function(menu) { this.menus.push(menu); };
PopupMenuManager.prototype.removeMenu = function(menu) {
  this.menus = this.menus.filter(current => current !== menu);
};
PopupMenuManager.prototype.destroy = function() { this.destroyed = true; };

function ScrollView() {
  FakeActor.call(this);
  this.vscroll = {adjustment: {value: 9, lower: 0}};
  this.scrollbar = {connect: function() { return nextSignalId++; }};
}
ScrollView.prototype = Object.create(FakeActor.prototype);
ScrollView.prototype.get_vscroll_bar = function() { return this.scrollbar; };

function FakeTooltip(actor, text) {
  this.actor = actor;
  this.text = text || "";
  this.destroyed = false;
}
FakeTooltip.prototype.set_text = function(text) { this.text = text || ""; };
FakeTooltip.prototype.destroy = function() { this.destroyed = true; };

const sessions = [];
function Session() {
  this.cancelledMessages = [];
  sessions.push(this);
}
Session.prototype.add_feature = function() {};
Session.prototype.cancel_message = function(message, status) {
  this.cancelledMessages.push({message: message, status: status});
};
function SessionAsync() { Session.call(this); }
SessionAsync.prototype = Object.create(Session.prototype);

const cancellables = [];
function Cancellable() {
  this.cancelCount = 0;
  cancellables.push(this);
}
Cancellable.prototype.cancel = function() { this.cancelCount += 1; };

const TextIconApplet = function() {};
TextIconApplet.prototype = {};
const context = {
  console: console,
  global: {
    userdatadir: "/tmp",
    logError: function() {},
    logWarning: function() {},
    __sessions: sessions,
    __cancellables: cancellables
  },
  imports: {
    ui: {
      applet: {TextIconApplet: TextIconApplet, AppletPopupMenu: AppletPopupMenu},
      main: {},
      modalDialog: {},
      popupMenu: {
        PopupMenuManager: PopupMenuManager,
        PopupMenuItem: PopupMenuItem,
        PopupIconMenuItem: PopupMenuItem,
        PopupBaseMenuItem: PopupMenuItem,
        PopupSeparatorMenuItem: PopupSeparatorMenuItem,
        PopupMenuSection: PopupMenuSection
      },
      settings: {},
      tooltips: {Tooltip: FakeTooltip}
    },
    misc: {util: {}},
    gi: {
      Clutter: {},
      Cogl: {},
      St: {
        ScrollView: ScrollView,
        PolicyType: {NEVER: 0, AUTOMATIC: 1},
        IconType: {SYMBOLIC: 0}
      },
      Gio: {Cancellable: Cancellable},
      Pango: {},
      Soup: {
        MAJOR_VERSION: __SOUP_MAJOR__,
        Session: Session,
        SessionAsync: SessionAsync,
        ProxyResolverDefault: function() {},
        MessagePriority: {NORMAL: 0},
        Status: {CANCELLED: 499}
      },
      GLib: {
        build_filenamev: function(parts) { return parts.join("/"); },
        get_user_cache_dir: function() { return "/tmp/cache"; },
        get_user_config_dir: function() { return "/tmp/config"; },
        get_user_data_dir: function() { return "/tmp/data"; },
        getenv: function() { return "en_US.UTF-8"; },
        get_real_time: function() { return 1; },
        source_remove: function() {},
        SOURCE_REMOVE: false
      }
    },
    gettext: {
      bindtextdomain: function() {},
      dgettext: function(uuid, text) { return text; }
    },
    byteArray: {}
  }
};
vm.createContext(context);
vm.runInContext(source + "\nglobalThis.__AppletClass = __CLASS_NAME__;", context);
const applet = Object.create(context.__AppletClass.prototype);
const result = (function() { return (__EXPRESSION__); })();
console.log(JSON.stringify(result));
'''
    script = script.replace("__SOUP_MAJOR__", str(soup_major))
    script = script.replace("__CLASS_NAME__", class_name)
    script = script.replace("__EXPRESSION__", expression)
    completed = subprocess.run(
        [node, "-e", script, str(source_path)],
        check=False,
        capture_output=True,
        text=True,
        timeout=20,
    )
    assert completed.returncode == 0, completed.stderr
    return json.loads(completed.stdout)


def _menu_state_expression(kind: str, *, user_count: int, refresh_username: str | None = None) -> str:
    expression = r'''
(function() {
  const kind = __KIND__;
  if (typeof applet.syncMenu !== "function") {
    return {available: false};
  }

  function makeUser(index, explicitUsername) {
    const username = explicitUsername || ("user-" + String(index).padStart(3, "0"));
    return {
      username: username,
      displayUsername: username,
      highlighted: false,
      simulateActive: false,
      standalone: true,
      isSelf: index === 0,
      configuredIndex: index,
      index: index,
      active: true,
      activeRecently: false,
      lastSeen: 0,
      error: null,
      streak: 1,
      totalXp: 2,
      courseXp: 3,
      courseTitle: "Course",
      courseCount: 1,
      courses: [],
      hasPlus: false
    };
  }

  function installUsers(users) {
    if (kind === "helper") {
      applet.userData = users;
      applet.usernames = users;
      applet.loadingUsers = false;
    } else {
      applet.configuredUsers = users;
      applet.activeUsers = users;
      applet.inactiveUsers = [];
      applet.errors = [];
    }
  }

  const opened = [];
  applet.openProfile = function(username) { opened.push(username); };
  applet.configureApplet = function() {};
  applet.appletRemoved = false;
  applet.usedCache = false;
  applet.clickDisplayMode = "summary";
  applet.clickSelfOnly = false;
  applet.hoverDisplayMode = "summary";
  applet.hoverSelfOnly = false;
  applet.activityTrackingEnabled = false;
  applet.highlightOnClick = false;
  applet.highlightActiveUsersOnClick = false;
  applet.highlightOnHover = false;
  applet.highlightActiveUsersOnHover = false;
  applet.sortOrder = "configured";
  applet.activeUsernamesSnapshot = null;
  applet.updatePanelIcon = function() {};
  applet.updatePanelVisibility = function() {};
  applet.set_applet_label = function() {};
  applet.set_applet_tooltip = function() {};
  applet.updateAppletTooltip = function() {};
  applet.showSpeechBubble = function() {};

  const users = [];
  for (let index = 0; index < __USER_COUNT__; index++) users.push(makeUser(index));
  installUsers(users);
  applet.buildMenu(0);

  let profileSlots = (applet.menuRowSlots || []).filter(slot =>
    slot.item.actor.visible && typeof slot.currentUsername === "string"
  );
  const firstSlot = profileSlots[0] || null;
  const firstItem = firstSlot ? firstSlot.item : null;
  const firstActor = firstSlot ? firstSlot.item.actor : null;
  const firstSignalCount = firstSlot ? firstSlot.item.connectCount : 0;
  const dynamicSectionActor = kind === "helper"
    ? applet.clickMenuSection.actor
    : applet.menuContentSection.actor;
  const refreshActor = applet.refreshMenuItem.actor;
  const removeAllBefore = applet.menu.removeAllCalls;

  if (__REFRESH_USERNAME__ !== null) {
    installUsers([makeUser(0, __REFRESH_USERNAME__)]);
    applet.menu.isOpen = true;
    applet.updateDisplay();
    profileSlots = (applet.menuRowSlots || []).filter(slot =>
      slot.item.actor.visible && typeof slot.currentUsername === "string"
    );
    if (profileSlots[0]) profileSlots[0].item.activate();
  }

  const visibleLabels = (applet.menuRowSlots || [])
    .filter(slot => slot.item.actor.visible)
    .map(slot => slot.item.label.text);
  return {
    available: true,
    profileCount: profileSlots.length,
    sameSlot: firstSlot !== null && profileSlots[0] === firstSlot,
    sameItem: firstItem !== null && profileSlots[0] && profileSlots[0].item === firstItem,
    sameActor: firstActor !== null && profileSlots[0] && profileSlots[0].item.actor === firstActor,
    sameSignal: profileSlots[0] && profileSlots[0].item.connectCount === firstSignalCount,
    sameDynamicSection: (kind === "helper"
      ? applet.clickMenuSection.actor
      : applet.menuContentSection.actor) === dynamicSectionActor,
    sameRefreshFooter: applet.refreshMenuItem.actor === refreshActor,
    opened: opened,
    labels: visibleLabels,
    removeAllDelta: applet.menu.removeAllCalls - removeAllBefore,
    userSlotCapacity: (applet.menuRowSlots || []).filter(slot => slot.isUserSlot === true).length
  };
})()
'''
    return (
        expression.replace("__KIND__", json.dumps(kind))
        .replace("__USER_COUNT__", str(user_count))
        .replace("__REFRESH_USERNAME__", json.dumps(refresh_username))
    )


@pytest.mark.parametrize(("source_path", "class_name", "kind"), APPLETS)
def test_open_menu_refresh_reuses_actor_and_uses_current_callback_data(
    source_path: Path,
    class_name: str,
    kind: str,
) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        _menu_state_expression(kind, user_count=1, refresh_username="new-user"),
    )

    assert result == {
        "available": True,
        "profileCount": 1,
        "sameSlot": True,
        "sameItem": True,
        "sameActor": True,
        "sameSignal": True,
        "sameDynamicSection": True,
        "sameRefreshFooter": True,
        "opened": ["new-user"],
        "labels": ["new-user: 1 days, 2 total XP, 3 XP in Course"]
        if kind == "helper"
        else ["Active now:", "new-user is playing Duolingo right now!", "Inactive:", "No inactive users"],
        "removeAllDelta": 0,
        "userSlotCapacity": 1,
    }


def test_activity_open_menu_switches_to_current_loading_state_when_refresh_starts() -> None:
    source_path, class_name, _kind = APPLETS[1]
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
(function() {
  const user = {
    username: "fresh-user",
    displayUsername: "fresh-user",
    highlighted: false
  };
  applet.appletRemoved = false;
  applet.refreshGeneration = 0;
  applet.refreshTimer = 0;
  applet.pendingSoup2Messages = [];
  applet.requestCancellable = null;
  applet.configuredUsers = [];
  applet.activeUsers = [];
  applet.inactiveUsers = [];
  applet.errors = [];
  applet.usedCache = false;
  applet.configureApplet = function() {};
  applet.getConfiguredUsers = function() { return [user]; };
  applet.updatePanelVisibility = function() {};
  applet.updatePanelIcon = function() {};
  applet.set_applet_label = function() {};
  applet.set_applet_tooltip = function() {};
  applet.fetchUserActivity = function() {};
  context.imports.gi.GLib.timeout_add_seconds = function() { return 17; };
  applet.buildMenu(0);
  applet.menu.isOpen = true;
  applet.refresh();
  return {
    labels: applet.menuRowSlots
      .filter(slot => slot.item.actor.visible)
      .map(slot => slot.item.label.text),
    open: applet.menu.isOpen,
    loading: applet.loadingUsers,
    timer: applet.refreshTimer
  };
})()
''',
    )

    assert result == {
        "labels": ["Checking Duolingo activity..."],
        "open": True,
        "loading": True,
        "timer": 17,
    }


@pytest.mark.parametrize(("source_path", "class_name", "kind"), APPLETS)
def test_visible_user_limit_allows_exactly_200_without_notice(
    source_path: Path,
    class_name: str,
    kind: str,
) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        _menu_state_expression(kind, user_count=200),
    )

    assert result["available"] is True
    assert result["profileCount"] == 200
    assert result["userSlotCapacity"] == 200
    assert not any("weitere Benutzer nicht angezeigt" in label for label in result["labels"])


@pytest.mark.parametrize(("source_path", "class_name", "kind"), APPLETS)
def test_visible_user_limit_caps_201_and_reports_actual_omission(
    source_path: Path,
    class_name: str,
    kind: str,
) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        _menu_state_expression(kind, user_count=201),
    )

    assert result["available"] is True
    assert result["profileCount"] == 200
    assert result["userSlotCapacity"] == 200
    assert [label for label in result["labels"] if "weitere Benutzer nicht angezeigt" in label] == [
        "1 weitere Benutzer nicht angezeigt"
    ]


@pytest.mark.parametrize(("source_path", "class_name", "kind"), APPLETS)
def test_tooltip_view_caps_201_users_and_reports_actual_omission(
    source_path: Path,
    class_name: str,
    kind: str,
) -> None:
    expression = r'''
(function() {
  function makeUser(index) {
    const username = "user-" + String(index).padStart(3, "0");
    return {
      username: username,
      displayUsername: username,
      highlighted: false,
      standalone: true,
      isSelf: index === 0,
      configuredIndex: index,
      active: true,
      activeRecently: false,
      lastSeen: 0,
      error: null,
      streak: 1,
      totalXp: 2,
      courseXp: 3,
      courseTitle: "Course",
      courseCount: 1,
      courses: [],
      hasPlus: false
    };
  }
  const users = [];
  for (let index = 0; index < 201; index++) users.push(makeUser(index));
  applet.usedCache = false;
  applet.highlightOnHover = false;
  applet.highlightActiveUsersOnHover = false;
  applet.activityTrackingEnabled = false;
  applet.hoverDisplayMode = "summary";
  applet.hoverSelfOnly = false;
  applet.sortOrder = "configured";
  applet.loadingUsers = false;
  applet.userData = users;
  applet.activeUsers = users;
  applet.errors = [];
  const lines = applet.buildTooltip().split("\n");
  return {lines: lines, notice: lines.filter(line => line.indexOf("weitere Benutzer nicht angezeigt") !== -1)};
})()
'''
    result = _run_applet_expression(source_path, class_name, expression)

    if kind == "helper":
        assert len(result["lines"]) == 202  # heading + 200 users + notice
    else:
        assert len(result["lines"]) == 201  # 200 active users + notice
    assert result["notice"] == ["1 weitere Benutzer nicht angezeigt"]


def test_grouped_helper_tooltip_does_not_call_truncated_inactive_group_empty() -> None:
    source_path, class_name, _kind = APPLETS[0]
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
(function() {
  function makeUser(index) {
    const username = "user-" + String(index).padStart(3, "0");
    return {
      username: username,
      displayUsername: username,
      highlighted: false,
      standalone: true,
      isSelf: index === 0,
      configuredIndex: index,
      activeRecently: index < 200,
      lastSeen: 0,
      error: null,
      streak: 1,
      totalXp: 2,
      courseXp: 3,
      courseTitle: "Course",
      courseCount: 1,
      courses: [],
      hasPlus: false
    };
  }
  applet.userData = [];
  for (let index = 0; index < 201; index++) applet.userData.push(makeUser(index));
  applet.usedCache = false;
  applet.loadingUsers = false;
  applet.highlightOnHover = false;
  applet.highlightActiveUsersOnHover = false;
  applet.activityTrackingEnabled = true;
  applet.hoverDisplayMode = "summary";
  applet.hoverSelfOnly = false;
  applet.sortOrder = "configured";
  return applet.buildTooltip().split("\n");
})()
''',
    )

    assert "Inactive:" in result
    assert "No inactive users" not in result
    assert result[-1] == "1 weitere Benutzer nicht angezeigt"


@pytest.mark.parametrize(("source_path", "class_name", "_kind"), APPLETS)
def test_request_batch_replaces_and_cancels_soup3_cancellable(
    source_path: Path,
    class_name: str,
    _kind: str,
) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
(function() {
  if (typeof applet.beginRequestBatch !== "function") return {available: false};
  applet.pendingSoup2Messages = [];
  applet.requestCancellable = null;
  applet.beginRequestBatch();
  const first = applet.requestCancellable;
  applet.beginRequestBatch();
  return {
    available: true,
    firstCancelled: first.cancelCount,
    replaced: applet.requestCancellable !== first,
    created: context.global.__cancellables.length
  };
})()
''',
    )

    assert result == {"available": True, "firstCancelled": 1, "replaced": True, "created": 2}


@pytest.mark.parametrize(("source_path", "class_name", "_kind"), APPLETS)
def test_request_batch_cancels_every_tracked_soup2_message(
    source_path: Path,
    class_name: str,
    _kind: str,
) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
(function() {
  if (typeof applet.trackSoup2Message !== "function" || typeof applet.cancelPendingRequests !== "function") {
    return {available: false};
  }
  applet.pendingSoup2Messages = [];
  applet.requestCancellable = null;
  const first = {name: "first"};
  const second = {name: "second"};
  applet.trackSoup2Message(first);
  applet.trackSoup2Message(second);
  applet.cancelPendingRequests();
  return {
    available: true,
    cancelled: context.global.__sessions[0].cancelledMessages.map(entry => entry.message.name),
    statuses: context.global.__sessions[0].cancelledMessages.map(entry => entry.status),
    remaining: applet.pendingSoup2Messages.length
  };
})()
''',
        soup_major=2,
    )

    assert result == {
        "available": True,
        "cancelled": ["first", "second"],
        "statuses": [499, 499],
        "remaining": 0,
    }


@pytest.mark.parametrize(("source_path", "class_name", "kind"), APPLETS)
def test_complete_teardown_releases_pool_tooltips_and_request_batch(
    source_path: Path,
    class_name: str,
    kind: str,
) -> None:
    expression = r'''
(function() {
  const kind = __KIND__;
  let destroyed = 0;
  let removedMenus = 0;
  let finalized = 0;
  let tooltipDestroyed = 0;
  const cancellable = {cancel: function() { this.cancelled = (this.cancelled || 0) + 1; }};
  applet.instanceId = "test";
  applet.refreshGeneration = 7;
  applet.refreshTimer = 42;
  applet.speechBubbleTimer = 0;
  applet.speechBubbleRotationTimer = 0;
  applet.pendingSoup2Messages = [];
  applet.requestCancellable = cancellable;
  applet.menuRowSlots = [{tooltip: {destroy: function() { tooltipDestroyed += 1; }}}];
  applet.menu = {destroy: function() { destroyed += 1; }};
  applet.menuManager = {removeMenu: function(menu) { removedMenus += menu === applet.menu ? 1 : 0; }};
  applet.settings = {finalize: function() { finalized += 1; }};
  applet.menuContentSection = {};
  applet.clickMenuSection = {};
  applet.clickMenuScrollView = {};
  applet.clickMenuScrollItem = {};
  applet.clickMenuFooterSeparator = {};
  applet.openDuolingoMenuItem = {};
  applet.refreshMenuItem = {};
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
    tooltipDestroyed: tooltipDestroyed,
    requestCancelled: cancellable.cancelled || 0,
    slotsReleased: applet.menuRowSlots === null,
    soup2Released: applet.pendingSoup2Messages === null,
    cancellableReleased: applet.requestCancellable === null,
    dynamicMenuReleased: kind === "helper"
      ? applet.clickMenuSection === null && applet.clickMenuScrollView === null &&
        applet.clickMenuScrollItem === null
      : applet.menuContentSection === null,
    staticFooterReleased: kind === "helper"
      ? applet.clickMenuFooterSeparator === null && applet.openDuolingoMenuItem === null &&
        applet.refreshMenuItem === null
      : applet.refreshMenuItem === null,
    menuReleased: applet.menu === null,
    managerReleased: applet.menuManager === null,
    settingsReleased: applet.settings === null
  };
})()
'''.replace("__KIND__", json.dumps(kind))
    result = _run_applet_expression(
        source_path,
        class_name,
        expression,
    )

    assert result == {
        "removed": True,
        "generation": 8,
        "timer": 0,
        "destroyed": 1,
        "removedMenus": 1,
        "finalized": 1,
        "tooltipDestroyed": 1,
        "requestCancelled": 1,
        "slotsReleased": True,
        "soup2Released": True,
        "cancellableReleased": True,
        "dynamicMenuReleased": True,
        "staticFooterReleased": True,
        "menuReleased": True,
        "managerReleased": True,
        "settingsReleased": True,
    }


@pytest.mark.parametrize(("source_path", "class_name", "_kind"), APPLETS)
def test_refresh_is_ignored_after_removal(source_path: Path, class_name: str, _kind: str) -> None:
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
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
  applet.syncMenu = function() {};
  applet.updateDisplay = function() {};
  applet.refresh();
  return {configuredCalls: configuredCalls, generation: applet.refreshGeneration};
})()
''',
    )

    assert result == {"configuredCalls": 0, "generation": 4}


def test_activity_applet_ignores_stale_http_response() -> None:
    source_path, class_name, _kind = APPLETS[1]
    result = _run_applet_expression(
        source_path,
        class_name,
        r'''
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
''',
    )

    assert result == {"active": 0, "inactive": 0, "finished": 0}
