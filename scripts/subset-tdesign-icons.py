"""Keep only the TDesign icon glyphs referenced by the shipping mini program."""

import base64
import re
import subprocess
from io import BytesIO
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont


ICON_CODES = {
    "add": "E00D", "bluetooth": "E0C3", "camera": "E133", "catalog": "E15C",
    "chat": "E1B6", "chevron-down": "E1C8", "chevron-right": "E1D8", "chevron-up": "E1E0", "close": "E224",
    "delete": "E2BF", "edit-1": "E2F8", "folder": "E3E0", "fullscreen": "E400",
    "fullscreen-exit": "E3FF", "heart-filled": "E45F", "help-circle": "E462", "home": "E470",
    "image": "E498", "microphone": "E5C7", "mobile": "E5DE", "multiply": "E602", "pause": "E677",
    "play": "E6AA", "robot": "E6EC", "scan": "E70A", "secured": "E71F", "send": "E723",
    "send-filled": "E722", "service": "E72F", "setting": "E733", "sound": "E77A",
    "star": "E781", "template": "E803", "thunder": "E829", "time": "E832", "user": "E8C7",
    "user-vip": "E8C4", "view-module": "E8F9",
}

ROOT = Path(__file__).resolve().parents[1]
ICON_WXSS = ROOT / "miniprogram_npm" / "tdesign-miniprogram" / "icon" / "icon.wxss"


def main():
    # The full source font is intentionally kept out of the shipping package.
    original = subprocess.check_output(
        ["git", "show", "HEAD:miniprogram_npm/tdesign-miniprogram/icon/icon.wxss"],
        cwd=ROOT,
        text=True,
        encoding="utf-8",
    )
    match = re.search(r"base64,([^')]+)", original)
    if not match:
        raise RuntimeError("Unable to locate the source icon font.")

    font = TTFont(BytesIO(base64.b64decode(match.group(1))))
    options = subset.Options()
    options.flavor = "woff"
    options.layout_features = ["*"]
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=[int(code, 16) for code in ICON_CODES.values()])
    subsetter.subset(font)

    output = BytesIO()
    font.save(output)
    font_data = base64.b64encode(output.getvalue()).decode("ascii")
    glyph_rules = "".join(
        ".t-icon-{}:before{{content:'\\{}';}}".format(name, code)
        for name, code in ICON_CODES.items()
    )
    css = (
        "@import '../common/style/index.wxss';"
        "@font-face{{font-family:t;src:url('data:font/woff;base64,{}') format('woff');font-weight:400;font-style:normal;}}"
        ".t-icon--image,.t-icon__image{{width:100%;height:100%;}}"
        ".t-icon__image{{vertical-align:top;}}"
        ".t-icon-base{{box-sizing:border-box;width:100%;height:100%;font-style:normal;font-weight:400;font-variant:normal;text-transform:none;line-height:1;text-align:center;display:flex;align-items:center;justify-content:center;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}}"
        ".t-icon{{box-sizing:border-box;width:1em;height:1em;line-height:1;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;font-family:t!important;}}{}"
    ).format(font_data, glyph_rules)
    ICON_WXSS.write_text(css, encoding="utf-8")


if __name__ == "__main__":
    main()
