#!/usr/bin/python3

import gettext
import os

import gi
from JsonSettingsWidgets import SettingsWidget

gi.require_version("Gtk", "3.0")
from gi.repository import Gio, GObject, Gtk


class UsersTable(SettingsWidget):
    def __init__(self, info, key, settings):
        SettingsWidget.__init__(self)

        self.info = info
        self.key = info.get("target", key)
        self.settings = settings
        self.columns = info.get("columns") or self.get_target_property("columns", [])
        self.boolean_tree_columns = []
        self.true_icon = self.load_true_icon()
        self._saving = False
        self._ = self.get_translator()

        self.set_orientation(Gtk.Orientation.VERTICAL)
        self.set_spacing(8)
        self.set_margin_top(4)
        self.set_margin_bottom(4)

        description = info.get("description") or self.get_target_property("description", "Duolingo users")
        tooltip = info.get("tooltip") or self.get_target_property("tooltip", "")

        title = Gtk.Label(label=self.tr(description))
        title.set_halign(Gtk.Align.START)
        title.set_xalign(0)
        title.get_style_context().add_class("settings-section-title")
        if tooltip:
            title.set_tooltip_text(self.tr(tooltip))
        self.pack_start(title, False, False, 0)

        self.content_widget = Gtk.TreeView()
        self.content_widget.set_headers_visible(True)
        self.content_widget.set_activate_on_single_click(False)

        self.model = Gtk.ListStore(*self.get_store_types())
        self.content_widget.set_model(self.model)
        self.build_columns()
        self.content_widget.get_selection().connect("changed", self.update_button_sensitivity)
        self.content_widget.connect("row-activated", self.edit_item)
        self.content_widget.connect("button-press-event", self.on_tree_button_press)

        scrollbox = Gtk.ScrolledWindow()
        scrollbox.set_size_request(-1, int(info.get("height", 260)))
        scrollbox.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        scrollbox.add(self.content_widget)
        self.pack_start(scrollbox, True, True, 0)

        self.build_toolbar()
        self.settings.listen(self.key, self.on_setting_changed)
        self.load_rows(self.settings.get_value(self.key) or [])

    def get_translator(self):
        uuid = os.path.basename(os.path.dirname(os.path.abspath(__file__)))
        locale_root = os.path.expanduser("~/.local/share/locale")
        try:
            return gettext.translation(uuid, localedir=locale_root, fallback=True).gettext
        except Exception:
            return lambda text: text

    def tr(self, text):
        return self._(text) if text else text

    def get_target_property(self, prop, fallback):
        try:
            return self.settings.get_property(self.key, prop)
        except Exception:
            return fallback

    def load_true_icon(self):
        icon_path = os.path.join(
            os.path.dirname(os.path.abspath(__file__)),
            "assets",
            "duolingo-brand",
            "superhero-owl.svg",
        )
        if not os.path.exists(icon_path):
            return None
        return Gio.FileIcon.new(Gio.File.new_for_path(icon_path))

    def get_store_types(self):
        types = []
        for column in self.columns:
            if column.get("type") == "boolean":
                types.append(GObject.TYPE_BOOLEAN)
            else:
                types.append(GObject.TYPE_STRING)
        return types

    def build_columns(self):
        for index, column_def in enumerate(self.columns):
            if column_def.get("type") == "boolean":
                if self.true_icon is None:
                    renderer = Gtk.CellRendererToggle()
                    renderer.connect("toggled", self.toggle_boolean, index)
                    tree_column = Gtk.TreeViewColumn(self.tr(column_def.get("title", "")), renderer, active=index)
                else:
                    renderer = Gtk.CellRendererPixbuf()
                    renderer.set_fixed_size(26, 26)
                    tree_column = Gtk.TreeViewColumn(self.tr(column_def.get("title", "")), renderer)
                    tree_column.set_cell_data_func(renderer, self.boolean_icon_cell_data, index)
                    self.boolean_tree_columns.append((tree_column, index))
                tree_column.set_alignment(0.5)
                renderer.set_alignment(0.5, 0.5)
                tree_column.set_min_width(92)
            else:
                renderer = Gtk.CellRendererText()
                renderer.set_property("editable", True)
                renderer.connect("edited", self.edit_text, index)
                tree_column = Gtk.TreeViewColumn(self.tr(column_def.get("title", "")), renderer, text=index)
                tree_column.set_min_width(140)
                tree_column.set_expand(True)

            tooltip = self.tr(column_def.get("tooltip", ""))
            title = Gtk.Label(label=self.tr(column_def.get("title", "")))
            title.set_tooltip_text(tooltip)
            title.show()
            tree_column.set_widget(title)
            tree_column.set_resizable(True)
            self.content_widget.append_column(tree_column)
            header_button = tree_column.get_button()
            if header_button is not None:
                header_button.set_tooltip_text(tooltip)

    def boolean_icon_cell_data(self, _column, renderer, model, row_iter, column_index):
        renderer.set_property("gicon", self.true_icon if model[row_iter][column_index] else None)

    def on_tree_button_press(self, tree_view, event):
        if event.button != 1 or self.true_icon is None:
            return False

        hit = tree_view.get_path_at_pos(int(event.x), int(event.y))
        if hit is None:
            return False

        path, clicked_column, _cell_x, _cell_y = hit
        for tree_column, column_index in self.boolean_tree_columns:
            if tree_column == clicked_column:
                self.toggle_boolean(None, path.to_string(), column_index)
                tree_view.get_selection().select_path(path)
                return True

        return False

    def build_toolbar(self):
        toolbar = Gtk.Toolbar()
        toolbar.set_icon_size(1)
        Gtk.StyleContext.add_class(Gtk.Widget.get_style_context(toolbar), "inline-toolbar")

        self.add_button = self.make_button("xsi-list-add-symbolic", "Add new entry", self.add_item)
        self.remove_button = self.make_button("xsi-list-remove-symbolic", "Remove selected entry", self.remove_item)
        self.edit_button = self.make_button("xsi-list-edit-symbolic", "Edit selected entry", self.edit_item)
        self.move_up_button = self.make_button("xsi-go-up-symbolic", "Move selected entry up", self.move_item_up)
        self.move_down_button = self.make_button("xsi-go-down-symbolic", "Move selected entry down", self.move_item_down)

        for index, button in enumerate([
            self.add_button,
            self.remove_button,
            self.edit_button,
            self.move_up_button,
            self.move_down_button,
        ]):
            toolbar.insert(button, index)

        self.pack_start(toolbar, False, False, 0)
        self.update_button_sensitivity()

    def make_button(self, icon_name, tooltip, callback):
        button = Gtk.ToolButton(None, None)
        button.set_icon_name(icon_name)
        button.set_tooltip_text(self.tr(tooltip))
        button.connect("clicked", callback)
        return button

    def update_button_sensitivity(self, *args):
        model, selected = self.content_widget.get_selection().get_selected()
        has_selection = selected is not None
        self.remove_button.set_sensitive(has_selection)
        self.edit_button.set_sensitive(has_selection)
        self.move_up_button.set_sensitive(has_selection and model.iter_previous(selected) is not None)
        self.move_down_button.set_sensitive(has_selection and model.iter_next(selected) is not None)

    def normalize_value(self, column, row):
        column_id = column.get("id")
        default = column.get("default", False if column.get("type") == "boolean" else "")
        value = row.get(column_id, default) if isinstance(row, dict) else default
        if column.get("type") == "boolean":
            return bool(value)
        return "" if value is None else str(value)

    def default_row(self):
        return [self.normalize_value(column, {}) for column in self.columns]

    def load_rows(self, rows):
        self.model.clear()
        for row in rows:
            self.model.append([self.normalize_value(column, row) for column in self.columns])
        self.update_button_sensitivity()

    def rows_to_data(self):
        data = []
        for row in self.model:
            item = {}
            for index, column in enumerate(self.columns):
                item[column["id"]] = row[index]
            data.append(item)
        return data

    def save_rows(self):
        self._saving = True
        self.settings.set_value(self.key, self.rows_to_data())
        self._saving = False
        self.update_button_sensitivity()

    def on_setting_changed(self, _key=None, value=None):
        if self._saving:
            return
        if value is None:
            value = self.settings.get_value(self.key) or []
        self.load_rows(value)

    def toggle_boolean(self, _renderer, path, column_index):
        self.model[path][column_index] = not self.model[path][column_index]
        self.save_rows()

    def edit_text(self, _renderer, path, new_text, column_index):
        self.model[path][column_index] = new_text
        self.save_rows()

    def add_item(self, *args):
        row_iter = self.model.append(self.default_row())
        self.content_widget.get_selection().select_iter(row_iter)
        self.save_rows()

    def remove_item(self, *args):
        model, selected = self.content_widget.get_selection().get_selected()
        if selected is not None:
            model.remove(selected)
            self.save_rows()

    def edit_item(self, *args):
        model, selected = self.content_widget.get_selection().get_selected()
        if selected is None:
            return
        data = self.open_edit_dialog(model[selected])
        if data is not None:
            for index, value in enumerate(data):
                model[selected][index] = value
            self.save_rows()

    def move_item_up(self, *args):
        model, selected = self.content_widget.get_selection().get_selected()
        previous = model.iter_previous(selected) if selected is not None else None
        if previous is not None:
            model.swap(selected, previous)
            self.save_rows()

    def move_item_down(self, *args):
        model, selected = self.content_widget.get_selection().get_selected()
        next_iter = model.iter_next(selected) if selected is not None else None
        if next_iter is not None:
            model.swap(selected, next_iter)
            self.save_rows()

    def open_edit_dialog(self, info):
        dialog = Gtk.Dialog(
            self.tr("Edit selected entry"),
            self.get_toplevel(),
            Gtk.DialogFlags.MODAL,
            (Gtk.STOCK_CANCEL, Gtk.ResponseType.CANCEL, Gtk.STOCK_OK, Gtk.ResponseType.OK),
        )
        content = dialog.get_content_area()
        content.set_margin_right(24)
        content.set_margin_left(24)
        content.set_margin_top(16)
        content.set_margin_bottom(16)
        content.set_spacing(8)

        widgets = []
        for index, column in enumerate(self.columns):
            row = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL, spacing=12)
            label = Gtk.Label(label=self.tr(column.get("title", "")))
            label.set_xalign(0)
            label.set_size_request(150, -1)
            label.set_tooltip_text(self.tr(column.get("tooltip", "")))
            row.pack_start(label, False, False, 0)

            if column.get("type") == "boolean":
                widget = Gtk.CheckButton()
                widget.set_active(bool(info[index]))
            else:
                widget = Gtk.Entry()
                widget.set_text("" if info[index] is None else str(info[index]))
                widget.set_hexpand(True)
            widget.set_tooltip_text(self.tr(column.get("tooltip", "")))
            row.pack_start(widget, True, True, 0)
            widgets.append(widget)
            content.pack_start(row, False, False, 0)

        content.show_all()
        response = dialog.run()
        if response == Gtk.ResponseType.OK:
            values = []
            for widget in widgets:
                if isinstance(widget, Gtk.CheckButton):
                    values.append(widget.get_active())
                else:
                    values.append(widget.get_text())
            dialog.destroy()
            return values
        dialog.destroy()
        return None
