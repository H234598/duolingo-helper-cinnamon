const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Tooltips = imports.ui.tooltips;
const Util = imports.misc.util;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const ByteArray = imports.byteArray;

const UUID = "duolingo-activity@H234598";
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const UPDATE_INTERVAL_SECONDS = 300;
const MAX_VISIBLE_USERS = 200;
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
    this.refreshGeneration = 0;
    this.appletRemoved = false;
    this.pendingSoup2Messages = [];
    this.requestCancellable = null;
    this.loadingUsers = false;
    this.refreshTimer = 0;
    this.responseCache = null;
    this.cachePath = GLib.build_filenamev([CACHE_DIR, instanceId + ".json"]);
    this.usedCache = false;
    this.panelIcon = PANEL_ICON_AUTOMATIC;
    this.panelIconAutoMigrated = false;
    this.hideWhenInactive = false;
    this.highlightOnHover = false;
    this.menuNeedsRebuild = true;
    this.menuRowSlots = [];
    this.menuContentSection = null;

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
    if (this.menuNeedsRebuild) {
      this.syncMenu();
    }
    this.menu.toggle();
  },

  invalidateMenu: function() {
    this.menuNeedsRebuild = true;
    if (this.menu) {
      this.syncMenu();
    }
  },

  buildMenu: function(orientation) {
    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    this.menuRowSlots = [];
    this.menuContentSection = new PopupMenu.PopupMenuSection();
    this.menu.addMenuItem(this.menuContentSection);
    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this.refreshMenuItem = new PopupMenu.PopupMenuItem(_("Refresh now"));
    this.refreshMenuItem.connect("activate", () => this.refresh());
    this.menu.addMenuItem(this.refreshMenuItem);
    this.syncMenu();
  },

  on_applet_removed_from_panel: function() {
    this.appletRemoved = true;
    this.refreshGeneration++;
    this.cancelPendingRequests();
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }
    let menu = this.menu;
    if (menu && this.menuManager && this.menuManager.removeMenu) {
      this.menuManager.removeMenu(menu);
    }
    this.destroyMenuRowSlots();
    if (menu && menu.destroy) {
      menu.destroy();
    }
    if (this.settings && this.settings.finalize) {
      this.settings.finalize();
    }
    this.menu = null;
    this.menuManager = null;
    this.settings = null;
    this.menuContentSection = null;
    this.refreshMenuItem = null;
    this.pendingSoup2Messages = null;
    this.requestCancellable = null;
  },

  beginRequestBatch: function() {
    this.cancelPendingRequests();
    this.pendingSoup2Messages = [];
    this.requestCancellable = Soup.MAJOR_VERSION === 2 ? null : new Gio.Cancellable();
  },

  trackSoup2Message: function(message) {
    if (!this.pendingSoup2Messages) {
      this.pendingSoup2Messages = [];
    }
    this.pendingSoup2Messages.push(message);
  },

  untrackSoup2Message: function(message) {
    if (!this.pendingSoup2Messages) {
      return;
    }
    this.pendingSoup2Messages = this.pendingSoup2Messages.filter(current => current !== message);
  },

  cancelPendingRequests: function() {
    if (this.requestCancellable && this.requestCancellable.cancel) {
      this.requestCancellable.cancel();
    }
    this.requestCancellable = null;

    let messages = this.pendingSoup2Messages || [];
    this.pendingSoup2Messages = [];
    if (Soup.MAJOR_VERSION === 2 && soupASyncSession.cancel_message) {
      for (let message of messages) {
        soupASyncSession.cancel_message(message, Soup.Status.CANCELLED);
      }
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
    if (this.appletRemoved) {
      return;
    }
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }

    this.configuredUsers = this.getConfiguredUsers();
    this.activeUsers = [];
    this.inactiveUsers = [];
    this.errors = [];
    this.usedCache = false;
    this.refreshGeneration++;
    let generation = this.refreshGeneration;
    this.beginRequestBatch();
    this.pendingRequests = this.configuredUsers.length;
    this.loadingUsers = this.configuredUsers.length > 0;

    if (this.configuredUsers.length === 0) {
      this.updateDisplay();
      return;
    }

    this.updatePanelVisibility(false);
    this.updatePanelIcon(false);
    this.set_applet_label("");
    this.set_applet_tooltip(_("Checking Duolingo activity..."));
    this.invalidateMenu();

    for (let userConfig of this.configuredUsers) {
      this.fetchUserActivity(userConfig, generation);
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

  recordCachedResponse: function(userConfig, status, generation) {
    if (this.appletRemoved || generation !== this.refreshGeneration) {
      return;
    }
    this.loadResponseCache();
    let cached = this.responseCache.users[this.cacheKeyForUser(userConfig)];

    if (cached && cached.user) {
      this.usedCache = true;
      this.recordResponse(userConfig, { users: [cached.user] }, true, cached, generation);
      return;
    }

    this.recordError(userConfig, status, generation);
  },

  fetchUserActivity: function(userConfig, generation) {
    let url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(userConfig.username)}`;
    let request = this.createDuolingoRequest(url, userConfig.username);

    if (Soup.MAJOR_VERSION === 2) {
      this.trackSoup2Message(request);
      soupASyncSession.queue_message(request, (session, message) => {
        this.untrackSoup2Message(request);
        if (message.status_code !== 200) {
          this.recordCachedResponse(userConfig, message.status_code, generation);
          return;
        }

        try {
          this.recordResponse(userConfig, JSON.parse(message.response_body.data), false, null, generation);
        } catch (err) {
          this.recordCachedResponse(userConfig, "parse", generation);
        }
      });
    } else {
      soupASyncSession.send_and_read_async(
        request,
        Soup.MessagePriority.NORMAL,
        this.requestCancellable,
        (session, response) => {
          if (request.get_status() !== 200) {
            this.recordCachedResponse(userConfig, request.get_status(), generation);
            return;
          }

          try {
            let bytes = session.send_and_read_finish(response);
            this.recordResponse(userConfig, JSON.parse(ByteArray.toString(ByteArray.fromGBytes(bytes))), false, null, generation);
          } catch (err) {
            this.recordCachedResponse(userConfig, "parse", generation);
          }
        }
      );
    }
  },

  recordResponse: function(userConfig, responseParsed, fromCache, cachedResponse, generation) {
    if (this.appletRemoved || generation !== this.refreshGeneration) {
      return;
    }
    if (!responseParsed.users || responseParsed.users.length === 0) {
      this.recordError(userConfig, "not-found", generation);
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

  recordError: function(userConfig, status, generation) {
    if (this.appletRemoved || generation !== this.refreshGeneration) {
      return;
    }
    this.errors.push({
      displayUsername: userConfig.displayUsername,
      error: status === "not-found" ? _("not found") : formatString(_("Error %s"), [status])
    });
    this.finishRequest();
  },

  finishRequest: function() {
    if (this.appletRemoved) {
      return;
    }
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.loadingUsers = false;
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
      this.invalidateMenu();
      return;
    }

    this.activeUsers.sort((a, b) => this.compareUsersByActivity(a, b));
    this.inactiveUsers.sort((a, b) => this.compareUsersByActivity(a, b));
    this.errors.sort((a, b) => a.displayUsername.localeCompare(b.displayUsername));

    this.set_applet_label(this.activeUsers.length > 0 ? String(this.activeUsers.length) : "");
    this.updatePanelIcon(this.activeUsers.length > 0);
    this.updatePanelVisibility(this.activeUsers.length > 0);
    this.set_applet_tooltip(this.buildTooltip(), true);
    this.invalidateMenu();
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

  limitVisibleUsers: function(users) {
    let allUsers = users || [];
    return {
      users: allUsers.slice(0, MAX_VISIBLE_USERS),
      omittedCount: Math.max(0, allUsers.length - MAX_VISIBLE_USERS)
    };
  },

  omittedUsersLabel: function(count) {
    return formatString(_("%s weitere Benutzer nicht angezeigt"), [count]);
  },

  buildTooltip: function() {
    let lines = [];
    let visibleRecords = this.activeUsers
      .map(user => ({ type: "active", user: user }))
      .concat(this.errors.map(error => ({ type: "error", user: error })));
    let limited = this.limitVisibleUsers(visibleRecords);
    let visibleActiveUsers = limited.users
      .filter(record => record.type === "active")
      .map(record => record.user);
    let visibleErrors = limited.users
      .filter(record => record.type === "error")
      .map(record => record.user);

    for (let user of visibleActiveUsers) {
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

    for (let error of visibleErrors) {
      lines.push({
        text: error.displayUsername + ": " + error.error
      });
    }

    if (this.usedCache === true) {
      lines.push({
        text: _("Using cached Duolingo data")
      });
    }

    if (limited.omittedCount > 0) {
      lines.push({ text: this.omittedUsersLabel(limited.omittedCount) });
    }

    return lines.map(line => this.formatTooltipLine(line)).join("\n");
  },

  createMenuRowSlot: function() {
    if (!this.menuContentSection || !this.menuRowSlots) {
      return null;
    }

    let slot = {
      currentAction: null,
      currentUsername: null,
      isUserSlot: false,
      tooltip: null,
      item: new PopupMenu.PopupMenuItem(""),
      separator: new PopupMenu.PopupSeparatorMenuItem()
    };
    slot.item.connect("activate", () => {
      if (slot.currentAction === "configure") {
        this.configureApplet();
      } else if (slot.currentAction === "profile" && slot.currentUsername) {
        this.openProfile(slot.currentUsername);
      }
    });
    slot.item.actor.hide();
    slot.separator.actor.hide();
    this.menuContentSection.addMenuItem(slot.item);
    this.menuContentSection.addMenuItem(slot.separator);
    this.menuRowSlots.push(slot);
    return slot;
  },

  updateMenuSlotTooltip: function(slot, text) {
    if (!text) {
      if (slot.tooltip && slot.tooltip.set_text) {
        slot.tooltip.set_text("");
      }
      return;
    }

    if (slot.tooltip && slot.tooltip.set_text) {
      slot.tooltip.set_text(text);
    } else if (slot.item.actor) {
      slot.tooltip = new Tooltips.Tooltip(slot.item.actor, text);
    }
  },

  renderMenuRows: function(descriptors) {
    if (!this.menuContentSection || !this.menuRowSlots) {
      return;
    }

    for (let index = 0; index < descriptors.length; index++) {
      let descriptor = descriptors[index];
      let slot = this.menuRowSlots[index] || this.createMenuRowSlot();
      if (!slot) {
        return;
      }

      slot.currentAction = descriptor.action || null;
      slot.currentUsername = descriptor.username || null;
      slot.isUserSlot = descriptor.isUser === true;
      this.updateMenuSlotTooltip(slot, descriptor.tooltip || "");

      if (descriptor.type === "separator") {
        slot.item.actor.hide();
        slot.separator.actor.show();
        continue;
      }

      slot.separator.actor.hide();
      slot.item.actor.show();
      slot.item.label.set_text(descriptor.text || "");
      slot.item.setSensitive(descriptor.sensitive === true);
      if (slot.item.actor.remove_style_class_name) {
        slot.item.actor.remove_style_class_name("duolingo-activity-highlighted-user");
      }
      if (descriptor.highlighted === true) {
        this.highlightMenuItem(slot.item);
      }
    }

    for (let index = descriptors.length; index < this.menuRowSlots.length; index++) {
      let slot = this.menuRowSlots[index];
      slot.currentAction = null;
      slot.currentUsername = null;
      slot.isUserSlot = false;
      this.updateMenuSlotTooltip(slot, "");
      slot.item.actor.hide();
      slot.separator.actor.hide();
    }
  },

  buildMenuDescriptors: function() {
    if (this.loadingUsers === true && this.activeUsers.length === 0 &&
        this.inactiveUsers.length === 0 && this.errors.length === 0) {
      return [{ text: _("Checking Duolingo activity..."), sensitive: false }];
    }

    if (this.configuredUsers.length === 0) {
      return [{
        text: _("No users configured"),
        sensitive: true,
        action: "configure"
      }];
    }

    let records = this.activeUsers
      .map(user => ({ type: "active", user: user }))
      .concat(this.inactiveUsers.map(user => ({ type: "inactive", user: user })))
      .concat(this.errors.map(error => ({ type: "error", user: error })));
    let limited = this.limitVisibleUsers(records);
    let visibleActive = limited.users.filter(record => record.type === "active");
    let visibleInactive = limited.users.filter(record => record.type === "inactive");
    let visibleErrors = limited.users.filter(record => record.type === "error");
    let descriptors = [{ text: _("Active now:"), sensitive: false }];

    if (this.activeUsers.length === 0) {
      descriptors.push({ text: _("No active users"), sensitive: false });
    } else {
      for (let record of visibleActive) {
        descriptors.push({
          text: formatString(_("%s is playing Duolingo right now!"), [record.user.displayUsername]),
          sensitive: true,
          action: "profile",
          username: record.user.username,
          highlighted: true,
          isUser: true
        });
      }
    }

    descriptors.push({ type: "separator" });
    descriptors.push({ text: _("Inactive:"), sensitive: false });
    if (this.inactiveUsers.length === 0) {
      descriptors.push({ text: _("No inactive users"), sensitive: false });
    } else {
      for (let record of visibleInactive) {
        descriptors.push({
          text: record.user.displayUsername,
          sensitive: true,
          action: "profile",
          username: record.user.username,
          highlighted: record.user.highlighted === true,
          tooltip: this.lastSeenTooltipText(record.user),
          isUser: true
        });
      }
    }

    if (visibleErrors.length > 0) {
      descriptors.push({ type: "separator" });
      for (let record of visibleErrors) {
        descriptors.push({
          text: record.user.displayUsername + ": " + record.user.error,
          sensitive: false,
          isUser: true
        });
      }
    }

    if (limited.omittedCount > 0) {
      descriptors.push({ type: "separator" });
      descriptors.push({
        text: this.omittedUsersLabel(limited.omittedCount),
        sensitive: false
      });
    }

    return descriptors;
  },

  syncMenu: function() {
    if (!this.menu) {
      this.menuNeedsRebuild = true;
      return;
    }

    this.renderMenuRows(this.buildMenuDescriptors());
    this.menuNeedsRebuild = false;
  },

  rebuildMenu: function() {
    this.syncMenu();
  },

  destroyMenuRowSlots: function() {
    if (!this.menuRowSlots) {
      return;
    }
    for (let slot of this.menuRowSlots) {
      if (slot.tooltip && slot.tooltip.destroy) {
        slot.tooltip.destroy();
      }
      slot.tooltip = null;
    }
    this.menuRowSlots = null;
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
