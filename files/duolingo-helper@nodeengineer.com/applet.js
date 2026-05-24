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

const UUID = "duolingo-helper@nodeengineer.com";
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const UPDATE_INTERVAL_SECONDS = 300;
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
    this.refreshTimer = 0;
    this.hoverDisplayMode = DISPLAY_MODE_SUMMARY;
    this.clickDisplayMode = DISPLAY_MODE_SUMMARY;
    this.panelDisplayMode = PANEL_DISPLAY_COMPACT;
    this.highlightOnHover = false;
    this.sortOrder = SORT_ORDER_CONFIGURED;

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
      "hover-display-mode",
      "hoverDisplayMode",
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
      "highlight-on-hover",
      "highlightOnHover",
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

    this.set_applet_icon_path(APPLET_PATH + "/icon.png");
    this.set_applet_label("Duo");
    this.set_applet_tooltip(_("Duolingo Helper"));

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

  buildMenu: function(orientation) {
    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);
    this.rebuildMenu();
  },

  on_applet_clicked: function() {
    this.menu.toggle();
  },

  on_applet_removed_from_panel: function() {
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }
  },

  onSettingsChanged: function() {
    this.enforceSingleSelfUser();
    this.refresh();
  },

  enforceSingleSelfUser: function() {
    let rows = this.users || [];
    let selfSeen = false;
    let changed = false;
    let normalizedRows = [];

    for (let row of rows) {
      let normalizedRow = this.cloneUserRow(row);
      if (normalizedRow.isSelf === true) {
        if (selfSeen) {
          normalizedRow.isSelf = false;
          changed = true;
        } else {
          selfSeen = true;
        }
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
    this.migrateLegacyDisplayModes();
    this.updateDisplay();
  },

  migrateLegacyDisplayModes: function() {
    if (this.hoverDisplayMode === DISPLAY_MODE_ME) {
      this.hoverDisplayMode = DISPLAY_MODE_SUMMARY_ME;
      this.settings.setValue("hover-display-mode", DISPLAY_MODE_SUMMARY_ME);
    }

    if (this.clickDisplayMode === DISPLAY_MODE_ME) {
      this.clickDisplayMode = DISPLAY_MODE_SUMMARY_ME;
      this.settings.setValue("click-display-mode", DISPLAY_MODE_SUMMARY_ME);
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
      let isSelf = row.isSelf === true && !selfSeen;
      selfSeen = selfSeen || isSelf;
      users.push({
        username: username,
        displayUsername: (row.alias || "").trim() || username,
        highlighted: row.highlighted === true,
        isSelf: isSelf,
        index: index
      });
    }

    return users;
  },

  refresh: function() {
    if (this.refreshTimer > 0) {
      GLib.source_remove(this.refreshTimer);
      this.refreshTimer = 0;
    }

    this.usernames = this.getConfiguredUsers();
    this.userData = [];
    this.pendingRequests = this.usernames.length;

    if (this.usernames.length === 0) {
      this.set_applet_label(this.buildPanelLabel([]));
      this.updateAppletTooltip();
      this.rebuildMenu();
      return;
    }

    this.set_applet_label("...");
    for (let userConfig of this.usernames) {
      this.fetchUser(userConfig);
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

  fetchUser: function(userConfig) {
    let username = userConfig.username;
    let url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(username)}`;
    let request = Soup.Message.new("GET", url);
    request.request_headers.set_content_type("application/json", null);

    if (Soup.MAJOR_VERSION === 2) {
      soupASyncSession.queue_message(request, (session, message) => {
        if (message.status_code !== 200) {
          this.recordError(userConfig, message.status_code);
          return;
        }

        try {
          this.recordResponse(userConfig, JSON.parse(message.response_body.data));
        } catch (err) {
          this.recordError(userConfig, "parse");
        }
      });
    } else {
      soupASyncSession.send_and_read_async(request, Soup.MessagePriority.NORMAL, null, (session, response) => {
        if (request.get_status() !== 200) {
          this.recordError(userConfig, request.get_status());
          return;
        }

        try {
          let bytes = session.send_and_read_finish(response);
          this.recordResponse(userConfig, JSON.parse(ByteArray.toString(ByteArray.fromGBytes(bytes))));
        } catch (err) {
          this.recordError(userConfig, "parse");
        }
      });
    }
  },

  recordResponse: function(userConfig, responseParsed) {
    if (!responseParsed.users || responseParsed.users.length === 0) {
      this.recordError(userConfig, "not-found");
      return;
    }

    this.userData.push(this.normalizeUser(responseParsed.users[0], userConfig));
    this.finishRequest();
  },

  recordError: function(userConfig, status) {
    this.userData.push({
      username: userConfig.username,
      displayUsername: userConfig.displayUsername,
      highlighted: userConfig.highlighted,
      isSelf: userConfig.isSelf,
      configuredIndex: userConfig.index,
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

  normalizeUser: function(user, userConfig) {
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
      activeRecently: user.hasRecentActivity15 === true,
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

  updateDisplay: function() {
    this.sortUserData();
    let validUsers = this.userData.filter(user => !user.error);

    if (validUsers.length === 0) {
      this.set_applet_label(this.buildPanelLabel(validUsers));
      this.updateAppletTooltip();
      this.rebuildMenu();
      return;
    }

    this.set_applet_label(this.buildPanelLabel(validUsers));
    this.updateAppletTooltip();
    this.rebuildMenu();
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

    if (this.userData.length === 0) {
      return [
        { text: _("Duolingo Helper") },
        { text: _("No users configured") }
      ].map(line => this.formatTooltipLine(line)).join("\n");
    }

    let lines = [{ text: _("Duolingo Statistics") }];
    let displayUsers = this.getUsersForDisplayMode(this.userData, hoverDisplayMode);

    if (displayUsers.length === 0 && this.isSelfDisplayMode(hoverDisplayMode)) {
      lines.push({ text: _("No self user configured") });
      return lines.map(line => this.formatTooltipLine(line)).join("\n");
    }

    for (let user of displayUsers) {
      if (user.error) {
        lines.push({ text: user.displayUsername + ": " + user.error });
        continue;
      }

      lines = lines.concat(this.buildHoverUserDisplayLines(user));
    }

    return lines.map(line => this.formatTooltipLine(line)).join("\n");
  },

  buildHoverUserDisplayLines: function(user) {
    let lines = this.buildUserDisplayLines(user, this.hoverDisplayMode);
    let highlighted = this.highlightOnHover === true && user.highlighted === true;

    return lines.map(line => {
      return {
        text: line,
        highlighted: highlighted
      };
    });
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
      formatString(_("Email verified: %s"), [user.emailVerified ? _("yes") : _("no")]),
      formatString(_("Profile country: %s"), [user.profileCountry || _("not set")]),
      formatString(_("Live events: %s"), [user.liveOpsCount]),
      formatString(_("Achievements: %s"), [user.achievementCount])
    ];

    if (user.hasPlus) {
      lines.push(formatString(_("Duolingo Plus: %s"), [_("Plus")]));
    }

    return lines;
  },

  validDisplayMode: function(mode) {
    if (
      mode === DISPLAY_MODE_NONE ||
      mode === DISPLAY_MODE_SUMMARY ||
      mode === DISPLAY_MODE_COURSES ||
      mode === DISPLAY_MODE_ACCOUNT ||
      mode === DISPLAY_MODE_ALL ||
      mode === DISPLAY_MODE_ME ||
      mode === DISPLAY_MODE_SUMMARY_ME ||
      mode === DISPLAY_MODE_COURSES_ME ||
      mode === DISPLAY_MODE_ACCOUNT_ME ||
      mode === DISPLAY_MODE_ALL_ME
    ) {
      return mode;
    }

    return DISPLAY_MODE_SUMMARY;
  },

  displayDetailMode: function(mode) {
    mode = this.validDisplayMode(mode);

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

    return mode;
  },

  isSelfDisplayMode: function(mode) {
    mode = this.validDisplayMode(mode);
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
    if (mode === PANEL_DISPLAY_STREAK) {
      return String(totalStreak);
    }
    if (mode === PANEL_DISPLAY_XP) {
      return String(totalXp);
    }

    return validUsers.length + " | " + totalStreak;
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
    let order = this.validSortOrder(this.sortOrder);

    this.userData.sort((a, b) => {
      if (order === SORT_ORDER_USERNAME_ASC) {
        return this.compareText(a.displayUsername, b.displayUsername) || this.compareConfiguredIndex(a, b);
      }
      if (order === SORT_ORDER_USERNAME_DESC) {
        return this.compareText(b.displayUsername, a.displayUsername) || this.compareConfiguredIndex(a, b);
      }
      if (order === SORT_ORDER_STREAK_DESC) {
        return this.compareNumber(b.streak, a.streak) || this.compareText(a.displayUsername, b.displayUsername);
      }
      if (order === SORT_ORDER_STREAK_ASC) {
        return this.compareNumber(a.streak, b.streak) || this.compareText(a.displayUsername, b.displayUsername);
      }
      if (order === SORT_ORDER_XP_DESC) {
        return this.compareNumber(b.totalXp, a.totalXp) || this.compareText(a.displayUsername, b.displayUsername);
      }
      if (order === SORT_ORDER_XP_ASC) {
        return this.compareNumber(a.totalXp, b.totalXp) || this.compareText(a.displayUsername, b.displayUsername);
      }

      return this.compareConfiguredIndex(a, b);
    });
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
    if (!this.isSelfDisplayMode(mode)) {
      return users;
    }

    let selfUser = this.getSelfUser(users);
    return selfUser ? [selfUser] : [];
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
      ])
    ].join("\n");
  },

  setMenuItemTooltip: function(item, text) {
    if (item.actor) {
      item._teamShareTooltip = new Tooltips.Tooltip(item.actor, text);
    }
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

    this.menu.removeAll();
    let clickDisplayMode = this.validDisplayMode(this.clickDisplayMode);
    let clickDetailMode = this.displayDetailMode(clickDisplayMode);

    if (this.userData.length === 0) {
      let configureUsers = new PopupMenu.PopupMenuItem(_("No users configured"));
      configureUsers.connect("activate", () => this.configureApplet());
      this.menu.addMenuItem(configureUsers);
    } else if (clickDisplayMode !== DISPLAY_MODE_NONE) {
      let displayUsers = this.getUsersForDisplayMode(this.userData, clickDisplayMode);

      if (displayUsers.length === 0 && this.isSelfDisplayMode(clickDisplayMode)) {
        let configureSelf = new PopupMenu.PopupMenuItem(_("No self user configured"));
        configureSelf.connect("activate", () => this.configureApplet());
        this.menu.addMenuItem(configureSelf);
      }

      let firstUser = true;
      for (let user of displayUsers) {
        if (!firstUser && clickDetailMode !== DISPLAY_MODE_SUMMARY) {
          this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        }
        firstUser = false;

        if (user.error) {
          this.menu.addMenuItem(new PopupMenu.PopupMenuItem(user.displayUsername + ": " + user.error));
          continue;
        }

        let lines = this.buildUserDisplayLines(user, this.clickDisplayMode);
        for (let index = 0; index < lines.length; index++) {
          let item = new PopupMenu.PopupMenuItem(lines[index]);
          if (index === 0) {
            if (user.highlighted) {
              this.highlightMenuItem(item);
            }
            this.setMenuItemTooltip(item, this.buildTeamShareTooltip(user));
            item.connect("activate", () => this.openProfile(user.username));
          } else {
            item.setSensitive(false);
          }
          this.menu.addMenuItem(item);
        }
      }
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
  },

  openProfile: function(username) {
    let url = "https://www.duolingo.com/profile/" + encodeURIComponent(username);
    Util.spawn(["xdg-open", url]);
  }
};

function main(metadata, orientation, panelHeight, instanceId) {
  return new MyApplet(metadata, orientation, panelHeight, instanceId);
}
