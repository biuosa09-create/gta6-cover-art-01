# Neon Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/biuosa09-create/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/biuosa09-create/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Entry for make.fun bounty [`gta6-cover-art-01`](https://make.fun/bounty/gta6-cover-art-01):
a web app that turns your photo and a caption into poster-style cover art —
the multi-panel look, bold outlined lettering, a sunset or neon colour grade —
and exports it as a PNG to share.

New to make.fun? Sign up with my referral link: https://make.fun/r/shw861zs (code `shw861zs`).

## How it works

1. **Photo** — add your own photo (file picker or drag it onto the cover), or use one of the two bundled samples. Up to six photos; click a thumbnail to put it in the selected panel.
2. **Layout** — Grid (one hero panel over two), Hero (one full-bleed photo), Duo (two side by side) or Triptych (three strips). Click a panel to select it, drag on the cover to crop it, scroll to zoom, or use the zoom slider.
3. **Caption** — title and subtitle, five title colours, title at the top or bottom.
4. **Colour grade** — Sunset Bay, Neon Nights, Pastel Day or Noir. The sun, skyline and palm silhouettes are drawn in code, so the art stays original.
5. **Export** — PNG in 1:1 (1080×1080), 4:5 (1080×1350) or 16:9 (1920×1080), all client-side.

Everything runs offline from static files: no network requests, no uploads —
photos never leave the machine. No Rockstar logo, artwork or font is used
anywhere; the lettering is system fonts and the decorations are canvas drawings.

## Try it

```sh
node serve.ts   # then open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/` to
the output directory and writes `dossier.json` with the vendored make.fun
library.

## License

MIT — see `LICENSE`. The two sample photos under `app/samples/` were made for
make.fun with an image model and are free to use.
