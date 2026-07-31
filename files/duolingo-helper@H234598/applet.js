const Applet = imports.ui.applet;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const ModalDialog = imports.ui.modalDialog;
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

const UUID = "duolingo-helper@H234598";
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const UPDATE_INTERVAL_SECONDS = 60;
const CACHE_RETRY_INTERVAL_SECONDS = 30;
const PANEL_ICON_AUTOMATIC = "automatic";
const PANEL_ICON_RANDOM = "random";
const BRAND_ASSET_PATH = "assets/duolingo-brand/";
const CACHE_DIR = GLib.build_filenamev([GLib.get_user_cache_dir(), UUID]);
const AUTH_FILE_PATH = GLib.build_filenamev([GLib.get_user_config_dir(), UUID, "auth.json"]);
const SETTINGS_SCHEMA_PATH = APPLET_PATH + "/settings-schema.json";
const CLICK_MENU_SCROLL_MAX_HEIGHT = 720;
const DUOLINGO_ACCEPT = "application/json,text/plain,*/*";
const DUOLINGO_ACCEPT_LANGUAGE = "de-DE,de;q=0.9,en;q=0.8";
const DUOLINGO_USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";
const PANEL_ICONS = {
  "icon": BRAND_ASSET_PATH + "icon.svg",
  "avatar-square": BRAND_ASSET_PATH + "avatar-square.svg",
  "avatar-rounded": BRAND_ASSET_PATH + "avatar-rounded.svg",
  "avatar-circle": BRAND_ASSET_PATH + "avatar-circle.svg",
  "avatar-mask": BRAND_ASSET_PATH + "avatar-mask.svg",
  "duoplatt": BRAND_ASSET_PATH + "duoplatt.svg",
  "duo-growth-chart": BRAND_ASSET_PATH + "01_duo_growth_chart_owl_luxury.svg",
  "duo-orange-sunburst": BRAND_ASSET_PATH + "02_duo_orange_sunburst_owl_luxury.svg",
  "duo-angry-cyber-grid": BRAND_ASSET_PATH + "03_duo_angry_cyber_grid_owl_luxury.svg",
  "duo-tired-bandage": BRAND_ASSET_PATH + "04_duo_tired_bandage_owl_luxury.svg",
  "duo-red-eyes-elevator": BRAND_ASSET_PATH + "05_duo_red_eyes_elevator_owl_luxury.svg",
  "duo-red-demon": BRAND_ASSET_PATH + "06_duo_red_demon_owl_luxury.svg",
  "duo-horror-black-eyes": BRAND_ASSET_PATH + "07_duo_horror_black_eyes_owl_luxury.svg",
  "royal": BRAND_ASSET_PATH + "royal-owl.svg",
  "cyberpunk": BRAND_ASSET_PATH + "cyberpunk-owl.svg",
  "sleepy": BRAND_ASSET_PATH + "sleepy-owl.svg",
  "wizard": BRAND_ASSET_PATH + "wizard-owl.svg",
  "rocker": BRAND_ASSET_PATH + "rocker-owl.svg",
  "astronaut": BRAND_ASSET_PATH + "astronaut-owl.svg",
  "pirate": BRAND_ASSET_PATH + "pirate-owl.svg",
  "samurai": BRAND_ASSET_PATH + "samurai-owl.svg",
  "vampire": BRAND_ASSET_PATH + "vampire-owl.svg",
  "chef": BRAND_ASSET_PATH + "chef-owl.svg",
  "detective": BRAND_ASSET_PATH + "detective-owl.svg",
  "knight": BRAND_ASSET_PATH + "knight-owl.svg",
  "surfer": BRAND_ASSET_PATH + "surfer-owl.svg",
  "gamer": BRAND_ASSET_PATH + "gamer-owl.svg",
  "gardener": BRAND_ASSET_PATH + "gardener-owl.svg",
  "ninja": BRAND_ASSET_PATH + "ninja-owl.svg",
  "disco": BRAND_ASSET_PATH + "disco-owl.svg",
  "scientist": BRAND_ASSET_PATH + "scientist-owl.svg",
  "firefighter": BRAND_ASSET_PATH + "firefighter-owl.svg",
  "artist": BRAND_ASSET_PATH + "artist-owl.svg",
  "beekeeper": BRAND_ASSET_PATH + "beekeeper-owl.svg",
  "mariachi": BRAND_ASSET_PATH + "mariachi-owl.svg",
  "librarian": BRAND_ASSET_PATH + "librarian-owl.svg",
  "boxer": BRAND_ASSET_PATH + "boxer-owl.svg",
  "pharaoh": BRAND_ASSET_PATH + "pharaoh-owl.svg",
  "skier": BRAND_ASSET_PATH + "skier-owl.svg",
  "mechanic": BRAND_ASSET_PATH + "mechanic-owl.svg",
  "dj": BRAND_ASSET_PATH + "dj-owl.svg",
  "movie-director": BRAND_ASSET_PATH + "movie-director-owl.svg",
  "superhero": BRAND_ASSET_PATH + "superhero-owl.svg"
};
const LEGACY_PANEL_ICON_KEYS = {
  "vector-beekeeper": "beekeeper",
  "vector-mariachi": "mariachi",
  "vector-librarian": "librarian",
  "vector-boxer": "boxer",
  "vector-pharaoh": "pharaoh",
  "vector-skier": "skier",
  "vector-mechanic": "mechanic",
  "vector-dj": "dj",
  "vector-movie-director": "movie-director",
  "vector-superhero": "superhero"
};
const RANDOM_PANEL_ICON_KEYS = [
  "avatar-square",
  "avatar-rounded",
  "avatar-circle",
  "avatar-mask",
  "duoplatt",
  "duo-growth-chart",
  "duo-orange-sunburst",
  "duo-angry-cyber-grid",
  "duo-tired-bandage",
  "duo-red-eyes-elevator",
  "duo-red-demon",
  "duo-horror-black-eyes",
  "royal",
  "cyberpunk",
  "sleepy",
  "wizard",
  "rocker",
  "astronaut",
  "pirate",
  "samurai",
  "vampire",
  "chef",
  "detective",
  "knight",
  "surfer",
  "gamer",
  "gardener",
  "ninja",
  "disco",
  "scientist",
  "firefighter",
  "artist",
  "beekeeper",
  "mariachi",
  "librarian",
  "boxer",
  "pharaoh",
  "skier",
  "mechanic",
  "dj",
  "movie-director",
  "superhero"
];
const DISPLAY_MODE_NONE = "none";
const DISPLAY_MODE_SUMMARY = "summary";
const DISPLAY_MODE_COURSES = "courses";
const DISPLAY_MODE_ACCOUNT = "account";
const DISPLAY_MODE_ALL = "all";
const DISPLAY_MODE_ME = "me";
const DISPLAY_MODE_SUMMARY_ME = "summary-me";
const DISPLAY_MODE_COURSES_ME = "courses-me";
const DISPLAY_MODE_ACCOUNT_ME = "account-me";
const DISPLAY_MODE_ALL_ME = "all-me";
const PANEL_DISPLAY_COMPACT = "compact";
const PANEL_DISPLAY_USERS = "users";
const PANEL_DISPLAY_ACTIVE_USERS = "active-users";
const PANEL_DISPLAY_STREAK = "streak";
const PANEL_DISPLAY_XP = "xp";
const PANEL_DISPLAY_ME = "me";
const PANEL_DISPLAY_NONE = "none";
const SORT_ORDER_CONFIGURED = "configured";
const SORT_ORDER_USERNAME_ASC = "username-asc";
const SORT_ORDER_USERNAME_DESC = "username-desc";
const SORT_ORDER_STREAK_DESC = "streak-desc";
const SORT_ORDER_STREAK_ASC = "streak-asc";
const SORT_ORDER_XP_DESC = "xp-desc";
const SORT_ORDER_XP_ASC = "xp-asc";

Gettext.bindtextdomain(UUID, GLib.get_user_data_dir() + "/locale");

function _(str) {
  return Gettext.dgettext(UUID, str);
}

function localizedFallback(str, fallback) {
  let translated = _(str);
  if (translated !== str) {
    return translated;
  }

  let lang = GLib.getenv("LANG") || "";
  return lang.indexOf("de") === 0 ? fallback : str;
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

function MyApplet(metadata, orientation, panelHeight, instanceId) {
  this._init(metadata, orientation, panelHeight, instanceId);
}

MyApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function(metadata, orientation, panelHeight, instanceId) {
    Applet.TextIconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

    this.metadata = metadata;
    this.instanceId = instanceId;
    this.usernames = [];
    this.userData = [];
    this.pendingRequests = 0;
    this.refreshGeneration = 0;
    this.appletRemoved = false;
    this.loadingUsers = false;
    this.refreshTimer = 0;
    this.currentRefreshIntervalSeconds = UPDATE_INTERVAL_SECONDS;
    this.responseCache = null;
    this.cachePath = GLib.build_filenamev([CACHE_DIR, instanceId + ".json"]);
    this.authConfig = null;
    this.testOnlineUsers = {};
    this.usedCache = false;
    this.hoverDisplayMode = DISPLAY_MODE_SUMMARY;
    this.clickDisplayMode = DISPLAY_MODE_COURSES;
    this.hoverSelfOnly = false;
    this.clickSelfOnly = true;
    this.panelDisplayMode = PANEL_DISPLAY_COMPACT;
    this.panelIcon = PANEL_ICON_AUTOMATIC;
    this.hideWhenInactive = false;
    this.activityTrackingEnabled = true;
    this.onlineMessage = "Serve the owl";
    this.offlineMessage = "$user bites mice";
    this.highlightOnHover = false;
    this.highlightActiveUsersOnHover = true;
    this.highlightOnClick = true;
    this.highlightActiveUsersOnClick = true;
    this.sortOrder = SORT_ORDER_STREAK_DESC;
    this.randomPanelIconHour = -1;
    this.randomPanelIconKey = "avatar-rounded";
    this.lastPanelIcon = this.panelIcon;
    this.lastAppliedPanelIconPath = "";
    this.activeUsernamesSnapshot = null;
    this.speechBubble = null;
    this.speechBubbleTimer = 0;
    this.speechBubbleRotationTimer = 0;
    this.speechBubbleRotationIndex = 0;
    this.menuNeedsRebuild = true;

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
      "hover-self-only",
      "hoverSelfOnly",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "hover-display-mode",
      "hoverDisplayMode",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "click-self-only",
      "clickSelfOnly",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "click-display-mode",
      "clickDisplayMode",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "panel-display-mode",
      "panelDisplayMode",
      this.onDisplaySettingsChanged,
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
      "hide-when-inactive",
      "hideWhenInactive",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "activity-tracking-enabled",
      "activityTrackingEnabled",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "online-message",
      "onlineMessage",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "offline-message",
      "offlineMessage",
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
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "highlight-active-users-on-hover",
      "highlightActiveUsersOnHover",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "highlight-on-click",
      "highlightOnClick",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "highlight-active-users-on-click",
      "highlightActiveUsersOnClick",
      this.onDisplaySettingsChanged,
      null
    );
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "sort-order",
      "sortOrder",
      this.onDisplaySettingsChanged,
      null
    );

    this.updatePanelIcon();
    this.set_applet_label("Duo");
    this.set_applet_tooltip(_("Duolingo Helper"));

    this.addSettingsMenuItem();
    this.buildMenu(orientation);
    this.registerDebugInstance();
    this.migrateStandaloneUsers();
    this.refresh();
  },

  registerDebugInstance: function() {
    if (!global.duolingoHelperInstances) {
      global.duolingoHelperInstances = {};
    }
    global.duolingoHelperInstances[this.instanceId] = this;
  },

  addSettingsMenuItem: function() {
    this.settingsMenuItem = new PopupMenu.PopupBaseMenuItem();
    let settingsIcon = new St.Icon({
      gicon: Gio.icon_new_for_string(APPLET_PATH + "/" + PANEL_ICONS["mechanic"]),
      style_class: "popup-menu-icon"
    });
    this.settingsMenuItem.label = new St.Label({ text: _("Settings") });
    this.settingsMenuItem.actor.label_actor = this.settingsMenuItem.label;
    this.settingsMenuItem.addActor(settingsIcon, { span: 0 });
    this.settingsMenuItem.addActor(this.settingsMenuItem.label);
    this.settingsMenuItem.connect("activate", () => this.configureApplet());
    this._applet_context_menu.addMenuItem(this.settingsMenuItem);
  },

  buildMenu: function(orientation) {
    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    this.rebuildMenu();
  },

  on_applet_clicked: function() {
    if (this.menuNeedsRebuild && this.menu.isOpen !== true) {
      this.rebuildMenu();
    }
    this.menu.toggle();
  },

  invalidateMenu: function() {
    this.menuNeedsRebuild = true;
  },

  on_applet_removed_from_panel: function() {
    this.appletRemoved = true;
    this.refreshGeneration++;
    if (global.duolingoHelperInstances && global.duolingoHelperInstances[this.instanceId] === this) {
      delete global.duolingoHelperInstances[this.instanceId];
    }
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }
    this._testStopSpeechBubbleRotation();
    this.destroySpeechBubble();
    let menu = this.menu;
    if (menu && this.menuManager && this.menuManager.removeMenu) {
      this.menuManager.removeMenu(menu);
    }
    if (menu && menu.destroy) {
      menu.destroy();
    }
    if (this.settings && this.settings.finalize) {
      this.settings.finalize();
    }
    this.menu = null;
    this.menuManager = null;
    this.settings = null;
    this.clickMenuSection = null;
    this.clickMenuScrollView = null;
    this.clickMenuScrollItem = null;
  },

  loadFactoryDefaults: function() {
    let [ok, contents] = GLib.file_get_contents(SETTINGS_SCHEMA_PATH);
    if (!ok) {
      throw new Error("Unable to read settings schema");
    }

    let schema = JSON.parse(ByteArray.toString(contents));
    let defaults = {};
    for (let key in schema) {
      if (schema[key] && Object.prototype.hasOwnProperty.call(schema[key], "default")) {
        defaults[key] = schema[key].default;
      }
    }

    return defaults;
  },

  factoryReset: function() {
    let dialog = new ModalDialog.ConfirmDialog(
      _("Reset all Duolingo Helper settings to factory defaults and restart Cinnamon?"),
      () => this.performFactoryReset()
    );
    dialog.open();
  },

  performFactoryReset: function() {
    try {
      let defaults = this.loadFactoryDefaults();
      for (let key in defaults) {
        try {
          this.settings.setValue(key, defaults[key]);
        } catch (err) {
          global.logError("Duolingo Helper factory reset skipped setting " + key + ": " + err);
        }
      }
    } catch (err) {
      global.logError("Duolingo Helper factory reset failed: " + err);
      return;
    }

    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
      if (Main.restartCinnamon) {
        Main.restartCinnamon(true);
      } else {
        global.reexec_self();
      }
      return GLib.SOURCE_REMOVE;
    });
  },

  _testFactoryDefaults: function() {
    let defaults = this.loadFactoryDefaults();
    return JSON.stringify({
      users: defaults.users,
      panelDisplayMode: defaults["panel-display-mode"],
      hideWhenInactive: defaults["hide-when-inactive"],
      highlightOnHover: defaults["highlight-on-hover"]
    });
  },

  onSettingsChanged: function() {
    this.migrateStandaloneUsers();
    this.refresh();
  },

  migrateStandaloneUsers: function() {
    let rows = this.users || [];
    let changed = false;
    let normalizedRows = [];

    for (let row of rows) {
      let normalizedRow = this.cloneUserRow(row);
      if (typeof normalizedRow.standalone !== "boolean") {
        normalizedRow.standalone = normalizedRow.isSelf === true || normalizedRow.showWithMe === true;
        changed = true;
      }
      if ("isSelf" in normalizedRow || "showWithMe" in normalizedRow) {
        delete normalizedRow.isSelf;
        delete normalizedRow.showWithMe;
        changed = true;
      }
      normalizedRows.push(normalizedRow);
    }

    if (changed) {
      this.users = normalizedRows;
      this.settings.setValue("users", normalizedRows);
    }
  },

  cloneUserRow: function(row) {
    let clone = {};
    for (let key in row) {
      clone[key] = row[key];
    }
    return clone;
  },

  onDisplaySettingsChanged: function() {
    this.migrateSpeechBubbleMessages();
    let previousPanelIcon = this.lastPanelIcon;
    this.lastPanelIcon = this.panelIcon;
    if (previousPanelIcon !== this.panelIcon && this.validPanelIcon(this.panelIcon) === PANEL_ICON_RANDOM) {
      this.randomPanelIconHour = Math.floor(Date.now() / 3600000);
      this.randomPanelIconKey = this.pickRandomPanelIconKey(this.randomPanelIconKey);
    }

    this.migrateLegacyDisplayModes();
    this.updatePanelIcon();
    this.updatePanelVisibility();
    this.updateDisplay();
  },

  migrateSpeechBubbleMessages: function() {
    if (this.onlineMessage === "Server the owl") {
      this.onlineMessage = "Serve the owl";
      this.settings.setValue("online-message", this.onlineMessage);
    }
  },

  validPanelIcon: function(iconKey) {
    if (iconKey === "icon") {
      return PANEL_ICON_AUTOMATIC;
    }

    if (LEGACY_PANEL_ICON_KEYS[iconKey]) {
      return LEGACY_PANEL_ICON_KEYS[iconKey];
    }

    if (iconKey === PANEL_ICON_AUTOMATIC || iconKey === PANEL_ICON_RANDOM || PANEL_ICONS[iconKey]) {
      return iconKey;
    }

    return PANEL_ICON_AUTOMATIC;
  },

  loadAuthConfig: function() {
    if (!GLib.file_test(AUTH_FILE_PATH, GLib.FileTest.EXISTS)) {
      return null;
    }

    try {
      this.warnIfAuthFileIsTooOpen();
      let [ok, contents] = GLib.file_get_contents(AUTH_FILE_PATH);
      if (!ok) {
        return null;
      }

      let parsed = JSON.parse(ByteArray.toString(contents));
      let username = String(parsed.username || parsed.user || "").trim();
      if (!username) {
        global.logWarning(UUID + ": auth file has no username/user field");
        return null;
      }

      let cookie = this.authCookieString(parsed);
      let headers = this.authHeaders(parsed);
      if (!cookie && Object.keys(headers).length === 0) {
        global.logWarning(UUID + ": auth file has neither cookie/cookies nor headers");
        return null;
      }

      return {
        username: username,
        key: username.toLowerCase(),
        cookie: cookie,
        headers: headers
      };
    } catch (err) {
      global.logWarning(UUID + ": unable to read auth file: " + err);
      return null;
    }
  },

  warnIfAuthFileIsTooOpen: function() {
    try {
      let info = Gio.File.new_for_path(AUTH_FILE_PATH).query_info(
        "unix::mode",
        Gio.FileQueryInfoFlags.NONE,
        null
      );
      let mode = info.get_attribute_uint32("unix::mode") & 0o777;
      if ((mode & 0o077) !== 0) {
        global.logWarning(UUID + ": auth file should be readable only by the owner: chmod 600 " + AUTH_FILE_PATH);
      }
    } catch (err) {
      // Filesystems without unix::mode support can still use the auth file.
    }
  },

  authCookieString: function(parsed) {
    if (typeof parsed.cookie === "string" && parsed.cookie.trim()) {
      return parsed.cookie.trim();
    }

    let cookies = parsed.cookies || {};
    if (typeof cookies !== "object" || cookies === null) {
      cookies = {};
    }

    if (typeof parsed.jwt_token === "string" && parsed.jwt_token.trim()) {
      cookies.jwt_token = parsed.jwt_token.trim();
    }

    let parts = [];
    for (let key in cookies) {
      if (!Object.prototype.hasOwnProperty.call(cookies, key)) {
        continue;
      }
      let value = cookies[key];
      if (value === null || value === undefined || String(value).length === 0) {
        continue;
      }
      parts.push(key + "=" + String(value));
    }

    return parts.join("; ");
  },

  authHeaders: function(parsed) {
    let headers = parsed.headers || {};
    if (typeof headers !== "object" || headers === null) {
      return {};
    }

    let cleanHeaders = {};
    for (let key in headers) {
      if (!Object.prototype.hasOwnProperty.call(headers, key)) {
        continue;
      }
      let value = headers[key];
      if (value === null || value === undefined || String(value).length === 0) {
        continue;
      }
      cleanHeaders[key] = String(value);
    }

    return cleanHeaders;
  },

  authConfigForUser: function(userConfig) {
    if (!this.authConfig) {
      return null;
    }

    return this.cacheKeyForUser(userConfig) === this.authConfig.key ? this.authConfig : null;
  },

  createDuolingoRequest: function(url, username, authConfig) {
    let request = Soup.Message.new("GET", url);
    request.request_headers.append("Accept", DUOLINGO_ACCEPT);
    request.request_headers.append("Accept-Language", DUOLINGO_ACCEPT_LANGUAGE);
    request.request_headers.append("User-Agent", DUOLINGO_USER_AGENT);
    request.request_headers.append("Referer", "https://www.duolingo.com/profile/" + encodeURIComponent(username));
    if (authConfig) {
      for (let headerName in authConfig.headers) {
        if (!Object.prototype.hasOwnProperty.call(authConfig.headers, headerName)) {
          continue;
        }
        if (headerName.toLowerCase() === "cookie") {
          continue;
        }
        request.request_headers.append(headerName, authConfig.headers[headerName]);
      }
      if (authConfig.cookie) {
        request.request_headers.append("Cookie", authConfig.cookie);
      }
    }
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

  cacheUserResponse: function(userConfig, user, authenticated) {
    this.loadResponseCache();
    this.responseCache.users[this.cacheKeyForUser(userConfig)] = {
      cachedAt: Math.floor(Date.now() / 1000),
      authenticated: authenticated === true,
      user: this.userForCache(user, authenticated === true)
    };
    this.saveResponseCache();
  },

  userForCache: function(user, authenticated) {
    let cached = {
      username: user.username,
      id: user.id,
      name: user.name,
      streak: user.streak,
      totalXp: user.totalXp,
      courses: user.courses || [],
      currentCourseId: user.currentCourseId,
      learningLanguage: user.learningLanguage,
      fromLanguage: user.fromLanguage,
      hasPlus: user.hasPlus,
      hasRecentActivity15: user.hasRecentActivity15,
      creationDate: user.creationDate,
      emailVerified: user.emailVerified,
      profileCountry: user.profileCountry,
      liveOpsFeatures: user.liveOpsFeatures || [],
      achievements: user.achievements || []
    };

    if (authenticated === true) {
      let summary = this.authenticatedExperimentSummary(user);
      cached.authenticatedProfile = true;
      cached.authFieldCount = Object.keys(user || {}).length;
      cached.authExperimentMapCount = summary.maps;
      cached.authExperimentCount = summary.count;
      cached.authTreatedExperimentCount = summary.treated;
    }

    return cached;
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
    if (generation !== this.refreshGeneration) {
      return;
    }

    this.loadResponseCache();
    let cached = this.responseCache.users[this.cacheKeyForUser(userConfig)];

    if (cached && cached.user) {
      this.usedCache = true;
      this.recordResponse(userConfig, { users: [cached.user] }, true, cached, generation, cached.authenticated === true);
      return;
    }

    this.recordError(userConfig, status, generation);
  },

  updatePanelIcon: function() {
    let iconKey = this.currentPanelIconKey();
    let iconPath = PANEL_ICONS[iconKey] || PANEL_ICONS["icon"];
    let fullIconPath = APPLET_PATH + "/" + iconPath;
    if (this.lastAppliedPanelIconPath === fullIconPath) {
      return;
    }

    this.lastAppliedPanelIconPath = fullIconPath;
    this.set_applet_icon_path(fullIconPath);
  },

  currentPanelIconKey: function() {
    let selectedIcon = this.validPanelIcon(this.panelIcon);

    if (selectedIcon === PANEL_ICON_AUTOMATIC && this.selfUserIsActive()) {
      return "duo-growth-chart";
    }

    if (selectedIcon === PANEL_ICON_AUTOMATIC) {
      return this.automaticPanelIconKey();
    }

    if (selectedIcon === PANEL_ICON_RANDOM) {
      return this.randomPanelIconKeyForCurrentHour();
    }

    return selectedIcon;
  },

  selfUserIsActive: function() {
    let selfUser = this.getSelfUser(this.userData.filter(user => !user.error));
    return !!selfUser && selfUser.activeRecently === true;
  },

  automaticPanelIconKey: function() {
    let validUsers = this.userData.filter(user => !user.error);
    if (validUsers.length === 0) {
      return "avatar-rounded";
    }

    let activeUsers = validUsers.filter(user => user.activeRecently === true);
    let activeRatio = activeUsers.length / validUsers.length;

    if (activeRatio > 0.9) {
      return "duoplatt";
    }
    if (activeRatio > 0.75) {
      return "avatar-mask";
    }
    if (activeRatio > 0.5) {
      return "avatar-circle";
    }

    return "avatar-rounded";
  },

  randomPanelIconKeyForCurrentHour: function() {
    let currentHour = Math.floor(Date.now() / 3600000);
    if (this.randomPanelIconHour !== currentHour || !PANEL_ICONS[this.randomPanelIconKey]) {
      this.randomPanelIconHour = currentHour;
      this.randomPanelIconKey = this.pickRandomPanelIconKey(this.randomPanelIconKey);
    }

    return this.randomPanelIconKey;
  },

  pickRandomPanelIconKey: function(excludeKey) {
    let iconKeys = RANDOM_PANEL_ICON_KEYS.filter(key => key !== excludeKey);
    if (iconKeys.length === 0) {
      iconKeys = RANDOM_PANEL_ICON_KEYS;
    }

    let entropy = GLib.get_real_time() % iconKeys.length;
    let index = Math.floor((Math.random() * iconKeys.length + entropy) % iconKeys.length);
    return iconKeys[index];
  },

  migrateLegacyDisplayModes: function() {
    if (this.isSelfDisplayMode(this.hoverDisplayMode)) {
      let detailMode = this.displayDetailMode(this.hoverDisplayMode);
      this.hoverSelfOnly = true;
      this.hoverDisplayMode = detailMode;
      this.settings.setValue("hover-self-only", true);
      this.settings.setValue("hover-display-mode", detailMode);
    }

    if (this.isSelfDisplayMode(this.clickDisplayMode)) {
      let detailMode = this.displayDetailMode(this.clickDisplayMode);
      this.clickSelfOnly = true;
      this.clickDisplayMode = detailMode;
      this.settings.setValue("click-self-only", true);
      this.settings.setValue("click-display-mode", detailMode);
    }
  },

  getConfiguredUsers: function() {
    let users = [];
    let seen = {};
    let selfSeen = false;
    let rows = this.users || [];

    for (let index = 0; index < rows.length; index++) {
      let row = rows[index];
      if (row.enabled === false) {
        continue;
      }

      let username = (row.username || "").trim();
      if (username.length === 0 || seen[username.toLowerCase()]) {
        continue;
      }

      seen[username.toLowerCase()] = true;
      let standalone = row.standalone === true || row.isSelf === true || row.showWithMe === true;
      let isSelf = standalone === true && !selfSeen;
      selfSeen = selfSeen || isSelf;
      users.push({
        username: username,
        displayUsername: (row.alias || "").trim() || username,
        highlighted: row.highlighted === true,
        simulateActive: row.simulateActive === true,
        standalone: standalone,
        isSelf: isSelf,
        index: index
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

    this.usernames = this.getConfiguredUsers();
    this.userData = [];
    this.usedCache = false;
    this.authConfig = this.loadAuthConfig();
    this.refreshGeneration++;
    let generation = this.refreshGeneration;
    this.pendingRequests = this.usernames.length;
    this.loadingUsers = this.usernames.length > 0;

    if (this.usernames.length === 0) {
      this.loadingUsers = false;
      this.set_applet_label(this.buildPanelLabel([]));
      this.updatePanelIcon();
      this.updatePanelVisibility();
      this.updateAppletTooltip();
      this.invalidateMenu();
      return;
    }

    this.set_applet_label("...");
    this.updatePanelIcon();
    this.updatePanelVisibility(false);
    this.updateAppletTooltip();
    this.invalidateMenu();
    for (let userConfig of this.usernames) {
      this.fetchUser(userConfig, generation);
    }

    this.scheduleNextRefresh(UPDATE_INTERVAL_SECONDS);
  },

  scheduleNextRefresh: function(seconds) {
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }

    this.currentRefreshIntervalSeconds = seconds;
    this.refreshTimer = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      seconds,
      () => {
        this.refresh();
        return GLib.SOURCE_REMOVE;
      }
    );
  },

  fetchUser: function(userConfig, generation) {
    let username = userConfig.username;
    let url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
    let authConfig = this.authConfigForUser(userConfig);
    let request = this.createDuolingoRequest(url, username, authConfig);
    let authenticated = authConfig !== null;

    if (Soup.MAJOR_VERSION === 2) {
      soupASyncSession.queue_message(request, (session, message) => {
        if (message.status_code !== 200) {
          this.recordCachedResponse(userConfig, message.status_code, generation);
          return;
        }

        try {
          this.recordResponse(userConfig, JSON.parse(message.response_body.data), false, null, generation, authenticated);
        } catch (err) {
          this.recordCachedResponse(userConfig, "parse", generation);
        }
      });
    } else {
      soupASyncSession.send_and_read_async(request, Soup.MessagePriority.NORMAL, null, (session, response) => {
        if (request.get_status() !== 200) {
          this.recordCachedResponse(userConfig, request.get_status(), generation);
          return;
        }

        try {
          let bytes = session.send_and_read_finish(response);
          this.recordResponse(userConfig, JSON.parse(ByteArray.toString(ByteArray.fromGBytes(bytes))), false, null, generation, authenticated);
        } catch (err) {
          this.recordCachedResponse(userConfig, "parse", generation);
        }
      });
    }
  },

  recordResponse: function(userConfig, responseParsed, fromCache, cachedResponse, generation, authenticated) {
    if (generation !== this.refreshGeneration) {
      return;
    }

    if (!responseParsed.users || responseParsed.users.length === 0) {
      this.recordError(userConfig, "not-found", generation);
      return;
    }

    let user = responseParsed.users[0];
    if (fromCache !== true) {
      this.cacheUserResponse(userConfig, user, authenticated === true);
    }

    let activeRecently = this.isTruthyActivity(user.hasRecentActivity15);
    let lastSeen = this.getLastSeen(userConfig);
    let simulatedLastSeen = this.testOnlineUsers[this.cacheKeyForUser(userConfig)];
    if (userConfig.simulateActive === true && typeof simulatedLastSeen !== "number") {
      simulatedLastSeen = Math.floor(Date.now() / 1000);
    }

    if (typeof simulatedLastSeen === "number") {
      activeRecently = true;
      lastSeen = simulatedLastSeen;
    }

    if (activeRecently && simulatedLastSeen === undefined && fromCache !== true) {
      lastSeen = this.recordLastSeen(userConfig);
    } else if (activeRecently && lastSeen === 0 && cachedResponse && typeof cachedResponse.cachedAt === "number") {
      lastSeen = cachedResponse.cachedAt;
    }

    this.userData.push(authenticated === true ?
      this.normalizeAuthenticatedUser(user, userConfig, activeRecently, lastSeen) :
      this.normalizeUser(user, userConfig, activeRecently, lastSeen));
    this.finishRequest();
  },

  recordError: function(userConfig, status, generation) {
    if (generation !== this.refreshGeneration) {
      return;
    }

    this.userData.push({
      username: userConfig.username,
      displayUsername: userConfig.displayUsername,
      highlighted: userConfig.highlighted,
      simulateActive: userConfig.simulateActive,
      standalone: userConfig.standalone,
      isSelf: userConfig.isSelf,
      configuredIndex: userConfig.index,
      activeRecently: false,
      lastSeen: 0,
      error: status === "not-found" ? _("not found") : formatString(_("Error %s"), [status])
    });
    this.finishRequest();
  },

  finishRequest: function() {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.loadingUsers = false;
      this.scheduleNextRefresh(this.usedCache === true ? CACHE_RETRY_INTERVAL_SECONDS : UPDATE_INTERVAL_SECONDS);
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

  normalizeUser: function(user, userConfig, activeRecently, lastSeen) {
    let courses = user.courses || [];
    let currentCourse = null;

    for (let course of courses) {
      if (course.id === user.currentCourseId) {
        currentCourse = course;
        break;
      }
    }

    if (!currentCourse && courses.length > 0) {
      currentCourse = courses[0];
    }

    currentCourse = currentCourse || {};

    return {
      username: user.username || userConfig.username,
      displayUsername: userConfig.displayUsername,
      highlighted: userConfig.highlighted,
      simulateActive: userConfig.simulateActive,
      standalone: userConfig.standalone,
      isSelf: userConfig.isSelf,
      configuredIndex: userConfig.index,
      name: user.name || user.username || userConfig.username,
      streak: user.streak || 0,
      totalXp: user.totalXp || 0,
      courseTitle: currentCourse.title || user.learningLanguage || _("no course"),
      courseXp: currentCourse.xp || 0,
      learningLanguage: user.learningLanguage || currentCourse.learningLanguage || "",
      fromLanguage: user.fromLanguage || currentCourse.fromLanguage || "",
      hasPlus: user.hasPlus === true,
      activeRecently: activeRecently === true,
      lastSeen: lastSeen || 0,
      courseCount: courses.length,
      courses: courses.map(course => {
        return {
          title: course.title || course.learningLanguage || _("no course"),
          xp: course.xp || 0,
          learningLanguage: course.learningLanguage || "",
          fromLanguage: course.fromLanguage || ""
        };
      }),
      creationDate: user.creationDate || 0,
      emailVerified: user.emailVerified === true,
      profileCountry: user.profileCountry || "",
      liveOpsCount: user.liveOpsFeatures ? user.liveOpsFeatures.length : 0,
      achievementCount: user.achievements ? user.achievements.length : 0
    };
  },

  normalizeAuthenticatedUser: function(user, userConfig, activeRecently, lastSeen) {
    let normalized = this.normalizeUser(user, userConfig, activeRecently, lastSeen);
    let summary = this.authenticatedExperimentSummary(user);

    normalized.authenticatedProfile = true;
    normalized.authFieldCount = user.authFieldCount || Object.keys(user || {}).length;
    normalized.authExperimentMapCount = user.authExperimentMapCount || summary.maps;
    normalized.authExperimentCount = user.authExperimentCount || summary.count;
    normalized.authTreatedExperimentCount = user.authTreatedExperimentCount || summary.treated;

    return normalized;
  },

  authenticatedExperimentSummary: function(user) {
    let summary = {
      maps: 0,
      count: 0,
      treated: 0
    };

    if (!user || typeof user !== "object") {
      return summary;
    }

    for (let key in user) {
      if (!Object.prototype.hasOwnProperty.call(user, key)) {
        continue;
      }
      let value = user[key];
      if (!this.looksLikeExperimentMap(value)) {
        continue;
      }

      summary.maps++;
      for (let experimentKey in value) {
        if (!Object.prototype.hasOwnProperty.call(value, experimentKey)) {
          continue;
        }
        summary.count++;
        let experiment = value[experimentKey];
        if (experiment && typeof experiment === "object" && experiment.treated === true) {
          summary.treated++;
        }
      }
    }

    return summary;
  },

  looksLikeExperimentMap: function(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    let checked = 0;
    for (let key in value) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) {
        continue;
      }
      checked++;
      let experiment = value[key];
      if (!experiment || typeof experiment !== "object" || Array.isArray(experiment)) {
        return false;
      }
      if (!("condition" in experiment) && !("treated" in experiment) && !("destiny" in experiment)) {
        return false;
      }
      if (checked >= 3) {
        break;
      }
    }

    return checked > 0;
  },

  updateDisplay: function() {
    this.sortUserData();
    let validUsers = this.userData.filter(user => !user.error);
    let hasActiveUsers = validUsers.some(user => user.activeRecently === true);
    let bubbleEvent = this.activitySpeechBubbleEvent(validUsers);
    this.updatePanelIcon();
    if (bubbleEvent && bubbleEvent.styleClass === "online") {
      this.updatePanelVisibility(hasActiveUsers);
    }
    if (bubbleEvent) {
      this.showSpeechBubble(bubbleEvent.text, bubbleEvent.styleClass);
    }
    if (!bubbleEvent || bubbleEvent.styleClass !== "online") {
      this.updatePanelVisibility(hasActiveUsers);
    }

    if (validUsers.length === 0) {
      this.set_applet_label(this.buildPanelLabel(validUsers));
      this.updateAppletTooltip();
      this.invalidateMenu();
      return;
    }

    this.set_applet_label(this.buildPanelLabel(validUsers));
    this.updateAppletTooltip();
    this.invalidateMenu();
  },

  activitySpeechBubbleEvent: function(validUsers) {
    let activeUsers = validUsers.filter(user => user.activeRecently === true);
    let activeMap = {};
    for (let user of activeUsers) {
      activeMap[user.username.toLowerCase()] = user.displayUsername;
    }

    if (this.activeUsernamesSnapshot === null) {
      this.activeUsernamesSnapshot = activeMap;
      return null;
    }

    let newActiveUsers = [];
    for (let user of activeUsers) {
      if (!this.activeUsernamesSnapshot[user.username.toLowerCase()]) {
        newActiveUsers.push(user);
      }
    }
    let inactiveUsers = [];
    for (let username in this.activeUsernamesSnapshot) {
      if (!activeMap[username]) {
        inactiveUsers.push(this.activeUsernamesSnapshot[username]);
      }
    }
    this.activeUsernamesSnapshot = activeMap;

    if (newActiveUsers.length > 0) {
      return {
        styleClass: "online",
        text: this.renderSpeechBubbleMessage(this.onlineMessage, newActiveUsers[0].displayUsername, newActiveUsers.length)
      };
    }

    if (inactiveUsers.length > 0) {
      return {
        styleClass: "offline",
        text: this.renderSpeechBubbleMessage(this.offlineMessage, inactiveUsers[0], inactiveUsers.length)
      };
    }

    return null;
  },

  renderSpeechBubbleMessage: function(template, username, count) {
    let text = String(template || "").trim();
    if (!text) {
      text = "$user";
    }

    return text
      .replace(/\$user/g, username || _("unknown"))
      .replace(/\$count/g, String(count || 0));
  },

  showSpeechBubble: function(text, styleClass) {
    this.destroySpeechBubble();
    let bubbleStyleClass = "duolingo-helper-speech-bubble";
    let title = this.speechBubbleTitle(styleClass);
    let styles = this.speechBubbleStyles(styleClass);
    if (styleClass) {
      bubbleStyleClass += " duolingo-helper-speech-bubble-" + styleClass;
    }

    let bubbleBox = new St.BoxLayout({
      vertical: true,
      style_class: "duolingo-helper-speech-bubble-content"
    });
    if (title) {
      bubbleBox.add(new St.Label({
        text: title,
        style_class: "duolingo-helper-speech-bubble-title",
        style: styles.title
      }));
    }
    bubbleBox.add(new St.Label({
      text: String(text || ""),
      style_class: "duolingo-helper-speech-bubble-label",
      style: styles.label
    }));
    this.speechBubble = new St.Bin({
      child: bubbleBox,
      style_class: bubbleStyleClass,
      style: styles.bubble
    });
    this.speechBubble.rotation_angle_z = styles.rotation;
    this.speechBubble.opacity = 0;
    Main.uiGroup.add_actor(this.speechBubble);

    let [actorX, actorY] = this.actor.get_transformed_position();
    let [actorWidth, actorHeight] = this.actor.get_transformed_size();
    let [minWidth, naturalWidth] = this.speechBubble.get_preferred_width(-1);
    let [minHeight, naturalHeight] = this.speechBubble.get_preferred_height(naturalWidth);
    let stageWidth = global.stage.get_width();
    let stageHeight = global.stage.get_height();
    let bubbleX = Math.max(8, Math.min(stageWidth - naturalWidth - 8, actorX + actorWidth / 2 - naturalWidth / 2));
    let bubbleY = actorY > stageHeight / 2 ? actorY - naturalHeight - 10 : actorY + actorHeight + 10;
    let startY = bubbleY + styles.startOffsetY;
    let startX = bubbleX + styles.startOffsetX;

    this.speechBubble.set_position(Math.round(startX), Math.round(startY));
    this.speechBubble.ease({
      x: Math.round(bubbleX),
      y: Math.round(bubbleY),
      opacity: 255,
      duration: styles.inDuration,
      mode: styles.inMode,
      onComplete: () => {
        this.speechBubbleTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2600, () => {
          this.hideSpeechBubble();
          this.speechBubbleTimer = 0;
          return GLib.SOURCE_REMOVE;
        });
      }
    });
  },

  speechBubbleStyles: function(styleClass) {
    if (styleClass === "offline") {
      return {
        bubble: "background-color: rgba(102, 20, 26, 0.98); border: 3px solid rgba(255, 80, 80, 1); border-radius: 0px; padding: 9px 12px; box-shadow: 0 8px 0 rgba(0, 0, 0, 0.35);",
        title: "color: #ffd2d2; font-size: 10px; font-weight: bold;",
        label: "color: #ffffff; font-size: 15px; font-weight: bold;",
        rotation: -3,
        startOffsetX: -24,
        startOffsetY: -24,
        inDuration: 320,
        inMode: Clutter.AnimationMode.EASE_OUT_BACK
      };
    }

    if (styleClass === "cache") {
      return {
        bubble: "background-color: rgba(20, 35, 62, 0.94); border-left: 9px solid rgba(105, 170, 255, 1); border-radius: 3px; padding: 8px 16px; box-shadow: 0 3px 18px rgba(80, 130, 210, 0.35);",
        title: "color: #a8ccff; font-size: 10px; font-weight: bold;",
        label: "color: #e8f2ff; font-size: 13px; font-weight: bold;",
        rotation: 0,
        startOffsetX: 34,
        startOffsetY: 0,
        inDuration: 260,
        inMode: Clutter.AnimationMode.EASE_OUT_QUAD
      };
    }

    if (styleClass === "plus") {
      return {
        bubble: "background-color: rgba(88, 55, 0, 0.99); border: 3px solid rgba(255, 207, 67, 1); border-radius: 999px; padding: 10px 22px; box-shadow: 0 0 22px rgba(255, 207, 67, 0.42);",
        title: "color: #ffefb3; font-size: 10px; font-weight: bold;",
        label: "color: #ffe38a; font-size: 14px; font-weight: bold;",
        rotation: 2,
        startOffsetX: 0,
        startOffsetY: 30,
        inDuration: 340,
        inMode: Clutter.AnimationMode.EASE_OUT_BACK
      };
    }

    if (styleClass === "quiet") {
      return {
        bubble: "background-color: rgba(30, 30, 30, 0.68); border: 1px dashed rgba(185, 185, 185, 0.85); border-radius: 1px; padding: 5px 9px;",
        title: "color: rgba(255, 255, 255, 0.55); font-size: 8px; font-weight: normal;",
        label: "color: rgba(255, 255, 255, 0.78); font-size: 12px; font-weight: normal;",
        rotation: 0,
        startOffsetX: 0,
        startOffsetY: 10,
        inDuration: 420,
        inMode: Clutter.AnimationMode.EASE_OUT_QUAD
      };
    }

    return {
      bubble: "background-color: rgba(34, 92, 40, 0.98); border: 2px solid rgba(130, 220, 90, 1); border-radius: 18px; padding: 11px 16px; box-shadow: 0 7px 18px rgba(40, 120, 30, 0.42);",
      title: "color: #d7ffd0; font-size: 10px; font-weight: bold;",
      label: "color: #ffffff; font-size: 16px; font-weight: bold;",
      rotation: 0,
      startOffsetX: 0,
      startOffsetY: 26,
      inDuration: 260,
      inMode: Clutter.AnimationMode.EASE_OUT_BACK
    };
  },

  speechBubbleTitle: function(styleClass) {
    if (styleClass === "online") {
      return "ONLINE";
    }
    if (styleClass === "offline") {
      return "OFFLINE";
    }
    if (styleClass === "cache") {
      return "CACHE";
    }
    if (styleClass === "plus") {
      return "PLUS";
    }
    if (styleClass === "quiet") {
      return "QUIET";
    }

    return "";
  },

  hideSpeechBubble: function() {
    if (!this.speechBubble) {
      return;
    }

    this.speechBubble.ease({
      y: this.speechBubble.y - 14,
      opacity: 0,
      duration: 220,
      mode: Clutter.AnimationMode.EASE_IN_QUAD,
      onComplete: () => this.destroySpeechBubble()
    });
  },

  destroySpeechBubble: function() {
    if (this.speechBubbleTimer > 0) {
      GLib.source_remove(this.speechBubbleTimer);
      this.speechBubbleTimer = 0;
    }

    if (this.speechBubble) {
      this.speechBubble.destroy();
      this.speechBubble = null;
    }
  },

  speechBubbleTestCases: function() {
    return [
      { text: this.renderSpeechBubbleMessage(this.onlineMessage, "Bernie", 1), styleClass: "online" },
      { text: this.renderSpeechBubbleMessage(this.offlineMessage, "Julia", 1), styleClass: "offline" },
      { text: _("Using cached Duolingo data"), styleClass: "cache" },
      { text: formatString(_("Duolingo Plus: %s serves the owl with real money."), ["Bernie"]), styleClass: "plus" },
      { text: _("No active users"), styleClass: "quiet" }
    ];
  },

  _testShowSpeechBubble: function(text, styleClass) {
    this.showSpeechBubble(text || _("Serve the owl."), styleClass || "online");
    return true;
  },

  _testRotateSpeechBubbles: function() {
    this._testStopSpeechBubbleRotation();
    let cases = this.speechBubbleTestCases();
    this.speechBubbleRotationIndex = 0;
    this.showSpeechBubble(cases[0].text, cases[0].styleClass);
    this.speechBubbleRotationIndex = 1;
    this.speechBubbleRotationTimer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 3, () => {
      if (this.speechBubbleRotationIndex >= cases.length) {
        this.speechBubbleRotationTimer = 0;
        return GLib.SOURCE_REMOVE;
      }
      let current = cases[this.speechBubbleRotationIndex % cases.length];
      this.showSpeechBubble(current.text, current.styleClass);
      this.speechBubbleRotationIndex++;
      return GLib.SOURCE_CONTINUE;
    });
    return cases.length;
  },

  _testStopSpeechBubbleRotation: function() {
    if (this.speechBubbleRotationTimer > 0) {
      GLib.source_remove(this.speechBubbleRotationTimer);
      this.speechBubbleRotationTimer = 0;
    }
    return true;
  },

  updatePanelVisibility: function(hasActiveUsers) {
    if (hasActiveUsers === undefined) {
      hasActiveUsers = this.userData.some(user => !user.error && user.activeRecently === true);
    }

    if (this.hideWhenInactive === true && !hasActiveUsers) {
      this.actor.hide();
    } else {
      this.actor.show();
    }
  },

  updateAppletTooltip: function() {
    this.set_applet_tooltip(this.buildTooltip(), true);
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
    if (line.plus === true) {
      text = '<span foreground="#b00020">' + text + '</span>';
    }
    if (!line.highlighted) {
      return text;
    }

    return '<span weight="bold" background="#4f6f2f" foreground="#ffffff">' + text + '</span>';
  },

  buildTooltip: function() {
    let hoverDisplayMode = this.validDisplayMode(this.hoverDisplayMode);

    if (hoverDisplayMode === DISPLAY_MODE_NONE) {
      return "";
    }

    if (this.loadingUsers === true && this.userData.length === 0) {
      return [
        { text: _("Duolingo Helper") },
        { text: _("Loading...") }
      ].map(line => this.formatTooltipLine(line)).join("\n");
    }

    if (this.userData.length === 0) {
      return [
        { text: _("Duolingo Helper") },
        { text: _("No users configured") }
      ].map(line => this.formatTooltipLine(line)).join("\n");
    }

    let lines = [{ text: _("Duolingo Statistics") }];
    if (this.usedCache === true) {
      lines.push({ text: _("Using cached Duolingo data") });
    }

    let displayUsers = this.getUsersForDisplayMode(this.userData, this.hoverSelfOnly === true);

    if (displayUsers.length === 0 && this.hoverSelfOnly === true) {
      lines.push({ text: _("No Standalone users configured") });
      return lines.map(line => this.formatTooltipLine(line)).join("\n");
    }

    let hoverMultiUserMode = this.isMultiUserDisplay(displayUsers);
    if (this.shouldUseActivityGroups(displayUsers)) {
      return this.buildGroupedTooltipLines(lines, displayUsers).map(line => this.formatTooltipLine(line)).join("\n");
    }

    for (let user of displayUsers) {
      if (user.error) {
        lines.push({ text: user.displayUsername + ": " + user.error });
        continue;
      }

      lines = lines.concat(this.buildHoverUserDisplayLines(user, hoverMultiUserMode));
    }

    return lines.map(line => this.formatTooltipLine(line)).join("\n");
  },

  buildGroupedTooltipLines: function(lines, users) {
    let groups = this.splitUsersByActivity(users);
    lines.push({ text: this.activeNowLabel() });

    if (groups.active.length === 0) {
      lines.push({ text: this.noActiveUsersLabel() });
    } else {
      for (let user of groups.active) {
        lines = lines.concat(this.buildHoverUserDisplayLines(user, true));
      }
    }

    lines.push({ text: this.inactiveLabel() });

    if (groups.inactive.length === 0) {
      lines.push({ text: this.noInactiveUsersLabel() });
    } else {
      for (let user of groups.inactive) {
        lines = lines.concat(this.buildHoverUserDisplayLines(user, true));
      }
    }

    for (let user of groups.errors) {
      lines.push({ text: user.displayUsername + ": " + user.error });
    }

    return lines;
  },

  activeNowLabel: function() {
    return localizedFallback("Active now:", "Jetzt aktiv:");
  },

  inactiveLabel: function() {
    return localizedFallback("Inactive:", "Inaktiv:");
  },

  noActiveUsersLabel: function() {
    return localizedFallback("No active users", "Keine aktiven Benutzer");
  },

  noInactiveUsersLabel: function() {
    return localizedFallback("No inactive users", "Keine inaktiven Benutzer");
  },

  splitUsersByActivity: function(users) {
    let groups = {
      active: [],
      inactive: [],
      errors: []
    };

    for (let user of users || []) {
      if (user.error) {
        groups.errors.push(user);
      } else if (user.activeRecently === true) {
        groups.active.push(user);
      } else {
        groups.inactive.push(user);
      }
    }

    groups.active.sort((a, b) => this.compareUsersForDisplay(a, b));
    groups.inactive.sort((a, b) => this.compareUsersForDisplay(a, b));
    groups.errors.sort((a, b) => this.compareText(a.displayUsername, b.displayUsername));

    return groups;
  },

  buildHoverUserDisplayLines: function(user, multiUserMode) {
    let lines = this.buildUserDisplayLines(user, this.hoverDisplayMode);
    let highlighted = (this.highlightActiveUsersOnHover === true &&
        this.activityTrackingEnabled === true &&
        multiUserMode === true &&
        user.activeRecently === true) ||
      (this.highlightOnHover === true && user.highlighted === true);

    return lines.map(line => {
      return {
        text: this.lineText(line),
        plus: this.lineIsPlus(line),
        highlighted: highlighted
      };
    });
  },

  lineText: function(line) {
    return typeof line === "string" ? line : line.text;
  },

  lineIsPlus: function(line) {
    return typeof line === "object" && line !== null && line.plus === true;
  },

  buildUserDisplayLines: function(user, mode) {
    mode = this.displayDetailMode(mode);

    if (mode === DISPLAY_MODE_NONE) {
      return [];
    }

    let lines = [this.buildUserSummaryLine(user)];

    if (mode === DISPLAY_MODE_COURSES || mode === DISPLAY_MODE_ALL) {
      lines = lines.concat(this.buildCourseLines(user));
    }

    if (mode === DISPLAY_MODE_ACCOUNT || mode === DISPLAY_MODE_ALL) {
      lines = lines.concat(this.buildAccountLines(user));
    }

    return lines;
  },

  buildUserSummaryLine: function(user) {
    return formatString(_("%s: %s days, %s total XP, %s XP in %s"), [
      user.displayUsername,
      user.streak,
      user.totalXp,
      user.courseXp,
      user.courseTitle
    ]);
  },

  buildCourseLines: function(user) {
    let lines = [
      formatString(_("Current course: %s (%s -> %s)"), [
        user.courseTitle,
        user.fromLanguage || "?",
        user.learningLanguage || "?"
      ]),
      formatString(_("Courses: %s"), [user.courseCount])
    ];

    for (let course of user.courses) {
      lines.push(
        formatString(_("  %s: %s XP (%s -> %s)"), [
          course.title,
          course.xp,
          course.fromLanguage || "?",
          course.learningLanguage || "?"
        ])
      );
    }

    return lines;
  },

  buildAccountLines: function(user) {
    let lines = [
      formatString(_("Name: %s"), [user.name]),
      formatString(_("Joined: %s"), [this.formatUnixDate(user.creationDate)]),
      formatString(_("Recent activity: %s"), [user.activeRecently ? _("yes") : _("no")]),
      formatString(_("Last seen: %s"), [this.formatLastSeen(user.lastSeen)]),
      formatString(_("Email verified: %s"), [user.emailVerified ? _("yes") : _("no")]),
      formatString(_("Profile country: %s"), [user.profileCountry || _("not set")]),
      formatString(_("Live events: %s"), [user.liveOpsCount]),
      formatString(_("Achievements: %s"), [user.achievementCount])
    ];

    if (user.authenticatedProfile === true) {
      lines.push(formatString(_("Authenticated API: %s"), [_("yes")]));
      lines.push(formatString(_("Visible fields: %s"), [user.authFieldCount || 0]));
      lines.push(formatString(_("Experiments: %s (%s treated)"), [
        user.authExperimentCount || 0,
        user.authTreatedExperimentCount || 0
      ]));
    }

    if (user.hasPlus) {
      lines.push({
        text: formatString(_("Duolingo Plus: %s serves the owl with real money."), [user.displayUsername]),
        plus: true
      });
    }

    return lines;
  },

  validDisplayMode: function(mode) {
    if (
      mode === DISPLAY_MODE_NONE ||
      mode === DISPLAY_MODE_SUMMARY ||
      mode === DISPLAY_MODE_COURSES ||
      mode === DISPLAY_MODE_ACCOUNT ||
      mode === DISPLAY_MODE_ALL
    ) {
      return mode;
    }

    return DISPLAY_MODE_SUMMARY;
  },

  displayDetailMode: function(mode) {
    if (mode === DISPLAY_MODE_ME || mode === DISPLAY_MODE_SUMMARY_ME) {
      return DISPLAY_MODE_SUMMARY;
    }
    if (mode === DISPLAY_MODE_COURSES_ME) {
      return DISPLAY_MODE_COURSES;
    }
    if (mode === DISPLAY_MODE_ACCOUNT_ME) {
      return DISPLAY_MODE_ACCOUNT;
    }
    if (mode === DISPLAY_MODE_ALL_ME) {
      return DISPLAY_MODE_ALL;
    }

    return this.validDisplayMode(mode);
  },

  isSelfDisplayMode: function(mode) {
    return (
      mode === DISPLAY_MODE_ME ||
      mode === DISPLAY_MODE_SUMMARY_ME ||
      mode === DISPLAY_MODE_COURSES_ME ||
      mode === DISPLAY_MODE_ACCOUNT_ME ||
      mode === DISPLAY_MODE_ALL_ME
    );
  },

  validPanelDisplayMode: function(mode) {
    if (
      mode === PANEL_DISPLAY_COMPACT ||
      mode === PANEL_DISPLAY_USERS ||
      mode === PANEL_DISPLAY_ACTIVE_USERS ||
      mode === PANEL_DISPLAY_STREAK ||
      mode === PANEL_DISPLAY_XP ||
      mode === PANEL_DISPLAY_ME ||
      mode === PANEL_DISPLAY_NONE
    ) {
      return mode;
    }

    return PANEL_DISPLAY_COMPACT;
  },

  buildPanelLabel: function(validUsers) {
    let mode = this.validPanelDisplayMode(this.panelDisplayMode);

    if (mode === PANEL_DISPLAY_NONE) {
      return "";
    }

    if (!validUsers || validUsers.length === 0) {
      return mode === PANEL_DISPLAY_COMPACT ? "Duo" : "0";
    }

    if (mode === PANEL_DISPLAY_ME) {
      let selfUser = this.getSelfUser(validUsers);
      if (!selfUser) {
        return "Ich?";
      }
      return selfUser.streak + " | " + selfUser.totalXp;
    }

    let totalStreak = this.sumUserField(validUsers, "streak");
    let totalXp = this.sumUserField(validUsers, "totalXp");

    if (mode === PANEL_DISPLAY_USERS) {
      return String(validUsers.length);
    }
    if (mode === PANEL_DISPLAY_ACTIVE_USERS) {
      return String(validUsers.filter(user => user.activeRecently === true).length);
    }
    if (mode === PANEL_DISPLAY_STREAK) {
      return String(totalStreak);
    }
    if (mode === PANEL_DISPLAY_XP) {
      return String(totalXp);
    }

    return validUsers.length + " | " + totalStreak + " | " +
      validUsers.filter(user => user.activeRecently === true).length;
  },

  validSortOrder: function(order) {
    if (
      order === SORT_ORDER_CONFIGURED ||
      order === SORT_ORDER_USERNAME_ASC ||
      order === SORT_ORDER_USERNAME_DESC ||
      order === SORT_ORDER_STREAK_DESC ||
      order === SORT_ORDER_STREAK_ASC ||
      order === SORT_ORDER_XP_DESC ||
      order === SORT_ORDER_XP_ASC
    ) {
      return order;
    }

    return SORT_ORDER_CONFIGURED;
  },

  sortUserData: function() {
    this.userData.sort((a, b) => {
      return this.compareUsersForDisplay(a, b);
    });
  },

  compareUsersForDisplay: function(a, b) {
    if ((a.error ? true : false) !== (b.error ? true : false)) {
      return a.error ? 1 : -1;
    }

    if (this.activityTrackingEnabled === true && a.activeRecently !== b.activeRecently) {
      return a.activeRecently ? -1 : 1;
    }

    return this.compareUsersByConfiguredSort(a, b) ||
      this.compareUsersByLastSeen(a, b) ||
      this.compareText(a.displayUsername, b.displayUsername) ||
      this.compareConfiguredIndex(a, b);
  },

  compareUsersByConfiguredSort: function(a, b) {
    let order = this.validSortOrder(this.sortOrder);

    if (order === SORT_ORDER_USERNAME_ASC) {
      return this.compareText(a.displayUsername, b.displayUsername);
    }
    if (order === SORT_ORDER_USERNAME_DESC) {
      return this.compareText(b.displayUsername, a.displayUsername);
    }
    if (order === SORT_ORDER_STREAK_DESC) {
      return this.compareNumber(b.streak, a.streak);
    }
    if (order === SORT_ORDER_STREAK_ASC) {
      return this.compareNumber(a.streak, b.streak);
    }
    if (order === SORT_ORDER_XP_DESC) {
      return this.compareNumber(b.totalXp, a.totalXp);
    }
    if (order === SORT_ORDER_XP_ASC) {
      return this.compareNumber(a.totalXp, b.totalXp);
    }

    return this.compareConfiguredIndex(a, b);
  },

  compareUsersByLastSeen: function(a, b) {
    if ((a.lastSeen || 0) !== (b.lastSeen || 0)) {
      return (b.lastSeen || 0) - (a.lastSeen || 0);
    }

    return 0;
  },

  compareText: function(left, right) {
    return String(left || "").localeCompare(String(right || ""));
  },

  compareNumber: function(left, right) {
    return (left || 0) - (right || 0);
  },

  compareConfiguredIndex: function(left, right) {
    return (left.configuredIndex || 0) - (right.configuredIndex || 0);
  },

  getSelfUser: function(users) {
    for (let user of users || []) {
      if (user.isSelf) {
        return user;
      }
    }
    return null;
  },

  getUsersForDisplayMode: function(users, mode) {
    if (mode !== true) {
      return users.slice().sort((a, b) => this.compareUsersForDisplay(a, b));
    }

    return users
      .filter(user => user.standalone === true)
      .sort((a, b) => this.compareUsersForDisplay(a, b));
  },

  isMultiUserDisplay: function(users) {
    return (users || []).filter(user => !user.error).length > 1;
  },

  shouldUseActivityGroups: function(users) {
    return this.activityTrackingEnabled === true &&
      this.isMultiUserDisplay(users) &&
      (users || []).some(user => !user.error && user.activeRecently === true);
  },

  sumUserField: function(users, fieldName) {
    let total = 0;
    for (let user of users) {
      total += user[fieldName] || 0;
    }
    return total;
  },

  formatPercent: function(value, total) {
    if (!total) {
      return "0.0";
    }

    return (value * 100 / total).toFixed(1);
  },

  buildTeamShareTooltip: function(user) {
    let validUsers = this.userData.filter(currentUser => !currentUser.error);
    let totalXp = this.sumUserField(validUsers, "totalXp");
    let totalStreak = this.sumUserField(validUsers, "streak");

    return [
      _("Team share"),
      formatString(_("XP: %s / %s (%s%)"), [
        user.totalXp,
        totalXp,
        this.formatPercent(user.totalXp, totalXp)
      ]),
      formatString(_("Streak: %s / %s (%s%)"), [
        user.streak,
        totalStreak,
        this.formatPercent(user.streak, totalStreak)
      ]),
      formatString(_("Last seen: %s"), [this.formatLastSeen(user.lastSeen)])
    ].join("\n");
  },

  setMenuItemTooltip: function(item, text) {
    if (item.actor) {
      item._teamShareTooltip = new Tooltips.Tooltip(item.actor, text);
    }
  },

  formatLastSeen: function(timestamp) {
    if (!timestamp || timestamp <= 0) {
      return _("never");
    }

    let date = GLib.DateTime.new_from_unix_local(timestamp);
    if (!date) {
      return _("unknown");
    }

    let now = GLib.DateTime.new_now_local();
    if (
      date.get_year() === now.get_year() &&
      date.get_month() === now.get_month() &&
      date.get_day_of_month() === now.get_day_of_month() &&
      (now.to_unix() - timestamp) <= 10 * 60 * 60
    ) {
      return date.format("%d.%m.%Y %H:%M");
    }

    return date.format("%d.%m.%Y");
  },

  _testAuthConfigSummary: function() {
    let authConfig = this.loadAuthConfig();
    return JSON.stringify({
      path: AUTH_FILE_PATH,
      loaded: authConfig !== null,
      username: authConfig ? authConfig.username : "",
      hasCookie: !!(authConfig && authConfig.cookie),
      headerCount: authConfig ? Object.keys(authConfig.headers).length : 0
    });
  },

  _testAuthenticatedParser: function() {
    let userConfig = {
      username: "TeladiTheGreat",
      displayUsername: "Bernie",
      highlighted: false,
      simulateActive: false,
      standalone: true,
      isSelf: true,
      index: 0
    };
    let user = {
      username: "TeladiTheGreat",
      name: "Bernie",
      streak: 1,
      totalXp: 19500,
      courses: [],
      hasRecentActivity15: false,
      experiments: {
        alpha: { condition: "control", treated: false, destiny: "control" },
        beta: { condition: "experiment", treated: true, destiny: "experiment" }
      }
    };
    return JSON.stringify(this.normalizeAuthenticatedUser(user, userConfig, false, 0));
  },

  _testSimulateUserOnline: function(username) {
    let target = String(username || "").trim().toLowerCase();
    if (!target) {
      return false;
    }

    let now = Math.floor(Date.now() / 1000);
    let changed = false;

    for (let user of this.userData) {
      if (user.error) {
        continue;
      }

      let matchesUsername = String(user.username || "").toLowerCase() === target;
      let matchesDisplayName = String(user.displayUsername || "").toLowerCase() === target;
      if (!matchesUsername && !matchesDisplayName) {
        continue;
      }

      this.testOnlineUsers[String(user.username || "").toLowerCase()] = now;
      user.activeRecently = true;
      user.lastSeen = now;
      changed = true;
    }

    if (changed) {
      this.updateDisplay();
    }

    return changed;
  },

  _testClearSimulatedActivity: function() {
    this.testOnlineUsers = {};
    this.refresh();
    return true;
  },

  highlightMenuItem: function(item) {
    if (item.actor && item.actor.add_style_class_name) {
      item.actor.add_style_class_name("duolingo-helper-highlighted-user");
    }
  },

  formatUnixDate: function(timestamp) {
    if (!timestamp) {
      return _("unknown");
    }

    let date = GLib.DateTime.new_from_unix_local(timestamp);
    return date ? date.format("%Y-%m-%d") : _("unknown");
  },

  rebuildMenu: function() {
    if (!this.menu) {
      return;
    }

    this.destroyDetachedClickMenuScrollViews();
    this.menu.removeAll();
    this.clickMenuSection = null;
    this.clickMenuScrollView = null;
    this.clickMenuScrollItem = null;
    let clickDisplayMode = this.validDisplayMode(this.clickDisplayMode);

    if (this.loadingUsers === true && this.userData.length === 0) {
      this.addInsensitiveMenuItem(_("Loading..."));
    } else if (this.userData.length === 0) {
      let configureUsers = new PopupMenu.PopupMenuItem(_("No users configured"));
      configureUsers.connect("activate", () => this.configureApplet());
      this.menu.addMenuItem(configureUsers);
    } else if (clickDisplayMode !== DISPLAY_MODE_NONE) {
      let displayUsers = this.getUsersForDisplayMode(this.userData, this.clickSelfOnly === true);
      this.beginClickMenuUserScrollSection();

      if (displayUsers.length === 0 && this.clickSelfOnly === true) {
        let configureSelf = new PopupMenu.PopupMenuItem(_("No Standalone users configured"));
        configureSelf.connect("activate", () => this.configureApplet());
        this.addClickMenuUserItem(configureSelf);
      }

      if (this.shouldUseActivityGroups(displayUsers)) {
        this.addUserGroupsToMenu(displayUsers, clickDisplayMode);
      } else {
        this.addUsersToMenu(displayUsers, clickDisplayMode, false);
      }

      this.resetClickMenuUserScroll();
    }

    if (this.userData.length === 0 || clickDisplayMode !== DISPLAY_MODE_NONE) {
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
    }
    let openDuolingo = new PopupMenu.PopupMenuItem(_("Open Duolingo"));
    openDuolingo.connect("activate", () => Util.spawn(["xdg-open", "https://duolingo.com"]));
    this.menu.addMenuItem(openDuolingo);

    let refreshNow = new PopupMenu.PopupMenuItem(_("Refresh now"));
    refreshNow.connect("activate", () => this.refresh());
    this.menu.addMenuItem(refreshNow);
    this.menuNeedsRebuild = false;
  },

  beginClickMenuUserScrollSection: function() {
    this.clickMenuSection = new PopupMenu.PopupMenuSection();
    this.clickMenuScrollItem = new PopupMenu.PopupBaseMenuItem({
      reactive: false,
      activate: false,
      hover: false,
      sensitive: false,
      style_class: "duolingo-helper-click-scroll-item"
    });
    this.clickMenuScrollView = new St.ScrollView({
      style_class: "popup-sub-menu duolingo-helper-click-scroll",
      hscrollbar_policy: St.PolicyType.NEVER,
      vscrollbar_policy: St.PolicyType.AUTOMATIC
    });
    this.clickMenuScrollView.set_style("max-height: " + CLICK_MENU_SCROLL_MAX_HEIGHT + "px;");
    this.clickMenuScrollView.set_clip_to_allocation(true);
    this.clickMenuScrollView.add_actor(this.clickMenuSection.actor);

    let vscroll = this.clickMenuScrollView.get_vscroll_bar();
    vscroll.connect("scroll-start", () => {
      this.menu.passEvents = true;
    });
    vscroll.connect("scroll-stop", () => {
      this.menu.passEvents = false;
    });

    this.clickMenuScrollItem.addActor(this.clickMenuScrollView, {
      span: -1,
      expand: true
    });
    this.menu.addMenuItem(this.clickMenuScrollItem);
  },

  destroyDetachedClickMenuScrollViews: function() {
    if (!this.menu || !this.menu.box) {
      return;
    }

    let children = this.menu.box.get_children();
    for (let child of children) {
      if (child._delegate) {
        continue;
      }

      try {
        if (child.has_style_class_name && child.has_style_class_name("duolingo-helper-click-scroll")) {
          child.destroy();
        }
      } catch (e) {
        // Ignore stale actors from older menu builds.
      }
    }
  },

  resetClickMenuUserScroll: function() {
    if (!this.clickMenuScrollView) {
      return;
    }

    try {
      let adjustment = this.clickMenuScrollView.vscroll.adjustment;
      if (adjustment) {
        adjustment.value = adjustment.lower;
      }
    } catch (e) {
      // Some Cinnamon builds expose the adjustment only after allocation.
    }
  },

  addClickMenuUserItem: function(item) {
    if (this.clickMenuSection) {
      this.clickMenuSection.addMenuItem(item);
    } else {
      this.menu.addMenuItem(item);
    }
  },

  addClickMenuUserSeparator: function() {
    this.addClickMenuUserItem(new PopupMenu.PopupSeparatorMenuItem());
  },

  addUserGroupsToMenu: function(users, clickDisplayMode) {
    let groups = this.splitUsersByActivity(users);

    this.addSectionTitle(this.activeNowLabel());
    if (groups.active.length === 0) {
      this.addInsensitiveMenuItem(this.noActiveUsersLabel());
    } else {
      if (!this.addUsersToMenu(groups.active, clickDisplayMode, true)) {
        return;
      }
    }

    this.addClickMenuUserSeparator();
    this.addSectionTitle(this.inactiveLabel());
    if (groups.inactive.length === 0) {
      this.addInsensitiveMenuItem(this.noInactiveUsersLabel());
    } else {
      if (!this.addUsersToMenu(groups.inactive, clickDisplayMode, false)) {
        return;
      }
    }

    if (groups.errors.length > 0) {
      this.addClickMenuUserSeparator();
      for (let user of groups.errors) {
        this.addInsensitiveMenuItem(user.displayUsername + ": " + user.error);
      }
    }
  },

  addUsersToMenu: function(users, clickDisplayMode, highlightActiveUsers) {
    let firstUser = true;
    for (let user of users) {
      if (!firstUser && clickDisplayMode !== DISPLAY_MODE_SUMMARY) {
        this.addClickMenuUserSeparator();
      }
      firstUser = false;

      if (user.error) {
        this.addInsensitiveMenuItem(user.displayUsername + ": " + user.error);
        continue;
      }

      let lines = this.buildUserDisplayLines(user, clickDisplayMode);
      for (let index = 0; index < lines.length; index++) {
        let item = new PopupMenu.PopupMenuItem(this.lineText(lines[index]));
        if (this.lineIsPlus(lines[index])) {
          item.label.set_style("color: #b00020;");
        }
        if (index === 0) {
          if ((this.highlightOnClick === true && user.highlighted) ||
              (this.highlightActiveUsersOnClick === true && highlightActiveUsers && user.activeRecently === true)) {
            this.highlightMenuItem(item);
          }
          this.setMenuItemTooltip(item, this.buildTeamShareTooltip(user));
          item.connect("activate", () => this.openProfile(user.username));
        } else {
          item.setSensitive(false);
        }
        this.addClickMenuUserItem(item);
      }
    }

    return true;
  },

  addSectionTitle: function(title) {
    this.addInsensitiveMenuItem(title);
  },

  addInsensitiveMenuItem: function(label) {
    let item = new PopupMenu.PopupMenuItem(label);
    item.setSensitive(false);
    this.addClickMenuUserItem(item);
  },

  openProfile: function(username) {
    let url = "https://www.duolingo.com/profile/" + encodeURIComponent(username);
    Util.spawn(["xdg-open", url]);
  }
};

function main(metadata, orientation, panelHeight, instanceId) {
  return new MyApplet(metadata, orientation, panelHeight, instanceId);
}
