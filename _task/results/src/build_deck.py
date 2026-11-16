# Builds the Logify capstone presentation in English and Lithuanian.
#   python -I -X utf8 build_deck.py          -> ../Logify_EN.pptx, ../Logify_LT.pptx
# Screenshots come from ../screenshots/{en,lt,evidence}; texts from content.py.
import os
import re
import sys

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
from pptx.enum.text import MSO_ANCHOR, MSO_AUTO_SIZE, PP_ALIGN
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from content import CONTENT  # noqa: E402

RESULTS = os.path.dirname(HERE)
SHOTS = os.path.join(RESULTS, "screenshots")
ASSETS = os.path.join(HERE, "assets")

# ---- theme tokens -------------------------------------------------------
DARK = "10161E"
DARK2 = "1A232E"
TEAL = "0F766E"
TEAL_B = "2DD4BF"
NEON = "00F0B4"
ORANGE = "F97316"
ORANGE_D = "C2410C"
BLUE = "2563EB"
INK = "1D2330"
MUTED = "5B6475"
LINE = "D9DEE6"
SOFT = "F3F5F8"
SOFT_O = "FFF1E6"
SOFT_T = "E3F3F1"
WHITE = "FFFFFF"

HEAD = "Bahnschrift SemiBold Condensed"
HEAD_N = "Bahnschrift SemiBold"
BODY = "Segoe UI"
BODY_B = "Segoe UI Semibold"

SW, SH = Inches(13.333), Inches(7.5)


def rgb(h):
    return RGBColor.from_string(h)


# ---- low-level helpers ---------------------------------------------------
TOKEN = re.compile(r"(\*\*.+?\*\*|\*[^*\s][^*]*?\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)")


def add_runs(p, text, size, color, font, bold=False, link_color=TEAL):
    """Adds runs to paragraph p. Supports **bold**, [label](url) and `code`."""
    for part in TOKEN.split(text):
        if not part:
            continue
        r = p.add_run()
        f = r.font
        f.size = Pt(size)
        f.name = font
        f.bold = bold
        f.color.rgb = rgb(color)
        if part.startswith("**") and part.endswith("**"):
            r.text = part[2:-2]
            f.bold = True
        elif part.startswith("*") and part.endswith("*") and len(part) > 2:
            r.text = part[1:-1]
            f.italic = True
        elif part.startswith("[") and "](" in part:
            label, url = part[1:].split("](", 1)
            r.text = label
            r.hyperlink.address = url[:-1]
            f.color.rgb = rgb(link_color)
            f.underline = True
        elif part.startswith("`") and part.endswith("`"):
            r.text = part[1:-1]
            f.name = "Consolas"
            f.size = Pt(max(size - 1, 8))
            f.color.rgb = rgb(ORANGE_D if color not in (WHITE, "E6EAF0") else TEAL_B)
        else:
            r.text = part


def bulletize(p, char="▪", color=ORANGE, indent=0.24, level_indent=0.0):
    pPr = p._p.get_or_add_pPr()
    pPr.set("marL", str(int(Inches(indent + level_indent))))
    pPr.set("indent", str(-int(Inches(indent))))
    buClr = etree.SubElement(pPr, qn("a:buClr"))
    etree.SubElement(buClr, qn("a:srgbClr")).set("val", color)
    etree.SubElement(pPr, qn("a:buFont")).set("typeface", "Arial")
    etree.SubElement(pPr, qn("a:buChar")).set("char", char)


def text(slide, x, y, w, h, paras, size=16, color=INK, font=BODY, bold=False,
         align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, bullets=False, space=6,
         line=None, bullet_color=ORANGE, margin=0.04, link_color=TEAL):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(margin))
    fill_frame(tf, paras, size, color, font, bold, align, bullets, space, line, bullet_color, link_color)
    return tb


def fill_frame(tf, paras, size, color, font, bold=False, align=PP_ALIGN.LEFT, bullets=False,
               space=6, line=None, bullet_color=ORANGE, link_color=TEAL):
    if isinstance(paras, str):
        paras = [paras]
    first = True
    for item in paras:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = align
        p.space_after = Pt(space)
        if line:
            p.line_spacing = line
        sub = isinstance(item, tuple) and item[0] == "sub"
        t = item[1] if sub else item
        if bullets and t:
            bulletize(p, char="–" if sub else "▪", color=MUTED if sub else bullet_color,
                      level_indent=0.24 if sub else 0.0)
        add_runs(p, t, size - (1 if sub else 0), MUTED if sub else color, font, bold, link_color)


def rect(slide, x, y, w, h, fill, line_color=None, shape=MSO_SHAPE.RECTANGLE, line_w=1.0, adj=None,
         dash=False):
    s = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    s.shadow.inherit = False
    if adj is not None:
        for i, a in enumerate(adj if isinstance(adj, (list, tuple)) else [adj]):
            s.adjustments[i] = a
    if fill:
        s.fill.solid()
        s.fill.fore_color.rgb = rgb(fill)
    else:
        s.fill.background()
    if line_color:
        s.line.color.rgb = rgb(line_color)
        s.line.width = Pt(line_w)
        if dash:
            ln = s.line._get_or_add_ln()
            etree.SubElement(ln, qn("a:prstDash")).set("val", "dash")
    else:
        s.line.fill.background()
    return s


def box(slide, x, y, w, h, paras, fill=WHITE, line_color=LINE, size=13, color=INK, font=BODY,
        bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, radius=0.08, margin=0.12,
        bullets=False, space=3, dash=False, line_w=1.0, shape=None):
    s = rect(slide, x, y, w, h, fill, line_color, shape or MSO_SHAPE.ROUNDED_RECTANGLE,
             line_w=line_w, adj=radius if shape is None else None, dash=dash)
    tf = s.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.vertical_anchor = anchor
    for side in ("left", "right", "top", "bottom"):
        setattr(tf, f"margin_{side}", Inches(margin))
    fill_frame(tf, paras, size, color, font, bold, align, bullets, space)
    return s


def arrow(slide, x1, y1, x2, y2, color=MUTED, w=1.75, dash=False, head=True):
    c = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    c.line.color.rgb = rgb(color)
    c.line.width = Pt(w)
    ln = c.line._get_or_add_ln()
    if dash:
        etree.SubElement(ln, qn("a:prstDash")).set("val", "dash")
    if head:
        t = etree.SubElement(ln, qn("a:tailEnd"))
        t.set("type", "triangle")
        t.set("w", "med")
        t.set("len", "med")
    return c


def badge(slide, x, y, label, fill=ORANGE, color=WHITE, size=11, w=None, h=0.3):
    w = w or (0.16 + 0.085 * len(label) * size / 11)
    s = box(slide, x, y, w, h, [label], fill=fill, line_color=None, size=size, color=color, font=HEAD_N,
            align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, radius=0.5, margin=0.02)
    return s


def picture(slide, path, x, y, w, h, crop=None, border=LINE, align="center"):
    """Fits the image into the (x, y, w, h) box. crop = (left, top, right, bottom) fractions."""
    from PIL import Image
    iw, ih = Image.open(path).size
    cl, ct, cr, cb = crop or (0, 0, 0, 0)
    vw, vh = iw * (1 - cl - cr), ih * (1 - ct - cb)
    scale = min(w / vw, h / vh)
    pw, ph = vw * scale, vh * scale
    px = x + (w - pw) / 2 if align == "center" else x
    py = y + (h - ph) / 2 if align == "center" else y
    pic = slide.shapes.add_picture(path, Inches(px), Inches(py), Inches(pw), Inches(ph))
    pic.crop_left, pic.crop_top, pic.crop_right, pic.crop_bottom = cl, ct, cr, cb
    if border:
        pic.line.color.rgb = rgb(border)
        pic.line.width = Pt(1)
    return pic, (px, py, pw, ph)


def notes(slide, t):
    slide.notes_slide.notes_text_frame.text = t.strip()


# ---- slide templates -----------------------------------------------------
class Deck:
    def __init__(self, lang):
        self.lang = lang
        self.c = CONTENT[lang]
        self.prs = Presentation()
        self.prs.slide_width, self.prs.slide_height = SW, SH
        self.layout = self.prs.slide_layouts[6]
        self.count = 0
        from pptx.opc.constants import RELATIONSHIP_TYPE as RT
        theme = self.prs.slide_masters[0].part.part_related_by(RT.THEME)
        xml = theme.blob.decode("utf-8")
        xml = re.sub(r"<a:hlink>.*?</a:hlink>", f'<a:hlink><a:srgbClr val="{TEAL}"/></a:hlink>', xml, flags=re.S)
        xml = re.sub(r"<a:folHlink>.*?</a:folHlink>", f'<a:folHlink><a:srgbClr val="{TEAL}"/></a:folHlink>', xml,
                     flags=re.S)
        theme._blob = xml.encode("utf-8")

    def new(self, dark=False):
        s = self.prs.slides.add_slide(self.layout)
        self.count += 1
        s.background.fill.solid()
        s.background.fill.fore_color.rgb = rgb(DARK if dark else WHITE)
        return s

    def stripes(self, s, x0, y0=0.0, h=7.5, scale=1.0):
        # Diagonal running-lane stripes: the theme's signature.
        spec = [(0.0, 0.9, TEAL_B), (1.05, 0.5, ORANGE), (1.7, 0.18, WHITE), (2.03, 0.9, TEAL),
                (3.08, 0.18, ORANGE)]
        for dx, w, col in spec:
            rect(s, x0 + dx * scale, y0, w * scale, h, col, shape=MSO_SHAPE.PARALLELOGRAM, adj=0.62)

    def header(self, s, tag, title, kicker=None):
        rect(s, 0.42, 0.36, 1.0, 0.66, ORANGE, shape=MSO_SHAPE.PARALLELOGRAM, adj=0.28)
        text(s, 0.42, 0.36, 1.0, 0.66, [tag], size=24, color=WHITE, font=HEAD, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, space=0)
        text(s, 1.58, 0.30, 10.0, 0.78, [title], size=30, color=INK, font=HEAD, anchor=MSO_ANCHOR.MIDDLE,
             space=0)
        if kicker:
            text(s, 1.6, 0.98, 10.0, 0.3, [kicker], size=11, color=MUTED, font=BODY, space=0)
        rect(s, 0.42, 1.24, 12.49, 0.035, TEAL)
        rect(s, 0.42, 1.24, 1.0, 0.035, ORANGE)
        for i, col in enumerate((TEAL_B, ORANGE, LINE)):
            rect(s, 12.05 + i * 0.3, 0.45, 0.18, 0.5, col, shape=MSO_SHAPE.PARALLELOGRAM, adj=0.55)
        # footer
        rect(s, 0.42, 7.04, 12.49, 0.012, LINE)
        text(s, 0.42, 7.08, 6, 0.3, [self.c["footer"]], size=9, color=MUTED, font=BODY, space=0)
        text(s, 11.9, 7.08, 1.0, 0.3, [str(self.count)], size=9, color=MUTED, font=HEAD_N,
             align=PP_ALIGN.RIGHT, space=0)

    def content(self, tag, title, kicker=None):
        s = self.new()
        self.header(s, tag, title, kicker)
        return s

    def section(self, letter, title, subtitle, note):
        s = self.new(dark=True)
        self.stripes(s, 8.6)
        text(s, 0.8, 1.2, 4, 1.6, [letter], size=120, color=ORANGE, font=HEAD, space=0)
        text(s, 0.8, 3.0, 7.6, 1.2, [title], size=48, color=WHITE, font=HEAD, space=0)
        text(s, 0.82, 4.25, 7.4, 1.6, subtitle, size=18, color="C9D1DC", font=BODY, space=6)
        s.shapes.add_picture(os.path.join(ASSETS, "logo-light-crop.png"), Inches(0.82), Inches(6.45),
                             height=Inches(0.48))
        notes(s, note)
        return s

    def save(self, path):
        self.prs.save(path)


# ---- slides ---------------------------------------------------------------
def slide_title(d):
    c = d.c["title"]
    s = d.new(dark=True)
    d.stripes(s, 9.0)
    s.shapes.add_picture(os.path.join(ASSETS, "logo-light-crop.png"), Inches(0.8), Inches(0.75),
                         height=Inches(0.95))
    text(s, 0.82, 2.15, 8.3, 0.4, [c["kicker"]], size=13, color=TEAL_B, font=HEAD_N, space=0)
    text(s, 0.8, 2.55, 7.9, 2.0, [c["title"]], size=48, color=WHITE, font=HEAD, space=0, line=0.92)
    text(s, 0.82, 4.55, 7.6, 1.0, [c["sub"]], size=19, color="C9D1DC", font=BODY, space=0)
    rect(s, 0.82, 5.75, 0.08, 0.72, ORANGE)
    for i, item in enumerate(c["links"]):
        dark_link(s, 1.02, 5.72 + i * 0.37, 7.6, 0.36, item, size=13)
    text(s, 0.82, 6.75, 8.0, 0.35, [c["year"]], size=12, color="8A94A6", font=HEAD_N, space=0)
    notes(s, c["notes"])


def dark_link(s, x, y, w, h, item, size=13, color=WHITE, font=BODY):
    """On dark slides: a theme-coloured hyperlink would be unreadable, so the label is plain text in bright
    teal and the whole text box carries the link."""
    m = re.search(r"\[([^\]]+)\]\(([^)]+)\)", item)
    if not m:
        return text(s, x, y, w, h, [item], size=size, color=color, font=font, space=0)
    tb = text(s, x, y, w, h, [item[:m.start()] + "**" + m.group(1) + "**" + item[m.end():]], size=size,
              color=color, font=font, space=0)
    for p in tb.text_frame.paragraphs:
        for r in p.runs:
            if r.text == m.group(1):
                r.font.color.rgb = rgb(TEAL_B)
                r.font.bold = False
                r.font.underline = True
    tb.click_action.hyperlink.address = m.group(2)
    return tb


def slide_problem(d):
    c = d.c["problem"]
    s = d.content("01", c["title"])
    # left: the gap
    text(s, 0.45, 1.5, 5.6, 0.4, [c["gap_h"]], size=15, color=MUTED, font=HEAD_N, space=0)
    y = 1.95
    for head, body, col in c["gap"]:
        box(s, 0.45, y, 5.6, 1.45, [f"**{head}**", body], fill=SOFT, line_color=None, size=13.5, space=4,
            anchor=MSO_ANCHOR.MIDDLE, margin=0.22)
        rect(s, 0.45, y, 0.08, 1.45, col)
        y += 1.62
    text(s, 0.45, y + 0.02, 5.6, 0.8, [c["gap_note"]], size=13, color=INK, font=BODY_B, space=0)
    # right: logify
    text(s, 6.5, 1.5, 6.4, 0.4, [c["idea_h"]], size=15, color=MUTED, font=HEAD_N, space=0)
    y = 1.95
    for i, (head, body) in enumerate(c["points"], 1):
        rect(s, 6.5, y, 0.62, 1.15, [TEAL, ORANGE, BLUE][i - 1], shape=MSO_SHAPE.PARALLELOGRAM, adj=0.25)
        text(s, 6.5, y, 0.62, 1.15, [str(i)], size=28, color=WHITE, font=HEAD, align=PP_ALIGN.CENTER,
             anchor=MSO_ANCHOR.MIDDLE, space=0)
        text(s, 7.3, y - 0.02, 5.6, 1.2, [f"**{head}**", body], size=14, color=INK, space=3)
        y += 1.32
    box(s, 6.5, y + 0.05, 6.4, 0.95, [c["sentence"]], fill=SOFT_T, line_color=None, size=13, color=INK,
        anchor=MSO_ANCHOR.MIDDLE)
    notes(s, c["notes"])


def slide_scope(d):
    c = d.c["scope"]
    s = d.content("02", c["title"], c["kicker"])
    rows = c["rows"]
    gf = s.shapes.add_table(len(rows) + 1, 2, Inches(0.45), Inches(1.5), Inches(12.45), Inches(5.2))
    tbl = gf.table
    tbl.columns[0].width = Inches(3.1)
    tbl.columns[1].width = Inches(9.35)
    style_table(tbl, [c["head"]] + rows, sizes=(14, 14), first_col_bold=True)
    notes(s, c["notes"])


def style_table(tbl, rows, sizes=(13, 13), first_col_bold=False, header_fill=DARK, zebra=True,
                col_colors=None):
    tblPr = tbl._tbl.tblPr
    tblPr.set("firstRow", "0")
    tblPr.set("bandRow", "0")
    for r, row in enumerate(rows):
        for ci, val in enumerate(row):
            cell = tbl.cell(r, ci)
            cell.margin_left = cell.margin_right = Inches(0.1)
            cell.margin_top = cell.margin_bottom = Inches(0.05)
            cell.vertical_anchor = MSO_ANCHOR.MIDDLE
            cell.fill.solid()
            if r == 0:
                cell.fill.fore_color.rgb = rgb(header_fill)
            else:
                cell.fill.fore_color.rgb = rgb(SOFT if (zebra and r % 2 == 0) else WHITE)
            tf = cell.text_frame
            tf.word_wrap = True
            tf.paragraphs[0].text = ""
            parts = val if isinstance(val, list) else [val]
            first = True
            for part in parts:
                p = tf.paragraphs[0] if first else tf.add_paragraph()
                first = False
                p.space_after = Pt(1)
                if r == 0:
                    add_runs(p, part, sizes[0], WHITE, HEAD_N)
                else:
                    col = (col_colors or {}).get(ci, INK)
                    add_runs(p, part, sizes[1], col, BODY_B if (first_col_bold and ci == 0) else BODY)


def slide_flow(d):
    c = d.c["flow"]
    s = d.content("03", c["title"])
    lh = 2.25
    lanes = [(c["athlete"], ORANGE, SOFT_O, 1.55), (c["instructor"], TEAL, SOFT_T, 4.6)]
    for label, col, soft, y in lanes:
        rect(s, 0.45, y, 12.45, lh, soft)
        rect(s, 0.45, y, 0.5, lh, col)
        tb = text(s, 0.45, y, 0.5, lh, [label], size=16, color=WHITE, font=HEAD, align=PP_ALIGN.CENTER,
                  anchor=MSO_ANCHOR.MIDDLE, space=0)
        tb.rotation = 270
        # a rotated text box needs swapped geometry
        tb.left, tb.top = Inches(0.45 + 0.25 - lh / 2), Inches(y + lh / 2 - 0.25)
        tb.width, tb.height = Inches(lh), Inches(0.5)
    w, gap = 1.7, 0.28
    xs = [1.15 + i * (w + gap) for i in range(6)]
    bh = 1.6
    for i, (num, head, body) in enumerate(c["steps"]):
        x = xs[i]
        box(s, x, 1.88, w, bh, [f"**{head}**", body], fill=WHITE, line_color=ORANGE, size=12,
            space=3, margin=0.1, line_w=1.5)
        badge(s, x + 0.08, 1.7, num, fill=ORANGE, w=0.42, h=0.32, size=12)
        if i < 5:
            arrow(s, x + w, 2.68, xs[i + 1], 2.68, color=ORANGE, w=2.25)
    for col_i, num, head, body, link in c["coach"]:
        x = xs[col_i]
        box(s, x, 4.93, w, bh, [f"**{head}**", body], fill=WHITE, line_color=TEAL, size=12, space=3,
            margin=0.1, line_w=1.5)
        badge(s, x + 0.08, 4.75, num, fill=TEAL, w=0.42, h=0.32, size=12)
        if link:
            arrow(s, x + w / 2, 1.88 + bh, x + w / 2, 4.75, color=TEAL, w=2.25, dash=True)
            text(s, x + w / 2 + 0.08, 3.95, 1.0, 0.35, [link], size=11, color=TEAL, font=BODY_B, space=0)
    notes(s, c["notes"])


def slide_arch(d):
    c = d.c["arch"]
    s = d.content("04", c["title"])
    xs = [0.45, 3.05, 5.65, 8.25, 10.85]
    w, h, y = 2.05, 1.5, 1.55
    fills = [SOFT, SOFT_T, SOFT, SOFT_O, SOFT]
    for i, (head, body) in enumerate(c["row"]):
        box(s, xs[i], y, w, h, [f"**{head}**"] + body, fill=fills[i], line_color=LINE, size=11.5, space=2)
        if i < 4:
            arrow(s, xs[i] + w, y + h / 2, xs[i + 1], y + h / 2, color=INK, w=2)
            # numbered marker on the arrow
            mx = (xs[i] + w + xs[i + 1]) / 2
            box(s, mx - 0.17, y + h / 2 - 0.47, 0.34, 0.34, [str(i + 1)], fill=ORANGE, line_color=None,
                size=11, color=WHITE, font=HEAD_N, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE,
                radius=0.5, margin=0)
    # code path, stacked under the browser
    box(s, 0.45, 3.75, w, 1.3, [f"**{c['vercel'][0]}**", c["vercel"][1]], fill=WHITE, line_color=TEAL,
        size=11.5, space=2, line_w=1.5)
    box(s, 0.45, 5.6, w, 1.2, [f"**{c['github'][0]}**", c["github"][1]], fill=WHITE, line_color=TEAL,
        size=11.5, space=2, line_w=1.5)
    arrow(s, 1.47, 5.6, 1.47, 5.05, color=TEAL, w=2)
    arrow(s, 1.47, 3.75, 1.47, 3.05, color=TEAL, w=2)
    text(s, 1.55, 3.22, 1.45, 0.4, [c["serves"]], size=10, color=TEAL, font=BODY_B, space=0)
    # legend of numbered arrows
    text(s, 3.05, 3.4, 9.85, 1.6, c["legend"], size=13.5, color=INK, space=5)
    # callouts
    y2 = 5.35
    for i, (head, body) in enumerate(c["callouts"]):
        x = 3.05 + i * 3.3
        box(s, x, y2, 3.1, 1.45, [f"**{head}**", body], fill=SOFT_O if i == 0 else SOFT_T, line_color=None,
            size=12, space=3)
    box(s, 9.65, y2, 3.25, 1.45, [f"**{c['notion'][0]}**", c["notion"][1]], fill=WHITE, line_color=MUTED,
        size=12, space=3, dash=True)
    notes(s, c["notes"])


def slide_erd(d):
    c = d.c["erd"]
    s = d.content("05", c["title"])

    def table_box(x, y, w, name, fields, hl):
        hh = 0.42
        rect(s, x, y, w, hh, ORANGE if hl else MUTED)
        text(s, x + 0.08, y, w - 0.16, hh, [name], size=15, color=WHITE, font=HEAD, anchor=MSO_ANCHOR.MIDDLE,
             space=0)
        bh = 0.245 * len(fields) + 0.16
        box(s, x, y + hh, w, bh, fields, fill=SOFT_O if hl else SOFT, line_color=ORANGE if hl else LINE,
            size=11, space=1, radius=0.0, margin=0.1, shape=MSO_SHAPE.RECTANGLE)
        return y + hh + bh

    table_box(0.45, 1.55, 3.0, c["plans"][0], c["plans"][1], True)
    table_box(4.35, 1.55, 3.95, c["workouts"][0], c["workouts"][1], True)
    arrow(s, 3.45, 2.2, 4.35, 2.2, color=ORANGE_D, w=2.5)
    text(s, 3.5, 1.82, 0.85, 0.35, ["1 → n"], size=12, color=ORANGE_D, font=HEAD_N, align=PP_ALIGN.CENTER,
         space=0)
    text(s, 0.45, 3.65, 3.0, 1.0, [c["legend"]], size=11, color=MUTED, space=0)
    # extended tables as chips
    text(s, 0.45, 4.75, 8.0, 0.35, [c["ext_h"]], size=13, color=MUTED, font=HEAD_N, space=0)
    for i, (name, body) in enumerate(c["ext"]):
        x = 0.45 + (i % 3) * 2.65
        y = 5.12 + (i // 3) * 0.95
        box(s, x, y, 2.5, 0.82, [f"**{name}**", body], fill=SOFT, line_color=LINE, size=10.5, space=1,
            margin=0.08)
    # RLS panel
    rect(s, 8.75, 1.55, 4.15, 5.25, DARK)
    text(s, 8.95, 1.7, 3.8, 0.45, [c["rls_h"]], size=18, color=TEAL_B, font=HEAD, space=0)
    text(s, 8.95, 2.2, 3.8, 4.5, c["rls"], size=12, color="E6EAF0", font=BODY, bullets=True, space=7,
         bullet_color=ORANGE)
    notes(s, c["notes"])


def slide_zaps(d):
    c = d.c["zaps"]
    s = d.content("06", c["title"])

    def chip(x, y, w, label, fill, col=WHITE, h=0.62, size=11.5):
        return box(s, x, y, w, h, [label], fill=fill, line_color=None, size=size, color=col, font=BODY_B,
                   align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, margin=0.05)

    text(s, 0.45, 1.45, 6.0, 0.4, [c["z1_h"]], size=16, color=INK, font=HEAD, space=0)
    chip(0.45, 1.95, 1.35, c["hook"], DARK)
    arrow(s, 1.8, 2.26, 2.05, 2.26, color=INK)
    chip(2.05, 1.95, 2.05, c["filter"], TEAL)
    arrow(s, 4.1, 2.26, 4.35, 2.26, color=INK)
    chip(4.35, 1.95, 1.0, c["paths"], BLUE)
    arrow(s, 4.85, 2.57, 4.85, 2.8, color=INK, head=False)
    arrow(s, 2.3, 2.8, 5.8, 2.8, color=INK, head=False)
    arrow(s, 2.3, 2.8, 2.3, 3.05, color=ORANGE_D)
    arrow(s, 5.8, 2.8, 5.8, 3.05, color=MUTED)
    chip(0.75, 3.05, 3.1, c["path_a"], ORANGE, h=0.85)
    chip(4.25, 3.05, 3.1, c["path_b"], MUTED, h=0.85)
    text(s, 0.45, 4.0, 7.0, 0.4, [c["err"]], size=11, color=MUTED, space=0)

    text(s, 0.45, 4.5, 6.0, 0.4, [c["z2_h"]], size=16, color=INK, font=HEAD, space=0)
    chip(0.45, 5.0, 1.35, c["hook"], DARK)
    arrow(s, 1.8, 5.31, 2.05, 5.31, color=INK)
    chip(2.05, 5.0, 2.05, c["filter2"], TEAL)
    arrow(s, 4.1, 5.31, 4.35, 5.31, color=INK)
    chip(4.35, 5.0, 3.0, c["gmail2"], ORANGE)

    box(s, 0.45, 5.9, 6.9, 0.95, [c["trap"]], fill=SOFT_O, line_color=None, size=12, anchor=MSO_ANCHOR.MIDDLE)
    pic, (px, py, pw, ph) = picture(s, os.path.join(SHOTS, "evidence", "zapier-zap1-paths.jpg"), 7.75, 1.5,
                                    5.15, 4.45, crop=(0.22, 0.24, 0.2, 0.0))
    text(s, 7.75, py + ph + 0.05, 5.15, 0.4, [c["shot"]], size=10, color=MUTED, align=PP_ALIGN.CENTER,
         space=0)
    box(s, 7.75, 6.25, 5.15, 0.6, [c["to"]], fill=SOFT_T, line_color=None, size=11.5,
        anchor=MSO_ANCHOR.MIDDLE)
    notes(s, c["notes"])


def slide_mail_flow(d, key, tag):
    """Left-to-right flowchart: does anyone get an email when a new user logs a workout / sends a report?
    content: spine = [(kind, text)], kind in start | dec | proc | mail; edges = labels of the arrows between
    spine nodes; downs = [(spine index, arrow label, kind, text)], kind in none | note | mail2."""
    c = d.c[key]
    s = d.content(tag, c["title"], c["kicker"])
    nodes, labels = c["spine"], c["edges"]
    n = len(nodes)
    Y = 2.42                                   # centre line of the main path
    half = {"start": 0.45, "dec": 0.75, "proc": 0.6, "mail": 0.7}
    # every arrow gets at least the room its label needs; the nodes share the rest
    gaps = [max(0.38, 0.1 + 0.072 * len(lab)) if lab else 0.38 for lab in labels]
    base = [{"start": 1.3, "dec": 1.95, "proc": 1.9, "mail": 1.8}[k] for k, _ in nodes]
    k = (12.45 - sum(gaps)) / sum(base)
    widths = [w * k for w in base]
    xs = [0.45]
    for i in range(n - 1):
        xs.append(xs[-1] + widths[i] + gaps[i])
    cx = [x + w / 2 for x, w in zip(xs, widths)]
    for i, ((kind, txt), x, w) in enumerate(zip(nodes, xs, widths)):
        h = half[kind] * 2
        if kind == "start":
            box(s, x, Y - h / 2, w, h, [txt], fill=DARK, line_color=None, size=13, color=WHITE, font=HEAD,
                align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, radius=0.5, margin=0.06)
        elif kind == "dec":
            # a diamond's own text area is only half its width, so the question sits in a wider text box on top
            rect(s, x, Y - h / 2, w, h, WHITE, TEAL, shape=MSO_SHAPE.DIAMOND, line_w=2)
            text(s, x + w * 0.13, Y - h * 0.35, w * 0.74, h * 0.7, [txt], size=11, font=BODY_B,
                 align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, space=0, margin=0)
        elif kind == "proc":
            box(s, x, Y - h / 2, w, h, [txt], fill=SOFT, line_color=LINE, size=11, align=PP_ALIGN.CENTER,
                anchor=MSO_ANCHOR.MIDDLE, margin=0.1)
        else:
            box(s, x, Y - h / 2, w, h, [txt], fill=ORANGE, line_color=None, size=11, color=WHITE,
                align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, margin=0.1)
        if i < n - 1:
            arrow(s, x + w, Y, xs[i + 1], Y, color=INK, w=2)
            if labels[i]:
                text(s, x + w - 0.3, Y - 0.33, gaps[i] + 0.6, 0.28, [labels[i]], size=10, color=TEAL,
                     font=BODY_B, align=PP_ALIGN.CENTER, space=0)
    # side exits, each in its own column under the node it leaves
    top, bh = 3.75, 1.3
    downs = c["downs"]
    for j, (i, lab, kind, txt) in enumerate(downs):
        left = 0.45 if j == 0 else (cx[downs[j - 1][0]] + cx[i]) / 2 + 0.07
        right = 12.9 if j == len(downs) - 1 else (cx[i] + cx[downs[j + 1][0]]) / 2 - 0.07
        if right - left > 3.0:                 # keep a wide column's box close to its arrow
            left = max(left, min(cx[i] - 1.5, right - 3.0))
            right = left + 3.0
        y0 = Y + half[nodes[i][0]]
        arrow(s, cx[i], y0, cx[i], top, color=INK if kind == "mail2" else MUTED, w=2, dash=kind == "note")
        if lab:
            text(s, cx[i] + 0.08, y0 + 0.06, 1.6, 0.28, [lab], size=10, color=ORANGE_D, font=BODY_B, space=0)
        if kind == "mail2":
            box(s, left, top, right - left, bh, [txt], fill=TEAL, line_color=None, size=11, color=WHITE,
                anchor=MSO_ANCHOR.MIDDLE, margin=0.14)
        elif kind == "note":
            box(s, left, top, right - left, bh, [txt], fill=WHITE, line_color=MUTED, size=11, color=MUTED,
                anchor=MSO_ANCHOR.MIDDLE, margin=0.14, dash=True)
        else:
            box(s, left, top, right - left, bh, [txt], fill=SOFT, line_color=MUTED, size=11,
                anchor=MSO_ANCHOR.MIDDLE, margin=0.14, dash=True)
    # legend and the facts that the chart cannot show
    text(s, 0.45, 5.25, 6.0, 0.3, [c["facts_h"]], size=12.5, color=MUTED, font=HEAD_N, space=0)
    lx = 12.9
    for label, fill, col, dash in ((c["legend"][1], SOFT, INK, True), (c["legend"][0], ORANGE, WHITE, False)):
        w = 0.3 + 0.075 * len(label)
        lx -= w
        box(s, lx, 5.24, w, 0.28, [label], fill=fill, line_color=MUTED if dash else None, size=9.5, color=col,
            font=BODY_B, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, margin=0.02, radius=0.5, dash=dash)
        lx -= 0.1
    facts = c["facts"]
    fw = (12.45 - 0.25 * (len(facts) - 1)) / len(facts)
    for i, f in enumerate(facts):
        x = 0.45 + i * (fw + 0.25)
        box(s, x, 5.6, fw, 1.25, [f], fill=SOFT_T, line_color=None, size=11.5, anchor=MSO_ANCHOR.MIDDLE,
            margin=0.18, radius=0.04)
        rect(s, x, 5.6, 0.07, 1.25, TEAL)
    notes(s, c["notes"])


def slide_deploy(d):
    c = d.c["deploy"]
    s = d.content("09", c["title"])
    y = 1.6
    for i, (head, body, col) in enumerate(c["pipe"]):
        box(s, 0.45, y, 5.3, 1.0, [f"**{head}**", body], fill=WHITE, line_color=col, size=12, space=2,
            line_w=1.5)
        rect(s, 0.45, y, 0.09, 1.0, col)
        if i < len(c["pipe"]) - 1:
            arrow(s, 3.1, y + 1.0, 3.1, y + 1.25, color=INK, w=2)
        y += 1.25
    text(s, 6.15, 1.5, 6.7, 0.4, [c["sec_h"]], size=16, color=INK, font=HEAD, space=0)
    gf = s.shapes.add_table(len(c["secrets"]) + 1, 3, Inches(6.15), Inches(1.95), Inches(6.75), Inches(3.6))
    tbl = gf.table
    for i, wv in enumerate((2.1, 2.45, 2.2)):
        tbl.columns[i].width = Inches(wv)
    style_table(tbl, [c["sec_head"]] + c["secrets"], sizes=(12, 11.5), first_col_bold=True)
    box(s, 6.15, 5.95, 6.75, 0.85, [c["tip"]], fill=SOFT_O, line_color=None, size=12, anchor=MSO_ANCHOR.MIDDLE)
    notes(s, c["notes"])


def slide_reqs(d):
    c = d.c["reqs"]
    s = d.content("10", c["title"], c["kicker"])
    gf = s.shapes.add_table(len(c["rows"]) + 1, 3, Inches(0.45), Inches(1.5), Inches(12.45), Inches(5.3))
    tbl = gf.table
    for i, wv in enumerate((2.35, 4.6, 5.5)):
        tbl.columns[i].width = Inches(wv)
    style_table(tbl, [c["head"]] + c["rows"], sizes=(13, 12.5), first_col_bold=True)
    notes(s, c["notes"])


def slide_quality(d):
    c = d.c["quality"]
    s = d.content("11", c["title"])
    for i, (num, label, col) in enumerate(c["tiles"]):
        x = 0.45 + i * 3.15
        rect(s, x, 1.55, 2.95, 1.75, DARK)
        rect(s, x, 1.55, 2.95, 0.07, col)
        text(s, x + 0.15, 1.65, 2.7, 0.95, [num], size=50, color=col, font=HEAD, space=0)
        text(s, x + 0.17, 2.55, 2.65, 0.7, [label], size=12, color="E6EAF0", space=0)
    text(s, 0.45, 3.55, 6.1, 0.4, [c["test_h"]], size=16, color=INK, font=HEAD, space=0)
    text(s, 0.45, 3.95, 6.1, 3.0, c["tests"], size=14, bullets=True, space=7)
    text(s, 6.8, 3.55, 6.1, 0.4, [c["rel_h"]], size=16, color=INK, font=HEAD, space=0)
    text(s, 6.8, 3.95, 6.1, 3.0, c["rel"], size=14, bullets=True, space=7, bullet_color=TEAL)
    notes(s, c["notes"])


def slide_hard(d):
    c = d.c["hard"]
    s = d.content("12", c["title"])
    for i, (head, problem, fix) in enumerate(c["cards"]):
        x = 0.45 + (i % 2) * 6.3
        y = 1.55 + (i // 2) * 2.7
        rect(s, x, y, 6.15, 2.5, SOFT)
        rect(s, x, y, 6.15, 0.07, [ORANGE, TEAL, BLUE, ORANGE_D][i])
        text(s, x + 0.2, y + 0.15, 5.8, 0.45, [head], size=18, color=INK, font=HEAD, space=0)
        text(s, x + 0.2, y + 0.65, 5.8, 1.8, [f"**{c['p']}** {problem}", f"**{c['f']}** {fix}"], size=14,
             space=8)
    notes(s, c["notes"])


def slide_tco(d):
    c = d.c["tco"]
    s = d.content("13", c["title"], c["kicker"])
    rows = c["rows"]                               # Supabase, Zapier, other infra, per month, per year
    gf = s.shapes.add_table(len(rows) + 1, 5, Inches(0.45), Inches(1.45), Inches(12.45), Inches(4.0))
    tbl = gf.table
    for i, wv in enumerate((1.5, 2.35, 2.35, 2.45, 3.8)):
        tbl.columns[i].width = Inches(wv)
    for i, hv in enumerate([0.62] + [0.8] * (len(rows) - 2) + [0.42, 0.55]):
        tbl.rows[i].height = Inches(hv)
    style_table(tbl, [c["head"]] + rows, sizes=(12.5, 11), first_col_bold=True, col_colors={4: MUTED})
    for ci in range(5):                            # scenario subtitles in the header: smaller and lighter
        for p in tbl.cell(0, ci).text_frame.paragraphs[1:]:
            for r in p.runs:
                r.font.size = Pt(10)
                r.font.name = BODY
                r.font.color.rgb = rgb("C9D1DC")
    month = len(rows) - 1                          # table row of the monthly totals (row 0 is the header)
    for ri in (month, month + 1):
        for ci in range(5):
            cell = tbl.cell(ri, ci)
            cell.fill.solid()
            cell.fill.fore_color.rgb = rgb(SOFT_O)
    for ci in (1, 2, 3):
        for p in tbl.cell(month, ci).text_frame.paragraphs:
            for r in p.runs:
                r.font.size = Pt(16)
                r.font.color.rgb = rgb(ORANGE_D)
    box(s, 0.45, 5.85, 6.7, 1.0, [c["assume"]], fill=SOFT, line_color=None, size=11.5, anchor=MSO_ANCHOR.MIDDLE,
        margin=0.18)
    box(s, 7.4, 5.85, 5.5, 1.0, [c["lever"]], fill=SOFT_T, line_color=None, size=11.5, anchor=MSO_ANCHOR.MIDDLE,
        margin=0.18)
    notes(s, c["notes"])


def slide_summary(d):
    c = d.c["summary"]
    s = d.new(dark=True)
    d.stripes(s, 9.4)
    text(s, 0.8, 0.7, 8, 0.9, [c["title"]], size=44, color=WHITE, font=HEAD, space=0)
    text(s, 0.82, 1.75, 8.2, 3.6, c["points"], size=17, color="E6EAF0", bullets=True, space=10,
         link_color=TEAL_B)
    rect(s, 0.82, 5.3, 8.0, 0.012, "3A4655")
    for i, item in enumerate(c["next"]):
        dark_link(s, 0.82, 5.42 + i * 0.36, 8.2, 0.36, item, size=15, color=TEAL_B, font=HEAD_N)
    s.shapes.add_picture(os.path.join(ASSETS, "logo-light-crop.png"), Inches(0.82), Inches(6.62),
                         height=Inches(0.4))
    notes(s, c["notes"])


# ---- appendix A: demo ----------------------------------------------------
def slide_demo_script(d):
    c = d.c["script"]
    s = d.content("A1", c["title"], c["kicker"])
    text(s, 0.45, 1.5, 4.1, 0.4, [c["before_h"]], size=16, color=INK, font=HEAD, space=0)
    text(s, 0.45, 1.92, 4.1, 4.9, c["before"], size=11.5, bullets=True, space=5)
    gf = s.shapes.add_table(len(c["steps"]) + 1, 4, Inches(4.75), Inches(1.5), Inches(8.15), Inches(4.6))
    tbl = gf.table
    for i, wv in enumerate((0.45, 3.4, 3.55, 0.75)):
        tbl.columns[i].width = Inches(wv)
    style_table(tbl, [c["head"]] + c["steps"], sizes=(12, 11), col_colors={3: MUTED})
    box(s, 4.75, 6.2, 8.15, 0.65, [c["fallback"]], fill=SOFT_O, line_color=None, size=11.5,
        anchor=MSO_ANCHOR.MIDDLE)
    notes(s, c["notes"])


def step_panel(d, s, x, y, w, step):
    c = d.c["demo"]
    yy = y
    for key, col in (("do", ORANGE), ("say", TEAL), ("behind", BLUE)):
        if not step.get(key):
            continue
        badge(s, x, yy, c[key], fill=col, size=10.5, h=0.28)
        tb = text(s, x, yy + 0.33, w, 1.5, step[key] if isinstance(step[key], list) else [step[key]],
                  size=12, space=3)
        lines = sum(max(1, len(re.sub(r"[*`\[\]]", "", t)) // int(w * 9.2) + 1)
                    for t in (step[key] if isinstance(step[key], list) else [step[key]]))
        h = 0.33 + lines * 0.24 + 0.22
        tb.height = Inches(h)
        yy += h + 0.05
    return yy


def panel_cols(d, s, step, y):
    c = d.c["demo"]
    cols = [k for k in ("do", "say", "behind") if step.get(k)]
    cw = (12.45 - 0.3 * (len(cols) - 1)) / len(cols)
    for i, key in enumerate(cols):
        x = 0.45 + i * (cw + 0.3)
        badge(s, x, y, c[key], fill=(ORANGE, TEAL, BLUE)[("do", "say", "behind").index(key)], size=10.5, h=0.28)
        text(s, x, y + 0.33, cw, 6.95 - y - 0.33, step[key] if isinstance(step[key], list) else [step[key]],
             size=12.5, space=3)


def slide_demo_step(d, tag, step, shot_dir):
    from PIL import Image
    c = d.c["demo"]
    s = d.content(tag, step["title"])
    imgs = step["img"]
    paths = [os.path.join(SHOTS, shot_dir if not n.startswith("evidence/") else "", n) for n in imgs]
    if len(imgs) == 1:
        iw, ih = Image.open(paths[0]).size
        cl, ct, cr, cb = step.get("crop") or (0, 0, 0, 0)
        if iw * (1 - cl - cr) / (ih * (1 - ct - cb)) > 2.6:
            # wide (cropped) screenshot: full width on top, notes in three columns below
            _, (px, py, pw, ph) = picture(s, paths[0], 0.45, 1.45, 12.45, 3.95, crop=step.get("crop"))
            panel_cols(d, s, step, py + ph + 0.3)
        else:
            picture(s, paths[0], 0.45, 1.45, 8.95, 5.45, crop=step.get("crop"), align="top")
            step_panel(d, s, 9.65, 1.5, 3.25, step)
    else:
        n = len(imgs)
        gap = 0.25
        w = (12.45 - gap * (n - 1)) / n
        bottom = 0
        for i, path in enumerate(paths):
            crop = step.get("crops", [None] * n)[i]
            _, (px, py, pw, ph) = picture(s, path, 0.45 + i * (w + gap), 1.42, w, 3.75, crop=crop)
            bottom = max(bottom, py + ph)
            if step.get("caps"):
                text(s, 0.45 + i * (w + gap), py + ph + 0.04, w, 0.3, [step["caps"][i]], size=10.5,
                     color=MUTED, align=PP_ALIGN.CENTER, space=0)
        panel_cols(d, s, step, bottom + 0.45)
    notes(s, step.get("notes") or "\n".join(
        f"{c[k]}: {re.sub(r'[*`]', '', step[k])}" for k in ("do", "say", "behind") if step.get(k)))


# ---- appendix B: links ---------------------------------------------------
def slide_links(d, tag, block):
    s = d.content(tag, block["title"], block.get("kicker"))
    cols = block["cols"]
    n = len(cols)
    w = (12.45 - 0.35 * (n - 1)) / n
    for i, (head, items) in enumerate(cols):
        x = 0.45 + i * (w + 0.35)
        text(s, x, 1.5, w, 0.4, [head], size=16, color=INK, font=HEAD, space=0)
        rect(s, x, 1.92, 0.6, 0.04, ORANGE)
        text(s, x, 2.05, w, 4.9, items, size=block.get("size", 11.5), bullets=True, space=4)
    lines = []
    for head, items in cols:
        lines.append(head)
        for it in items:
            plain = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", it).replace("`", "").replace("**", "")
            lines.append("- " + plain)
        lines.append("")
    notes(s, block.get("notes") or "\n".join(lines))


def build(lang):
    d = Deck(lang)
    c = d.c
    slide_title(d)
    slide_problem(d)
    slide_scope(d)
    slide_flow(d)
    slide_arch(d)
    slide_erd(d)
    slide_zaps(d)
    slide_mail_flow(d, "mail_workout", "07")
    slide_mail_flow(d, "mail_report", "08")
    slide_deploy(d)
    slide_reqs(d)
    slide_quality(d)
    slide_hard(d)
    slide_tco(d)
    slide_summary(d)
    # Appendix A
    a = c["appA"]
    d.section("A", a["title"], a["subtitle"], a["notes"])
    slide_demo_script(d)
    for i, step in enumerate(c["steps"], 2):
        slide_demo_step(d, f"A{i}", step, lang.lower())
    # Appendix B
    b = c["appB"]
    d.section("B", b["title"], b["subtitle"], b["notes"])
    for i, block in enumerate(c["links"], 1):
        slide_links(d, f"B{i}", block)
    cp = d.prs.core_properties
    cp.title = c["title"]["title"]
    cp.subject = c["title"]["kicker"].title()
    cp.keywords = "Logify, capstone, Supabase, Vercel, Zapier"
    cp.language = "en-US" if lang == "EN" else "lt-LT"
    cp.author = "Logify project"
    out = os.path.join(RESULTS, f"Logify_{lang}.pptx")
    d.save(out)
    print(lang, d.count, "slides ->", out)


if __name__ == "__main__":
    for lang in sys.argv[1:] or ["EN", "LT"]:
        build(lang)
