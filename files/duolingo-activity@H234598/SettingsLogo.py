#!/usr/bin/python3

import os

from JsonSettingsWidgets import SettingsWidget
from gi.repository import GdkPixbuf, Gtk


class BrandLogo(SettingsWidget):
    def __init__(self, info, key, settings):
        SettingsWidget.__init__(self)
        self.set_orientation(Gtk.Orientation.VERTICAL)
        self.set_spacing(0)
        self.set_margin_top(14)
        self.set_margin_bottom(14)

        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(base_dir, "assets", "duolingo-brand", "landscape-lockup.svg")

        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        box.set_halign(Gtk.Align.CENTER)

        try:
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(logo_path, 360, 84, True)
            image = Gtk.Image.new_from_pixbuf(pixbuf)
        except Exception:
            image = Gtk.Image.new_from_file(logo_path)

        box.pack_start(image, False, False, 0)
        self.content_widget = box
        self.pack_start(box, True, True, 0)
