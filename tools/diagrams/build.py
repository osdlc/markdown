"""Writes the plan's diagrams to docs/diagrams/*.svg.

Run from the repo root: python3 tools/diagrams/build.py
Each SVG is standalone, with concrete colours and a dark-mode block. GitHub
shows SVGs through <img>, so the colours follow the viewer's OS colour
scheme, not the GitHub theme setting.
"""
import html
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "docs" / "diagrams"

W = 440                    # viewBox width; reads on a phone without zooming
CW, CH, GX, GY = 200, 46, 8, 8
X0 = 16

LIGHT = dict(bg="#fbfaf7", fg="#1d1d1b", mut="#5d5d58", band="#f0eee8", line="#d8d5cc", chip="#ffffff",
             osdlc="#2f855a", dev="#2b6cb0", ont="#6b46c1", sw="#c05621", ext="#8a8a84",
             bad="#c53030", badbg="#fde8e8", acc="#b8741a", accbg="#fde7c8")
DARK = dict(bg="#16161a", fg="#ececea", mut="#a3a39d", band="#222227", line="#3a3a40", chip="#2b2b31",
            osdlc="#68d391", dev="#63b3ed", ont="#b794f4", sw="#f6ad55", ext="#a0a09a",
            bad="#fc8181", badbg="#3b1d1d", acc="#f6ad55", accbg="#3d2f1c")


def rules(c):
    return f"""
.bg{{fill:{c['bg']}}} .band{{fill:{c['band']}}}
.rl{{font-size:15px;font-weight:650;fill:{c['fg']}}} .rs{{font-size:12px;fill:{c['mut']}}}
.lang{{font-size:10.5px;font-weight:700;letter-spacing:.06em;fill:{c['mut']}}}
.chip rect{{fill:{c['chip']};stroke-width:1.5}} .chip.later rect{{fill:none;stroke-dasharray:5 4}}
.cn{{font-size:13px;font-weight:650;fill:{c['fg']}}} .cs{{font-size:11px;fill:{c['mut']}}}
.r-osdlc rect{{stroke:{c['osdlc']}}} .r-osdlc .dot{{fill:{c['osdlc']}}}
.r-dev rect{{stroke:{c['dev']}}} .r-dev .dot{{fill:{c['dev']}}}
.r-ont rect{{stroke:{c['ont']}}} .r-ont .dot{{fill:{c['ont']}}}
.r-sw rect{{stroke:{c['sw']}}} .r-sw .dot{{fill:{c['sw']}}}
.r-ext rect{{stroke:{c['ext']}}} .r-ext .dot{{fill:{c['ext']}}}
.fb rect{{fill:{c['badbg']};stroke:{c['bad']}}} .fb text{{font-size:10.5px;font-weight:700;fill:{c['bad']}}}
.dup{{stroke:{c['bad']};stroke-width:1.6;stroke-dasharray:4 3}}
.edge{{fill:none;stroke:{c['mut']};stroke-width:1.4}} .ahp{{fill:{c['mut']}}}
.node rect{{fill:{c['chip']};stroke:{c['line']};stroke-width:1.4}} .node.first rect{{fill:{c['accbg']};stroke:{c['acc']}}}
.num{{fill:{c['fg']}}} .numt{{font-size:11px;font-weight:700;fill:{c['bg']}}} .nn{{font-size:11.5px;font-weight:650;fill:{c['fg']}}}
.lvl rect{{fill:{c['chip']};stroke:{c['line']}}} .prof rect{{fill:{c['accbg']};stroke:{c['acc']}}}
.tie{{stroke:{c['acc']};stroke-width:1.6;fill:none}}"""


def svg(body, height, label):
    style = rules(LIGHT) + "\n@media (prefers-color-scheme: dark) {" + rules(DARK) + "\n}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {height}" width="{W * 2}" '
            f'font-family="system-ui, -apple-system, Segoe UI, sans-serif" role="img" aria-label="{esc(label)}">'
            f'<style>{style}</style><rect class="bg" width="{W}" height="{height}"/>{body}</svg>\n')


def esc(s):
    return html.escape(s, quote=True)


ARROW = ('<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" '
         'orient="auto"><path d="M0,0L10,5L0,10z" class="ahp"/></marker></defs>')


def chip(x, y, name, sub, repo, later=False, faults=(), w=CW):
    cls = f"chip r-{repo}" + (" later" if later else "")
    out = [f'<g class="{cls}"><rect x="{x}" y="{y}" width="{w}" height="{CH}" rx="7"/>',
           f'<circle cx="{x + 12}" cy="{y + 16}" r="4.5" class="dot"/>',
           f'<text x="{x + 22}" y="{y + 20}" class="cn">{esc(name)}</text>',
           f'<text x="{x + 10}" y="{y + 37}" class="cs">{esc(sub)}</text></g>']
    for i, f in enumerate(faults):
        bx = x + w - 14 - i * 27
        out.append(f'<g class="fb"><rect x="{bx - 12}" y="{y - 9}" width="25" height="17" rx="8.5"/>'
                   f'<text x="{bx + 0.5}" y="{y + 3.5}" text-anchor="middle">{esc(f)}</text></g>')
    return "".join(out)


def grid(y, items):
    out = []
    for i, it in enumerate(items):
        r, c = divmod(i, 2)
        name, sub, repo, *rest = it
        later = "later" in rest
        faults = next((x for x in rest if isinstance(x, tuple)), ())
        out.append(chip(X0 + c * (CW + GX), y + r * (CH + GY + 6), name, sub, repo, later, faults))
    return "".join(out), ((len(items) + 1) // 2) * (CH + GY + 6)


KEY = [("osdlc", "osdlc"), ("dev", "dev"), ("ont", "rust-ontogen"), ("sw", "skillwright")]


def key(y):
    out, x = [f'<text class="cs" x="{X0}" y="{y + 4}">Repo:</text>'], X0 + 40
    for repo, name in KEY:
        out.append(f'<g class="chip r-{repo}"><circle cx="{x}" cy="{y}" r="4.5" class="dot"/></g>'
                   f'<text class="cs" x="{x + 8}" y="{y + 4}">{name}</text>')
        x += 22 + len(name) * 6.6
    return "".join(out)


def layers(rows, label):
    y, out = 26, [key(12)]
    for name, sub, ts, rs in rows:
        top, body, yy = y, [], y + 52
        for lang, items in (("TYPESCRIPT", ts), ("RUST", rs)):
            if not items:
                continue
            body.append(f'<text class="lang" x="{X0 + 2}" y="{yy + 4}">{lang}</text>')
            g, h = grid(yy + 16, items)
            body.append(g)
            yy += 16 + h
        h = yy - top + 2
        out.append(f'<rect class="band" x="6" y="{top}" width="{W - 12}" height="{h}" rx="10"/>')
        out.append(f'<text class="rl" x="{X0}" y="{top + 24}">{esc(name)}</text>'
                   f'<text class="rs" x="{X0}" y="{top + 39}">{esc(sub)}</text>')
        out.extend(body)
        y = top + h + 10
    return svg("".join(out), y, label)


def dag(steps, levels, first, label):
    nw, nh, gx, gy = 140, 54, 6, 46
    pos, y = {}, 14
    for lvl in levels:
        x = (W - (len(lvl) * nw + (len(lvl) - 1) * gx)) / 2
        for s in lvl:
            if s is not None:
                pos[s] = (x, y)
            x += nw + gx
        y += nh + gy
    out = [ARROW]
    for s, (_, _, deps) in steps.items():
        sx, sy = pos[s]
        for d in deps:
            dx, dy = pos[d]
            x1, y1, x2, y2 = dx + nw / 2, dy + nh, sx + nw / 2, sy
            my = (y1 + y2) / 2
            out.append(f'<path class="edge" d="M{x1},{y1} C{x1},{my} {x2},{my} {x2},{y2 - 6}" marker-end="url(#ah)"/>')
    for s, (t, sub, _) in steps.items():
        x, y_ = pos[s]
        cls = "node first" if s in first else "node"
        out.append(f'<g class="{cls}"><rect x="{x}" y="{y_}" width="{nw}" height="{nh}" rx="9"/>'
                   f'<circle cx="{x + 15}" cy="{y_ + 17}" r="10" class="num"/>'
                   f'<text x="{x + 15}" y="{y_ + 21}" text-anchor="middle" class="numt">{s}</text>'
                   f'<text x="{x + 30}" y="{y_ + 21}" class="nn">{esc(t)}</text>'
                   f'<text x="{x + 9}" y="{y_ + 41}" class="cs">{esc(sub)}</text></g>')
    return svg("".join(out), y - gy + 14, label)


FAST = {
    "A": ("Pick the name", "one answer: D2 + D7", []),
    "G": ("Folder records", "records own their files", []),
    "C": ("Evidence types", "findings and claims", []),
    "B": ("Publish 0.1.0", "osdlc PR 725", ["A", "G"]),
    "E": ("Project writes", "evidence as records", ["B", "C"]),
}
FAST_LEVELS = [["A", "G", "C"], [None, "B", None], [None, None, "E"]]

STEPS = {
    1: ("Decide the words", "D1 D2 D6 D7", []),
    4: ("markdown-link resolves links", "a TS LinkIndex; osdlc PR 651", []),
    2: ("Track every step", "one issue each, in this repo", [1]),
    3: ("Ship the spec", "rename if needed, publish; osdlc PR 725", [1]),
    11: ("Render, edit and site packages", "finish osdlc PRs 714, 719, 720", [1]),
    5: ("One TypeScript corpus model", "markdown-vault and vault-graph-core merged", [1, 4]),
    8: ("Profiles", "D4; model-schema moves to osdlc", [3]),
    9: ("markdown-store on shared parts", "writes the spec layout", [3]),
    6: ("Switch consumers", "vault-query, determined, graph views", [5]),
    7: ("Validator reads the model", "drops its own walk", [3, 5]),
    10: ("One query layer", "vault-query moves to osdlc; D5", [5]),
}

PRESENT = [
    ("Apps and tools", "who reads notes",
     [("sdlc", "planning corpus", "dev"), ("skillwright build", "skills → plugins", "sw"),
      ("harness-reference", "typed corpus", "sw")],
     [("determined", "notes app", "dev"), ("skillwright CLI", "renames", "sw")]),
    ("Render, edit, sites", "show notes to people",
     [("markdown-render", "Obsidian dialect → HTML", "dev"), ("markdown-editor", "CodeMirror live edit", "dev"),
      ("markdown-astro", "vault → Astro site", "dev"), ("markdown-ui", "Nuxt viewing chrome", "dev", ("F11",))], []),
    ("Query and store", "a db over notes",
     [("markdown-vault-query", "Obsidian Bases engine", "dev", ("F9",)),
      ("markdown-db loader", "planned: loadCorpus", "osdlc", "later", ("F9",))],
     [("markdown-store", "typed CRUD, lossless", "ont", ("F6", "F7")), ("ontogen", "Rust structs → notes", "ont")]),
    ("Types", "what a record must hold",
     [("model-schema", "packs: YAML → JSON Schema", "dev", ("F5",)), ("pack-intent, -sdlc", "sdlc's 14 kinds", "dev", ("F5",)),
      ("markdown-db", "validator, osdlc PR 725", "osdlc", ("F5", "F8", "F10"))], []),
    ("Corpus model", "every note, link, backlink",
     [("markdown-vault", "scan + resolve + backlinks", "dev", ("F1", "F4")),
      ("vault-graph-core", "resolve + nodes/edges", "dev", ("F1", "F11"))],
     [("markdown-corpus", "graph, backlinks, refresh", "osdlc", ("F4", "F12")),
      ("markdown-relink", "move notes, fix links", "osdlc")]),
    ("Note parts", "one note's pieces",
     [("markdown-link", "parse; no resolver", "osdlc", ("F2", "F3")), ("frontmatter-lossless", "split, rewrite", "osdlc"),
      ("markdown-contract", "one doc's structure", "osdlc"), ("markdown-tags", "#tags; osdlc PR 714", "dev"),
      ("gfm-table", "pipe tables", "osdlc"), ("yaml-splice", "edit YAML in place", "osdlc")],
     [("markdown-link", "parse + LinkIndex", "osdlc"), ("frontmatter-lossless", "twin", "osdlc"),
      ("markdown-contract", "twin", "osdlc"), ("markdown-tags", "twin", "dev"),
      ("gfm-pipe-table", "twin", "osdlc"), ("yaml-splice", "twin + wasm", "osdlc")]),
    ("Files", "walk, read, write",
     [("etag-write", "atomic writes", "osdlc"), ("path-guard", "safe paths", "osdlc")],
     [("markdown-vault-fs", "walk, exclusions", "osdlc"), ("vfs-walk", "walk a folder", "osdlc"),
      ("vfs-seam", "file system seam", "osdlc"), ("etag-write", "twin", "osdlc")]),
]

TARGET = [
    ("Apps and tools", "read only through osdlc packages",
     [("sdlc", "types from profiles", "dev"), ("skillwright, harness-ref", "spec corpora", "sw")],
     [("determined", "corpus model", "dev"), ("skillwright CLI", "corpus model", "sw")]),
    ("Render, edit, sites", "all in osdlc",
     [("markdown-render", "", "osdlc"), ("markdown-editor", "", "osdlc"),
      ("markdown-astro", "", "osdlc"), ("markdown-ui", "", "osdlc")], []),
    ("Query: the db layer (D5)", "one read layer over the model",
     [("query layer", "Bases + loader, one model", "osdlc")],
     [("markdown-store", "writes the spec layout", "ont")]),
    ("Spec and profiles", "one spec, one type format",
     [("spec (name: D2)", "levels 0–2, shared cases", "osdlc"), ("profiles (D4)", "evidence, sdlc, ...", "osdlc"),
      ("spec validator", "levels 1–2, reads model", "osdlc")],
     [("spec validator", "later, same cases", "osdlc", "later")]),
    ("Corpus model", "one per language, one family",
     [("corpus model (D3)", "vault + graph merged", "osdlc")],
     [("markdown-corpus", "twin", "osdlc"), ("markdown-relink", "", "osdlc")]),
    ("Note parts", "twins, one resolver rule",
     [("markdown-link", "+ LinkIndex, all links", "osdlc"), ("other parts", "unchanged twins", "osdlc")],
     [("markdown-link", "LinkIndex, twin", "osdlc"), ("other parts", "unchanged twins", "osdlc")]),
    ("Files", "unchanged", [("etag-write, path-guard", "", "osdlc")], [("vault-fs, walk, seam", "", "osdlc")]),
]


def steps_list(steps, order, first, label):
    out, y = [], 10
    for s in order:
        t, sub, deps = steps[s]
        cls = "node first" if s in first else "node"
        out.append(f'<g class="{cls}"><rect x="{X0}" y="{y}" width="{W - 2 * X0}" height="46" rx="9"/>'
                   f'<circle cx="{X0 + 18}" cy="{y + 23}" r="11" class="num"/>'
                   f'<text x="{X0 + 18}" y="{y + 27}" text-anchor="middle" class="numt">{s}</text>'
                   f'<text x="{X0 + 38}" y="{y + 20}" class="nn">{esc(t)}</text>'
                   f'<text x="{X0 + 38}" y="{y + 36}" class="cs">{esc(sub)}</text>')
        need = "start now" if not deps else "after " + ", ".join(str(d) for d in deps)
        out.append(f'<text x="{W - X0 - 12}" y="{y + 27}" text-anchor="end" class="cs">{need}</text></g>')
        y += 54
    return svg("".join(out), y + 4, label)


def resolvers():
    rows = [("markdown-vault", "own shortest-path rule", "dev"),
            ("vault-graph-core", "port of the Rust LinkIndex", "dev"),
            ("markdown-db validator", "own walk and link check", "osdlc"),
            ("markdown-store", "own [[id]] wikilink code", "ont")]
    out = [f'<text class="rl" x="{X0}" y="26">Who decides what a link points to</text>']
    y = 44
    for n, s, r in rows:
        out.append(chip(X0, y, n, s, r, w=250))
        out.append(f'<line class="dup" x1="{X0 + 252}" y1="{y + 23}" x2="300" y2="{y + 23}"/>')
        y += 58
    mid = 44 + (len(rows) * 58 - 12) / 2
    out.append(f'<line class="dup" x1="300" y1="67" x2="300" y2="{44 + 3 * 58 + 23}"/>')
    out.append(f'<g class="fb"><rect x="308" y="{mid - 34}" width="118" height="68" rx="10"/>'
               f'<text x="367" y="{mid - 12}" text-anchor="middle">4 rules for</text>'
               f'<text x="367" y="{mid + 6}" text-anchor="middle">one question</text>'
               f'<text x="367" y="{mid + 24}" text-anchor="middle">F1 F2 F7 F8</text></g>')
    return svg("".join(out), y + 4, "Four places resolve links")


def levels_profiles():
    out = [f'<text class="rl" x="{X0}" y="26">Levels and profiles: two separate axes</text>',
           f'<text class="rs" x="{X0}" y="44">Levels: how much a corpus declares. Profiles: whose types it uses.</text>']
    lv = [("2 · Typed", "every type has a JSON Schema"),
          ("1 · Records", "a root file, type folders, ids"),
          ("0 · Linked notes", "declares nothing; any vault")]
    y = 62
    for t, s in lv:
        out.append(f'<g class="lvl"><rect x="{X0}" y="{y}" width="230" height="50" rx="8"/></g>'
                   f'<text class="cn" x="{X0 + 12}" y="{y + 21}">{esc(t)}</text>'
                   f'<text class="cs" x="{X0 + 12}" y="{y + 38}">{esc(s)}</text>')
        y += 60
    py = 62
    for t, s in [("evidence profile", "sources, findings, claims"), ("sdlc profile", "today's sdlc kinds"),
                 ("your profile", "any shared set of types")]:
        out.append(f'<g class="prof"><rect x="276" y="{py}" width="150" height="50" rx="8"/></g>'
                   f'<text class="cn" x="288" y="{py + 21}">{esc(t)}</text>'
                   f'<text class="cs" x="288" y="{py + 38}">{esc(s)}</text>')
        out.append(f'<path class="tie" d="M276,{py + 25} C262,{py + 25} 262,87 {X0 + 231},87"/>')
        py += 60
    out.append(f'<text class="cs" x="{X0}" y="{y + 10}">A corpus can use several profiles, next to its own types.</text>')
    return svg("".join(out), y + 22, "Levels 0 to 2, and profiles that supply level-2 types")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        "fast-path.svg": dag(FAST, FAST_LEVELS, ("A", "G", "C"), "Fast path to unlock the evidence project"),
        "present.svg": layers(PRESENT, "Present state by layer"),
        "resolvers.svg": resolvers(),
        "levels-profiles.svg": levels_profiles(),
        "target.svg": layers(TARGET, "Target state by layer"),
        "migration.svg": steps_list(STEPS, [1, 4, 2, 3, 11, 5, 8, 9, 6, 7, 10], (1, 4), "Migration steps and what each needs"),
    }
    for name, text in files.items():
        (OUT / name).write_text(text)
        print(OUT / name)


if __name__ == "__main__":
    main()
