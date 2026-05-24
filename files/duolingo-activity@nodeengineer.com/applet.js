const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Util = imports.misc.util;
const St = imports.gi.St;
const Soup = imports.gi.Soup;
const GLib = imports.gi.GLib;
const Gettext = imports.gettext;
const ByteArray = imports.byteArray;

const UUID = "duolingo-activity@nodeengineer.com";
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const UPDATE_INTERVAL_SECONDS = 300;

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

    this.settings = new Settings.AppletSettings(this, UUID, instanceId);
    this.settings.bindProperty(
      Settings.BindingDirection.IN,
      "users",
      "users",
      this.onSettingsChanged,
      null
    );

    this.set_applet_icon_path(APPLET_PATH + "/icon.png");
    this.set_applet_label("Duo");
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
        displayUsername: (row.alias || "").trim() || username
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
    this.pendingRequests = this.configuredUsers.length;

    if (this.configuredUsers.length === 0) {
      this.updateDisplay();
      return;
    }

    this.set_applet_label("...");
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

  fetchUserActivity: function(userConfig) {
    let url = `https://www.duolingo.com/2017-06-30/users?username=${encodeURIComponent(userConfig.username)}`;
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

    let user = responseParsed.users[0];
    if (this.isTruthyActivity(user.hasRecentActivity15)) {
      this.activeUsers.push(userConfig);
    } else {
      this.inactiveUsers.push(userConfig);
    }

    this.finishRequest();
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
      this.set_applet_label("Duo");
      this.set_applet_tooltip(_("Duolingo Activity") + "\n" + _("No users configured"));
      this.rebuildMenu();
      return;
    }

    this.activeUsers.sort((a, b) => a.displayUsername.localeCompare(b.displayUsername));
    this.inactiveUsers.sort((a, b) => a.displayUsername.localeCompare(b.displayUsername));
    this.errors.sort((a, b) => a.displayUsername.localeCompare(b.displayUsername));

    this.set_applet_label(this.activeUsers.length > 0 ? "Duo " + this.activeUsers.length : "Duo");
    this.set_applet_tooltip(this.buildTooltip());
    this.rebuildMenu();
  },

  buildTooltip: function() {
    let lines = [];

    for (let user of this.activeUsers) {
      lines.push(formatString(_("%s is playing Duolingo right now!"), [user.displayUsername]));
    }

    if (lines.length === 0) {
      lines.push(_("No one is playing Duolingo right now."));
    }

    for (let error of this.errors) {
      lines.push(error.displayUsername + ": " + error.error);
    }

    return lines.join("\n");
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
      this.addUserGroupToMenu(_("Active now"), this.activeUsers, true);
      this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
      this.addUserGroupToMenu(_("Inactive"), this.inactiveUsers, false);

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
      item.setSensitive(false);
      this.menu.addMenuItem(item);
    }
  }
};

function main(metadata, orientation, panelHeight, instanceId) {
  return new DuolingoActivityApplet(metadata, orientation, panelHeight, instanceId);
}
