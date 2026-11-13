# DADU art drop folder

Put finished pictures here. Read `docs/dadu/ART_PIPELINE.md` for the full steps and the ChatGPT prompts.

- `props/<sprite_key>.png` and optional `<sprite_key>@on.png`, `@open.png` ...: objects and buildings
- `rooms/<file_name>.png`: side-view backgrounds
- `story/<art_file_name>.png`: story pages
- `characters/<key>/idle.png`, `talk.png`, `happy.png` ...: characters (`dadaji`, `chintu`, `buddy`, `chikki`, `gauri`, `nandu`, `mitthu`)

The exact names are in `docs/dadu/art-brief/*.csv`. After adding files run
`python tools/dadu/art_import.py manifest`.
