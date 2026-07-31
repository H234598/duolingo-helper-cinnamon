const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;
const Util = imports.misc.util;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const ByteArray = imports.byteArray;

const UUID = "duolingo-activity@H234598";
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const UPDATE_INTERVAL_SECONDS = 300;
const PANEL_ICON_AUTOMATIC = "automatic";
const BRAND_ASSET_PATH = "assets/duolingo-brand/";
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), UUID]);
const DUOLINGO_ACCEPT = "application/json,text/plain,*/*";
const DUOLINGO_ACCEPT_LANGUAGE = "de-DE,de;q=0.9,en;q=0.8";
const DUOLINGO_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const PANEL_ICONS = {
  "icon": BRAND_ASSET_PATH + "icon.svg",
  "avatar-square": BRAND_ASSET_PATH + "avatar-square.svg",
  "avatar-rounded": BRAND_ASSET_PATH + "avatar-rounded.svg",
  "avatar-circle": BRAND_ASSET_PATH + "avatar-circle.svg",
  "avatar-mask": BRAND_ASSET_PATH + "avatar-mask.svg",
  "duoplatt": BRAND_ASSET_PATH + "duoplatt.svg"
};

Gettext.bindtextdomain(UUID, GLib.get_user_data_dir() + "/locale");

function _(str) {
  return Gettext.dgettext(UUID, str);
}

function formatString(template, values) {
  let text = template;
  for (let value of values) {
    text = text.replace("%s", value);
  }
  return text;
}

let soupASyncSession;
if (Soup.MAJOR_VERSION === 2) {
  soupASyncSession = new Soup.SessionAsync();
  Soup.Session.prototype.add_feature.call(soupASyncSession, new Soup.ProxyResolverDefault());
} else {
  soupASyncSession = new Soup.Session();
}

function DuolingoActivityApplet(metadata, orientation, panelHeight, instanceId) {
  this._init(metadata, orientation, panelHeight, instanceId);
}

DuolingoActivityApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function(metadata, orientation, panelHeight, instanceId) {
    Applet.TextIconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

    this.metadata = metadata;
    this.instanceId = instanceId;
    this.users = [];
    this.configuredUsers = [];
    this.activeUsers = [];
    this.inactiveUsers = [];
    this.errors = [];
    this.pendingRequests = 0;
    this.refreshTimer = 0;
    this.responseCache = null;
    this.cachePath = GLib.build_filenamev([CACHE_DIR, instanceId + ".json"]);
    this.usedCache = false;
    this.panelIcon = PANEL_ICON_AUTOMATIC;
    this.panelIconAutoMigrated = false;
    this.hideWhenInactive = false;
    this.highlightOnHover = false;

    this.settings = new Settings.AppletSettings(this, UUID, instanceId);
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "users",
      "users",
      this.onSettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "panel-icon",
      "panelIcon",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "panel-icon-auto-migrated",
      "panelIconAutoMigrated",
      null,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "hide-when-inactive",
      "hideWhenInactive",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "highlight-on-hover",
      "highlightOnHover",
      this.onDisplaySettingsChanged,
      null
    );

    this.migratePanelIconSetting();
    this.updatePanelIcon();
    this.set_applet_label("");
    this.set_applet_tooltip(_("Duolingo Activity"));

    this.addSettingsMenuItem();
    this.buildMenu(orientation);
    this.refresh();
  },

  addSettingsMenuItem: function() {
    this.settingsMenuItem = new PopupMenu.PopupIconMenuItem(
      _("Settings"),
      "xsi-preferences",
      St.IconType.SYMBOLIC
    );
    this.settingsMenuItem.connect("activate", () => this.configureApplet());
    this._applet_context_menu.addMenuItem(this.settingsMenuItem);
  },

  on_applet_clicked: function() {
    this.menu.toggle();
  },

  buildMenu: function(orientation) {
    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    this.rebuildMenu();
  },

  on_applet_removed_from_panel: function() {
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }
  },

  onSettingsChanged: function() {
    this.refresh();
  },

  onDisplaySettingsChanged: function() {
    this.migratePanelIconSetting();
    this.updatePanelIcon();
    this.updateDisplay();
  },

  migratePanelIconSetting: function() {
    if (this.panelIconAutoMigrated === true) {
      return;
    }

    if (this.panelIcon === "icon") {
      this.panelIcon = PANEL_ICON_AUTOMATIC;
      this.settings.setValue("panel-icon", PANEL_ICON_AUTOMATIC);
    }

    this.panelIconAutoMigrated = true;
    this.settings.setValue("panel-icon-auto-migrated", true);
  },

  validPanelIcon: function(iconKey) {
    if (iconKey === "icon") {
      return PANEL_ICON_AUTOMATIC;
    }

    if (iconKey === PANEL_ICON_AUTOMATIC || PANEL_ICONS[iconKey]) {
      return iconKey;
    }

    return PANEL_ICON_AUTOMATIC;
  },

  updatePanelIcon: function(hasActiveUsers) {
    if (hasActiveUsers === undefined) {
      hasActiveUsers = this.activeUsers.length > 0;
    }

    let selectedIcon = this.validPanelIcon(this.panelIcon);
    let iconKey = selectedIcon === PANEL_ICON_AUTOMATIC
      ? (hasActiveUsers ? "icon" : "duoplatt")
      : selectedIcon;
    let iconPath = PANEL_ICONS[iconKey] || PANEL_ICONS["icon"];
    this.set_applet_icon_path(APPLET_PATH + "/" + iconPath);
  },

  getConfiguredUsers: function() {
    let users = [];
    let seen = {};
    let rows = this.users || [];

    for (let row of rows) {
      if (row.enabled === false) {
        continue;
      }

      let username = (row.username || "").trim();
      if (username.length === 0 || seen[username.toLowerCase()]) {
        continue;
      }

      seen[username.toLowerCase()] = true;
      users.push({
        username: username,
        displayUsername: (row.alias || "").trim() || username,
        highlighted: row.highlighted === true
      });
    }

    return users;
  },

  refresh: function() {
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }

    this.configuredUsers = this.getConfiguredUsers();
    this.activeUsers = [];
    this.inactiveUsers = [];
    this.errors = [];
    this.usedCache = false;
    this.pendingRequests = this.configuredUsers.length;

    if (this.configuredUsers.length === 0) {
      this.updateDisplay();
      return;
    }

    this.updatePanelVisibility(false);
    this.updatePanelIcon(false);
    this.set_applet_label("");
    this.set_applet_tooltip(_("Checking Duolingo activity..."));

    for (let userConfig of this.configuredUsers) {
      this.fetchUserActivity(userConfig);
    }

    this.refreshTimer = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      UPDATE_INTERVAL_SECONDS,
      () => {
        this.refresh();
        return GLib.SOURCE_REMOVE;
      }
    );
  },

  createDuolingoRequest: function(url, username) {
    let request = Soup.Message.new("GET", url);
    request.request_headers.append("Accept", DUOLINGO_ACCEPT);
    request.request_headers.append("Accept-Language", DUOLINGO_ACCEPT_LANGUAGE);
    request.request_headers.append("User-Agent", DUOLINGO_USER_AGENT);
    request.request_headers.append("Referer", "https://www.duolingo.com/profile/" + encodeURIComponent(username));
    return request;
  },

  loadResponseCache: function() {
    if (this.responseCache !== null) {
      return;
    }

    this.responseCache = { users: {}, lastSeen: {} };

    try {
      let [ok, contents] = GLib.file_get_contents(this.cachePath);
      if (!ok) {
        return;
      }

      let parsed = JSON.parse(ByteArray.toString(contents));
      if (parsed && parsed.users) {
        if (!parsed.lastSeen) {
          parsed.lastSeen = {};
        }
        this.responseCache = parsed;
      }
    } catch (err) {
      this.responseCache = { users: {}, lastSeen: {} };
    }
  },

  saveResponseCache: function() {
    try {
      GLib.mkdir_with_parents(CACHE_DIR, 0o700);
      GLib.file_set_contents(this.cachePath, JSON.stringify(this.responseCache));
    } catch (err) {
      global.logWarning(UUID + ": unable to write Duolingo response cache: " + err);
    }
  },

  cacheKeyForUser: function(userConfig) {
    return userConfig.username.toLowerCase();
  },

  cacheUserResponse: function(userConfig, user) {
    this.loadResponseCache();
    this.responseCache.users[this.cacheKeyForUser(userConfig)] = {
      cachedAt: Math.floor(Date.now() / 1000),
      user: user
    };
    this.saveResponseCache();
  },

  recordLastSeen: function(userConfig, timestamp) {
    this.loadResponseCache();
    let seenAt = timestamp || Math.floor(Date.now() / 1000);
    this.responseCache.lastSeen[this.cacheKeyForUser(userConfig)] = {
      seenAt: seenAt
    };
    this.saveResponseCache();
    return seenAt;
  },

  getLastSeen: function(userConfig) {
    this.loadResponseCache();
    let lastSeen = this.responseCache.lastSeen[this.cacheKeyForUser(userConfig)];

    if (lastSeen && typeof lastSeen.seenAt === "number") {
      return lastSeen.seenAt;
    }

    return 0;
  },

  recordCachedResponse: function(userConfig, status) {
    this.loadResponseCache();
    let cached = this.responseCache.users[this.cacheKeyForUser(userConfig)];

    if (cached && cached.user) {
      this.usedCache = true;
      this.recordResponse(userConfig, { users: [cached.user] }, true, cached);
      return;
    }

    this.recordError(userConfig, status);
  },

  fetchUserActivity: function(userConfig) {
    let url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(userConfig.username)}`;
    let request = this.createDuolingoRequest(url, userConfig.username);

    if (Soup.MAJOR_VERSION === 2) {
      soupASyncSession.queue_message(request, (session, message) => {
        if (message.status_code !== 200) {
          this.recordCachedResponse(userConfig, message.status_code);
          return;
        }

        try {
          this.recordResponse(userConfig, JSON.parse(message.response_body.data));
        } catch (err) {
          this.recordCachedResponse(userConfig, "parse");
        }
      });
    } else {
      soupASyncSession.send_and_read_async(request, Soup.MessagePriority.NORMAL, null, (session, response) => {
        if (request.get_status() !== 200) {
          this.recordCachedResponse(userConfig, request.get_status());
          return;
        }

        try {
          let bytes = session.send_and_read_finish(response);
          this.recordResponse(userConfig, JSON.parse(ByteArray.toString(ByteArray.fromGBytes(bytes))));
        } catch (err) {
          this.recordCachedResponse(userConfig, "parse");
        }
      });
    }
  },

  recordResponse: function(userConfig, responseParsed, fromCache, cachedResponse) {
    if (!responseParsed.users || responseParsed.users.length === 0) {
      this.recordError(userConfig, "not-found");
      return;
    }

    let user = responseParsed.users[0];
    if (fromCache !== true) {
      this.cacheUserResponse(userConfig, user);
    }

    let active = this.isTruthyActivity(user.hasRecentActivity15);
    let lastSeen = this.getLastSeen(userConfig);

    if (active && fromCache !== true) {
      lastSeen = this.recordLastSeen(userConfig);
    } else if (active && lastSeen === 0 && cachedResponse && typeof cachedResponse.cachedAt === "number") {
      lastSeen = cachedResponse.cachedAt;
    }

    if (active) {
      this.activeUsers.push(this.withActivityState(userConfig, true, lastSeen));
    } else {
      this.inactiveUsers.push(this.withActivityState(userConfig, false, lastSeen));
    }

    this.finishRequest();
  },

  withActivityState: function(userConfig, active, lastSeen) {
    return {
      username: userConfig.username,
      displayUsername: userConfig.displayUsername,
      highlighted: userConfig.highlighted,
      active: active,
      lastSeen: lastSeen || 0
    };
  },

  recordError: function(userConfig, status) {
    this.errors.push({
      displayUsername: userConfig.displayUsername,
      error: status === "not-found" ? _("not found") : formatString(_("Error %s"), [status])
    });
    this.finishRequest();
  },

  finishRequest: function() {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.updateDisplay();
    }
  },

  isTruthyActivity: function(value) {
    if (value === true) {
      return true;
    }

    if (typeof value === "number") {
      return value !== 0;
    }

    if (typeof value === "string") {
      let normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
    }

    return false;
  },

  updateDisplay: function() {
    if (this.configuredUsers.length === 0) {
      this.updatePanelVisibility(false);
      this.updatePanelIcon(false);
      this.set_applet_label("");
      this.set_applet_tooltip(_("Duolingo Activity") + "\n" + _("No users configured"));
      this.rebuildMenu();
      return;
    }

    this.activeUsers.sort((a, b) => this.compareUsersByActivity(a, b));
    this.inactiveUsers.sort((a, b) => this.compareUsersByActivity(a, b));
    this.errors.sort((a, b) => a.displayUsername.localeCompare(b.displayUsername));

    this.set_applet_label(this.activeUsers.length > 0 ? String(this.activeUsers.length) : "");
    this.updatePanelIcon(this.activeUsers.length > 0);
    this.updatePanelVisibility(this.activeUsers.length > 0);
    this.set_applet_tooltip(this.buildTooltip(), true);
    this.rebuildMenu();
  },

  compareUsersByActivity: function(a, b) {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    if (a.lastSeen !== b.lastSeen) {
      return b.lastSeen - a.lastSeen;
    }

    return a.displayUsername.localeCompare(b.displayUsername);
  },

  updatePanelVisibility: function(hasActiveUsers) {
    if (this.hideWhenInactive === true && !hasActiveUsers) {
      this.actor.hide();
    } else {
      this.actor.show();
    }
  },

  markupEscape: function(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  formatTooltipLine: function(line) {
    let text = this.markupEscape(line.text || "");
    if (!line.highlighted) {
      return text;
    }

    return '<span weight="bold" background="#4f6f2f" foreground="#ffffff">' + text + '</span>';
  },

  formatLastSeen: function(timestamp) {
    if (!timestamp || timestamp <= 0) {
      return _("never");
    }

    let date = new Date(timestamp * 1000);
    let pad = value => String(value).padStart(2, "0");
    return [
      pad(date.getDate()),
      pad(date.getMonth() + 1),
      date.getFullYear()
    ].join(".") + " " + pad(date.getHours()) + ":" + pad(date.getMinutes());
  },

  lastSeenTooltipText: function(user) {
    return formatString(_("Last seen: %s"), [this.formatLastSeen(user.lastSeen)]);
  },

  buildTooltip: function() {
    let lines = [];

    for (let user of this.activeUsers) {
      lines.push({
        text: formatString(_("%s is playing Duolingo right now!"), [user.displayUsername]),
        highlighted: this.highlightOnHover === true && user.highlighted === true
      });
    }

    if (lines.length === 0) {
      lines.push({
        text: _("No one is playing Duolingo right now.")
      });
    }

    for (let error of this.errors) {
      lines.push({
        text: error.displayUsername + ": " + error.error
      });
    }

    if (this.usedCache === true) {
      lines.push({
        text: _("Using cached Duolingo data")
      });
    }

    return lines.map(line => this.formatTooltipLine(line)).join("\n");
  },

  rebuildMenu: function() {
    if (!this.menu) {
      return;
    }

    this.menu.removeAll();

    if (this.configuredUsers.length === 0) {
      let configureUsers = new PopupMenu.PopupMenuItem(_("No users configured"));
      configureUsers.connect("activate", () => this.configureApplet());
      this.menu.addMenuItem(configureUsers);
    } else {
      this.addUserGroupToMenu(_("Active now:"), this.activeUsers, true);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.addUserGroupToMenu(_("Inactive:"), this.inactiveUsers, false);

      if (this.errors.length > 0) {
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        for (let error of this.errors) {
          let item = new PopupMenu.PopupMenuItem(error.displayUsername + ": " + error.error);
          item.setSensitive(false);
          this.menu.addMenuItem(item);
        }
      }
    }

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    let refreshNow = new PopupMenu.PopupMenuItem(_("Refresh now"));
    refreshNow.connect("activate", () => this.refresh());
    this.menu.addMenuItem(refreshNow);
  },

  addUserGroupToMenu: function(title, users, active) {
    let sectionTitle = new PopupMenu.PopupMenuItem(title);
    sectionTitle.setSensitive(false);
    this.menu.addMenuItem(sectionTitle);

    if (users.length === 0) {
      let empty = new PopupMenu.PopupMenuItem(active ? _("No active users") : _("No inactive users"));
      empty.setSensitive(false);
      this.menu.addMenuItem(empty);
      return;
    }

    for (let user of users) {
      let label = active
        ? formatString(_("%s is playing Duolingo right now!"), [user.displayUsername])
        : user.displayUsername;
      let item = new PopupMenu.PopupMenuItem(label);
      if (active || user.highlighted === true) {
        this.highlightMenuItem(item);
      }
      if (!active) {
        item._lastSeenTooltip = new Tooltips.Tooltip(item.actor, this.lastSeenTooltipText(user));
      }
      item.connect("activate", () => this.openProfile(user.username));
      this.menu.addMenuItem(item);
    }
  },

  openProfile: function(username) {
    let url = "https://www.duolingo.com/profile/" + encodeURIComponent(username);
    Util.spawn(["xdg-open", url]);
  },

  highlightMenuItem: function(item) {
    if (item.actor && item.actor.add_style_class_name) {
      item.actor.add_style_class_name("duolingo-activity-highlighted-user");
    }
  }
};

function main(metadata, orientation, panelHeight, instanceId) {
  return new DuolingoActivityApplet(metadata, orientation, panelHeight, instanceId);
}
