#!/usr/bin/python3

import os
import subprocess

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
        github_url = "https://github.com/H234598/duolingo-helper-cinnamon/issues/new"

        event_box = Gtk.EventBox()
        event_box.set_visible_window(False)
        event_box.set_tooltip_text(
            "Ein kleines Werkzeug fuer bessere Duo-Routinen.\n"
            "Serv the owl.\n\n"
            "Best regards,\n"
            "H234598"
        )
        event_box.connect("button-press-event", lambda *_args: self.open_url(github_url))

        box = Gtk.Box(orientation=Gtk.Orientation.HORIZONTAL)
        box.set_halign(Gtk.Align.CENTER)

        try:
            pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(logo_path, 360, 84, True)
            image = Gtk.Image.new_from_pixbuf(pixbuf)
        except Exception:
            image = Gtk.Image.new_from_file(logo_path)

        image.set_halign(Gtk.Align.CENTER)
        box.pack_start(image, False, False, 0)

        event_box.add(box)
        self.content_widget = event_box
        self.pack_start(event_box, True, True, 0)

    def open_url(self, url):
        subprocess.Popen(["xdg-open", url])
        return True
