"""Writes the architecture page's diagrams to docs/diagrams/architecture-*.svg.

Run from the repo root: python3 tools/diagrams/architecture.py
Same look as build.py (the plan's diagrams). Each SVG is standalone, with
concrete colours and a dark-mode block that follows the viewer's OS setting.
"""
import html
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "diagrams"

W = 440                    # viewBox width; reads on a phone without zooming
CW, CH, GX = 200, 46, 8
X0 = 16

LIGHT = dict(bg="#fbfaf7", fg="#1d1d1b", mut="#5d5d58", band="#f0eee8", line="#d8d5cc", chip="#ffffff",
             osdlc="#2f855a", dev="#2b6cb0", ont="#6b46c1", sw="#c05621", ext="#8a8a84", acc="#b8741a", accbg="#fde7c8")
DARK = dict(bg="#16161a", fg="#ececea", mut="#a3a39d", band="#222227", line="#3a3a40", chip="#2b2b31",
            osdlc="#68d391", dev="#63b3ed", ont="#b794f4", sw="#f6ad55", ext="#a0a09a", acc="#f6ad55", accbg="#3d2f1c")


def rules(c):
    return f"""
.bg{{fill:{c['bg']}}} .band{{fill:{c['band']}}}
.rl{{font-size:15px;font-weight:650;fill:{c['fg']}}} .rs{{font-size:12px;fill:{c['mut']}}}
.num{{font-size:12px;font-weight:700;fill:{c['mut']}}}
.lang{{font-size:10.5px;font-weight:700;letter-spacing:.06em;fill:{c['mut']}}}
.chip rect{{fill:{c['chip']};stroke-width:1.5}} .chip.later rect{{fill:none;stroke-dasharray:5 4}}
.cn{{font-size:13px;font-weight:650;fill:{c['fg']}}} .cs{{font-size:11px;fill:{c['mut']}}}
.r-osdlc rect{{stroke:{c['osdlc']}}} .r-osdlc .dot{{fill:{c['osdlc']}}}
.r-dev rect{{stroke:{c['dev']}}} .r-dev .dot{{fill:{c['dev']}}}
.r-ont rect{{stroke:{c['ont']}}} .r-ont .dot{{fill:{c['ont']}}}
.r-sw rect{{stroke:{c['sw']}}} .r-sw .dot{{fill:{c['sw']}}}
.r-ext rect{{stroke:{c['ext']}}} .r-ext .dot{{fill:{c['ext']}}}
.box rect{{fill:{c['chip']};stroke:{c['line']};stroke-width:1.4}} .box.opt rect{{stroke-dasharray:5 4}}
.prof rect{{fill:{c['accbg']};stroke:{c['acc']};stroke-width:1.4}}
.code rect{{fill:{c['chip']};stroke:{c['line']}}} .code text{{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;fill:{c['fg']}}}
.edge{{fill:none;stroke:{c['mut']};stroke-width:1.4}} .ahp{{fill:{c['mut']}}}"""


def svg(body, height, label):
    style = rules(LIGHT) + "\n@media (prefers-color-scheme: dark) {" + rules(DARK) + "\n}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" width="{W * 2}" '
            f'font-family="system-ui, -apple-system, Segoe UI, sans-serif" role="img" aria-label="{esc(label)}">'
            f'<style>{style}</style><rect class="bg" width="{W}" height="{height}"/>{body}</svg>\n')


def esc(s):
    return html.escape(s, quote=True)


ARROW = ('<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
         'orient="auto"><path d="M0,0L10,5L0,10z" class="ahp"/></marker></defs>')


def chip(x, y, name, sub, repo, later=False, w=CW):
    cls = f"chip r-{repo}" + (" later" if later else "")
    return (f'<g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="{CH}" rx="7"/>'
            f'<circle cx="{x + 12}" cy="{y + 16}" r="4.5" class="dot"/>'
            f'<text x="{x + 22}" y="{y + 20}" class="cn">{esc(name)}</text>'
            f'<text x="{x + 10}" y="{y + 37}" class="cs">{esc(sub)}</text></g>')


def box(x, y, w, h, title, sub, cls="box"):
    return (f'<g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8"/></g>'
            f'<text class="cn" x="{x + 12}" y="{y + 21}">{esc(title)}</text>'
            f'<text class="cs" x="{x + 12}" y="{y + 38}">{esc(sub)}</text>')


def arrow(x1, y1, x2, y2):
    return f'<path class="edge" d="M{x1},{y1} L{x2},{y2}" marker-end="url(#ah)"/>'


# The target, top to bottom. Each item: name, what it does, repo, then "later" if not built yet.
LAYERS = [
  ("8", "Apps", "use the layers below; keep their own rules",
   [("sdlc", "planning corpus", "dev"), ("skillwright", "skills, harness-reference", "sw"),
    ("evidence project", "records + files", "ext")],
   [("determined", "notes app", "dev"), ("markdown-store", "typed records from Rust", "ont")]),
  ("7", "Render, edit, sites", "show notes to people",
   [("markdown-render", "notes → HTML", "osdlc"), ("markdown-editor", "live editor", "osdlc"),
    ("markdown-ui", "viewing chrome", "osdlc"), ("markdown-astro", "notes → site", "osdlc")], []),
  ("6", "Query (later)", "read a corpus as a database",
   [("query layer", "Bases queries, loader, builds", "osdlc", "later")], []),
  ("5", "Profiles (proposal)", "shared sets of types",
   [("evidence profile", "sources, findings, claims", "osdlc", "later"),
    ("acceptance testing", "builds on evidence", "osdlc", "later")], []),
  ("4", "corpus-schema", "the spec and its validator",
   [("@osdlc/corpus-schema", "levels 0–2, validate --fix", "osdlc")],
   [("Rust validator", "later, same tests", "osdlc", "later")]),
  ("3", "Corpus model", "every note and link, kept fresh",
   [("markdown-corpus", "from vault + graph", "osdlc", "later")],
   [("markdown-corpus", "the twin", "osdlc"), ("markdown-relink", "move notes, fix links", "osdlc")]),
  ("2", "Note parts", "one note's pieces; one link resolver",
   [("markdown-link", "+ LinkIndex", "osdlc"), ("frontmatter, yaml, tags", "lossless edits", "osdlc")],
   [("markdown-link", "LinkIndex", "osdlc"), ("frontmatter, yaml, tags", "twins", "osdlc")]),
  ("1", "Files", "walk, read, write safely",
   [("etag-write, path-guard", "safe writes and paths", "osdlc")],
   [("vault-fs, vfs-walk, seam", "walk any file system", "osdlc")]),
]


def layers():
    out, y = [], 10
    for num, name, sub, ts, rs in LAYERS:
        top, body, yy = y, [], y + 52
        for lang, items in (("TYPESCRIPT", ts), ("RUST", rs)):
            if not items:
                continue
            body.append(f'<text class="lang" x="{X0 + 2}" y="{yy + 4}">{lang}</text>')
            for i, (n, s, repo, *rest) in enumerate(items):
                r, c = divmod(i, 2)
                body.append(chip(X0 + c * (CW + GX), yy + 16 + r * (CH + 14), n, s, repo, "later" in rest))
            yy += 16 + ((len(items) + 1) // 2) * (CH + 14)
        h = yy - top + 2
        out.append(f'<rect class="band" x="6" y="{top}" width="{W - 12}" height="{h}" rx="10"/>')
        out.append(f'<text class="num" x="{W - 26}" y="{top + 24}" text-anchor="end">{num}</text>'
                   f'<text class="rl" x="{X0}" y="{top + 24}">{esc(name)}</text>'
                   f'<text class="rs" x="{X0}" y="{top + 39}">{esc(sub)}</text>')
        out.extend(body)
        y = top + h + 8
    out.append(f'<text class="cs" x="{X0}" y="{y + 10}">Each layer uses only the layers below it. Dashed: not built yet.</text>')
    return svg("".join(out), y + 22, "The layers of the markdown ecosystem, top to bottom")


def settings():
    out = [ARROW, f'<text class="rl" x="{X0}" y="26">Three settings on a corpus</text>',
           f'<text class="rs" x="{X0}" y="44">Each answers a different question. Proposal.</text>']
    code = ["# corpus-schema.md", "level: 2", "dialect: obsidian", "profiles: [acceptance-testing@0]"]
    out.append(f'<g class="code"><rect x="{X0}" y="58" width="{W - 2 * X0}" height="{18 * len(code) + 16}" rx="8"/>')
    out.extend(f'<text x="{X0 + 14}" y="{80 + 18 * i}">{esc(line)}</text>' for i, line in enumerate(code))
    out.append('</g>')
    y = 58 + 18 * len(code) + 34

    out.append(f'<text class="rl" x="{X0}" y="{y}">Level</text><text class="rs" x="{X0 + 52}" y="{y}">how much it declares</text>')
    y += 12
    for i, (t, s) in enumerate([("0", "nothing"), ("1", "root file, ids"), ("2", "a schema per type")]):
        x = X0 + i * 138
        out.append(box(x, y, 130, 48, f"Level {t}", s))
        if i:
            out.append(arrow(x - 7, y + 24, x - 1, y + 24))
    y += 76

    out.append(f'<text class="rl" x="{X0}" y="{y}">Dialect</text><text class="rs" x="{X0 + 64}" y="{y}">syntax beyond the baseline</text>')
    y += 12
    out.append(box(X0, y, 200, 48, "baseline", "every tool supports it"))
    out.append(box(X0 + 208, y, 200, 48, "obsidian", "wikilinks, embeds; optional", "box opt"))
    y += 76

    out.append(f'<text class="rl" x="{X0}" y="{y}">Profiles</text><text class="rs" x="{X0 + 70}" y="{y}">whose types it uses</text>')
    y += 12
    out.append(box(X0, y, 190, 48, "evidence", "sources, findings, claims", "prof"))
    out.append(box(X0 + 218, y, 190, 48, "acceptance testing", "+ build, commit, environment", "prof"))
    out.append(arrow(X0 + 216, y + 24, X0 + 192, y + 24))
    out.append(f'<text class="cs" x="{X0}" y="{y + 66}">acceptance testing builds on evidence:</text>'
               f'<text class="cs" x="{X0}" y="{y + 82}">it adds, it never loosens.</text>')
    y += 82
    out.append(box(X0 + 218, y, 190, 48, "your corpus", "its own types + the profile"))
    out.append(arrow(X0 + 313, y - 2, X0 + 313, y - 32))
    out.append(f'<text class="cs" x="{X0}" y="{y + 30}">So a record valid under acceptance</text>'
               f'<text class="cs" x="{X0}" y="{y + 46}">testing is also valid under evidence.</text>')
    y += 62
    return svg("".join(out), y, "Level, dialect and profiles, with a root file example")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in {"architecture-layers.svg": layers(), "architecture-settings.svg": settings()}.items():
        (OUT / name).write_text(text)
        print(OUT / name)


if __name__ == "__main__":
    main()
