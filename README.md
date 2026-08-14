# dsh-balance

A [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) **web profile** plugin that puts a DeepSeek API balance button in the sidebar foot, right above the Settings entry.

- One click → popover with **total / granted / topped-up balance** per currency, with refresh and close actions
- Optional inline display: show the balance on the button itself without opening the popover
- Optional auto refresh: re-query the balance in the background every **N conversation turns**
- Full settings page (**余额 / Balance**) in the Settings panel: enable/disable the plugin, inline display, auto-refresh interval
- Cosmetic touch: shrinks the built-in *Cordis Plugin* badge at the sidebar foot to a compact round icon so both buttons share the row cleanly
- Clicking anywhere outside the popover closes it

The API key is never embedded: it resolves per request from the DSH credential seam (`~/.dsh/.credentials.yaml` → `DEEPSEEK_API_KEY`, or the ambient environment variable).

## Install

```bash
# 1. install the package into your web profile (pnpm under the hood)
dsh plugin --profile web add github:<your-name>/deepseek-harness-blance

# 2. register the bundle patch layer: edit ~/.dsh/profiles/web/package.json
#    and add "dsh-balance" to the "dsh.profile.bundles" array, e.g.
#    "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-balance"]

# 3. restart the web GUI
dsh web
```

Alternative to step 2: add the row by hand to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-balance
      name: dsh-balance
```

> Requires the `DEEPSEEK_API_KEY` credential (set it in `~/.dsh/.credentials.yaml`
> or through the dsh Models page). The plugin itself ships no key.

## Settings

Settings persist in `~/.dsh/settings.yaml` under the `dsh-balance:` section (live-applied; edits there are picked up within ~10 s):

| Key | Default | Meaning |
| --- | --- | --- |
| `enabled` | `true` | Show the sidebar button and run auto refresh. Disabling hides the button without deleting anything. |
| `showInline` | `false` | Show the balance in the button label (wide sidebar only; in the rail, hover the icon). |
| `autoRefreshEvery` | `0` | Refresh in the background every N closed agent turns; `0` disables. |

## Requirements

- dsh `0.1.0-rc.x` web profile with the standard client modules (sidebar, settings, slots)
- Windows host for the balance route (it shells out to `curl.exe`); network access to `https://api.deepseek.com`

## Development

No build step: `lib/client.js` is a hand-written, self-contained `__ModuleLoader__` bundle (React comes from the shell's shared module registry), and `lib/index.js` is plain ESM.

```bash
npm run check   # node --check both files
```

Layout:

```
lib/index.js        host half: /deepseek-balance, /state, /config routes +
                    settings namespace + agent turn counter
lib/client.js       client bundle: sidebar button + popover + settings page
cordis.patch.yml    bundle patch: inserts the dual-face row
dsh.plugin.json     plugin inventory metadata
```

## Known limitations

- The badge-shrinking CSS targets the shipped `Nqubda_*` class names; a future dsh upgrade that renames them silently restores the stock badge (the balance button is unaffected).
- The client syncs settings by polling `/deepseek-balance/state` every 10 s.

## Uninstall

```bash
dsh plugin --profile web remove dsh-balance
# and drop "dsh-balance" from "dsh.profile.bundles" (or remove the row from cordis.patch.yml)
```

## License

MIT
