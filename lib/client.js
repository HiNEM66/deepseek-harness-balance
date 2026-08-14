// dsh-balance client half: sidebar-foot balance button + popover + settings page.
// Served as a built client bundle at /plugins/dsh-balance/client.js and
// registered into the shell kernel's ModuleLoader; react comes from the
// shell's shared module registry (`require('react')`).
//
// Settings live host-side (settings.yaml, namespace `dsh-balance`) and are
// synced by polling GET /deepseek-balance/state every 10s. Writes go through
// POST /deepseek-balance/config.

window.__ModuleLoader__.load({
  id: 'dsh-balance',
  factory: (require) => {
    'use strict'
    const React = require('react')

    const STYLE_TAG_ID = 'dsh-balance/style.css'
    if (typeof document !== 'undefined' && document.querySelector('style[data-plugin-css=' + JSON.stringify(STYLE_TAG_ID) + ']') === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-balance'
      tag.setAttribute('data-plugin-css', STYLE_TAG_ID)
      tag.textContent = [
        // 官方 Cordis 徽章压缩为纯图标小圆钮
        '.Nqubda_layer { width: 36px !important; height: 36px !important; margin: 0 !important; flex: none !important; }',
        '.Nqubda_badge { width: 36px !important; height: 36px !important; border-radius: 50% !important; justify-content: center !important; padding: 0 !important; gap: 0 !important; }',
        '.Nqubda_badgeLabel, .Nqubda_badgeCount { display: none !important; }',
        '.hHd-Xa_footerActions { flex-wrap: wrap !important; flex-direction: row-reverse !important; }',
        // 余额按钮：复刻设置触发器的几何（左侧 -4px 出血 + 10px 内边距）
        '.dsb-wrap { position: relative; display: flex; flex: 1 1 auto; min-width: 0; }',
        '.dsb-wrap.dsb-rail { flex: 0 0 auto; width: auto; }',
        '.dsb-btn { box-sizing: border-box; cursor: pointer; width: calc(100% + 4px); height: 34px; color: var(--dsw-alias-label-primary); background: transparent; border: none; border-radius: 12px; flex: none; display: flex; align-items: center; gap: 8px; margin: 4px 0 4px -4px; padding: 6px 2px 6px 10px; font-family: inherit; font-size: 14px; line-height: 22px; overflow: hidden; }',
        '.dsb-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
        '.dsb-wrap.dsb-rail .dsb-btn { border-radius: 50%; justify-content: center; gap: 0; width: 36px; height: 36px; margin: 4px 0; padding: 0; }',
        // 弹层
        '.dsb-panel { position: absolute; z-index: 1000; bottom: calc(100% + 8px); left: 0; right: 0; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; box-shadow: var(--dsw-shadow-lv3); padding: 10px 12px; font-size: 13px; line-height: 18px; }',
        '.dsb-wrap.dsb-rail .dsb-panel { left: calc(100% + 8px); right: auto; bottom: 0; width: 280px; }',
        '.dsb-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; font-weight: 600; white-space: nowrap; }',
        '.dsb-block { padding: 4px 0; }',
        '.dsb-block + .dsb-block { border-top: 1px solid var(--dsw-alias-border-l2); margin-top: 4px; padding-top: 8px; }',
        '.dsb-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 3px 0; }',
        '.dsb-row > span { white-space: nowrap; }',
        '.dsb-total { font-weight: 600; font-size: 15px; }',
        '.dsb-muted { opacity: 0.65; font-size: 12px; }',
        '.dsb-err { color: #e5484d; }',
        '.dsb-x, .dsb-re { cursor: pointer; border: none; background: transparent; color: inherit; border-radius: 6px; padding: 2px 6px; font-size: 12px; white-space: nowrap; }',
        '.dsb-x:hover, .dsb-re:hover { background: var(--dsw-alias-interactive-bg-hover); }',
        '.dsb-label { white-space: nowrap; overflow: hidden; }',
        // 设置栏目
        '.dsb-sec { display: flex; flex-direction: column; gap: 14px; max-width: 480px; }',
        '.dsb-sec-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }',
        '.dsb-sec-row > span { font-size: 14px; }',
        '.dsb-sec-hint { font-size: 12px; opacity: 0.65; margin-top: 2px; }',
        '.dsb-sec input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--dsw-alias-accent, #4d6bfe); }',
        '.dsb-sec input[type="number"] { box-sizing: border-box; width: 88px; padding: 4px 8px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); font-size: 13px; }',
        '.dsb-sec-btn { cursor: pointer; border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-button-elevated-fill, transparent); color: var(--dsw-alias-label-primary); border-radius: 8px; padding: 4px 12px; font-size: 13px; }',
        '.dsb-sec-btn:hover { background: var(--dsw-alias-interactive-bg-hover); }',
      ].join('\n')
      document.head.appendChild(tag)
    }

    const DEFAULT_SETTINGS = { enabled: true, showInline: false, autoRefreshEvery: 0 }
    const POLL_MS = 10000
    const FETCH_TIMEOUT_MS = 45000

    function createStore(initial) {
      let state = initial
      const listeners = new Set()
      return {
        get: () => state,
        set: (next) => { state = next; listeners.forEach((l) => l()) },
        subscribe: (listener) => { listeners.add(listener); return () => { listeners.delete(listener) } },
      }
    }

    function useStore(store) {
      const [snapshot, setSnapshot] = React.useState(store.get)
      React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), [store])
      return snapshot
    }

    function formatTotal(result) {
      if (result && result.ok && Array.isArray(result.infos) && result.infos.length > 0) {
        const b = result.infos[0]
        return b.total + (b.currency ? ' ' + b.currency : '')
      }
      return null
    }

    async function fetchJson(url, options) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
      const timer = controller ? setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS) : null
      try {
        const resp = await fetch(url, options
          ? { ...options, signal: controller ? controller.signal : undefined }
          : { signal: controller ? controller.signal : undefined })
        if (timer !== null) clearTimeout(timer)
        const data = await resp.json().catch(() => ({}))
        return { status: resp.status, data }
      } finally {
        if (timer !== null) clearTimeout(timer)
      }
    }

    function CoinIcon() {
      return React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none' },
        React.createElement('circle', { cx: 8, cy: 8, r: 6.5, stroke: 'currentColor', strokeWidth: 1.4 }),
        React.createElement('path', {
          d: 'M8 3.9 V12.1 M5.5 6.6 L8 9 L10.5 6.6 M5.2 9.7 H10.8 M5.2 11.1 H10.8',
          stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round',
        }),
      )
    }

    function makePanel(store, refresh, close) {
      function Panel() {
        const state = useStore(store)
        let body
        if (state.phase === 'loading') {
          body = React.createElement('div', { className: 'dsb-muted' }, '查询中…')
        } else if (state.result && state.result.ok) {
          const infos = Array.isArray(state.result.infos) ? state.result.infos : []
          const blocks = infos.map((b, i) =>
            React.createElement('div', { key: 'b' + i, className: 'dsb-block' },
              React.createElement('div', { className: 'dsb-row' },
                React.createElement('span', { className: 'dsb-muted' }, '总余额'),
                React.createElement('span', { className: 'dsb-total' }, b.total + (b.currency ? ' ' + b.currency : '')),
              ),
              React.createElement('div', { className: 'dsb-row dsb-muted' },
                React.createElement('span', null, '赠送'),
                React.createElement('span', null, b.granted),
              ),
              React.createElement('div', { className: 'dsb-row dsb-muted' },
                React.createElement('span', null, '充值'),
                React.createElement('span', null, b.toppedUp),
              ),
            ),
          )
          const note = state.result.isAvailable ? null :
            React.createElement('div', { className: 'dsb-err' }, '账户余额当前不可用')
          body = React.createElement('div', null, blocks, note)
        } else if (state.result) {
          body = React.createElement('div', { className: 'dsb-err' }, String(state.result.error || '查询失败'))
        } else {
          body = React.createElement('div', { className: 'dsb-muted' }, '暂无数据')
        }
        return React.createElement('div', { className: 'dsb-panel', role: 'dialog' },
          React.createElement('div', { className: 'dsb-head' },
            React.createElement('span', null, 'DeepSeek 余额'),
            React.createElement('span', null,
              React.createElement('button', { type: 'button', className: 'dsb-re', title: '刷新', onClick: () => refresh(true) }, '刷新'),
              React.createElement('button', { type: 'button', className: 'dsb-x', title: '关闭', onClick: () => close() }, '✕'),
            ),
          ),
          body,
        )
      }
      return Panel
    }

    function makeAction(store, refresh, close) {
      function Action(props) {
        const state = useStore(store)
        if (!state.settings.enabled) return null
        const open = state.open
        const wrapRef = React.useRef(null)
        React.useEffect(() => {
          if (!open) return undefined
          function onDown(ev) {
            if (wrapRef.current !== null && !wrapRef.current.contains(ev.target)) {
              close()
            }
          }
          document.addEventListener('mousedown', onDown)
          return () => document.removeEventListener('mousedown', onDown)
        }, [open])
        const total = formatTotal(state.result)
        const labelText = state.settings.showInline && total !== null ? '余额 ' + total : '余额'
        const titleText = total !== null ? 'DeepSeek 余额 ' + total : '查询 DeepSeek API 余额'
        return React.createElement('div', { className: 'dsb-wrap' + (props.wide ? '' : ' dsb-rail'), ref: wrapRef },
          React.createElement('button', {
            type: 'button',
            className: 'dsb-btn',
            title: titleText,
            'aria-haspopup': 'dialog',
            'aria-expanded': open ? 'true' : 'false',
            onClick: () => {
              if (open) {
                close()
              } else {
                refresh(true)
              }
            },
          },
            React.createElement(CoinIcon, null),
            props.wide ? React.createElement('span', { className: 'dsb-label' }, labelText) : null,
          ),
          open ? React.createElement(makePanel(store, refresh, close), null) : null,
        )
      }
      return Action
    }

    function makeSection(store, refresh) {
      function Section() {
        const state = useStore(store)
        const s = state.settings
        const [saving, setSaving] = React.useState(false)
        const [error, setError] = React.useState('')
        const [x, setX] = React.useState(String(s.autoRefreshEvery))
        React.useEffect(() => { setX(String(s.autoRefreshEvery)) }, [s.autoRefreshEvery])

        async function applyPatch(patch) {
          setSaving(true)
          setError('')
          try {
            const { status, data } = await fetchJson('/deepseek-balance/config', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(patch),
            })
            if (status !== 200 || data.ok !== true) {
              throw new Error(data && data.error ? data.error : 'HTTP ' + status)
            }
            store.set({ ...store.get(), settings: data.settings })
          } catch (err) {
            setError(String(err && err.message ? err.message : err))
          } finally {
            setSaving(false)
          }
        }

        const commitX = () => {
          const n = parseInt(x, 10)
          const value = Number.isFinite(n) ? Math.max(0, Math.min(1000, n)) : 0
          setX(String(value))
          if (value !== s.autoRefreshEvery) void applyPatch({ autoRefreshEvery: value })
        }

        const total = formatTotal(state.result)

        return React.createElement('div', { className: 'dsb-sec' },
          React.createElement('div', null,
            React.createElement('div', { className: 'dsb-sec-row' },
              React.createElement('span', null, '启用余额插件'),
              React.createElement('input', {
                type: 'checkbox',
                checked: s.enabled,
                disabled: saving,
                onChange: (ev) => void applyPatch({ enabled: ev.target.checked }),
              }),
            ),
            React.createElement('div', { className: 'dsb-sec-hint' }, '关闭后侧边栏按钮隐藏，自动刷新暂停；设置仍保留'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'dsb-sec-row' },
              React.createElement('span', null, '按钮上直接显示余额'),
              React.createElement('input', {
                type: 'checkbox',
                checked: s.showInline,
                disabled: saving,
                onChange: (ev) => void applyPatch({ showInline: ev.target.checked }),
              }),
            ),
            React.createElement('div', { className: 'dsb-sec-hint' }, '不展开面板也能看到余额（窄栏圆钮无文字空间，悬停可见）'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'dsb-sec-row' },
              React.createElement('span', null, '每几轮对话自动刷新'),
              React.createElement('input', {
                type: 'number',
                min: 0,
                max: 1000,
                step: 1,
                value: x,
                disabled: saving,
                onChange: (ev) => setX(ev.target.value),
                onBlur: commitX,
                onKeyDown: (ev) => { if (ev.key === 'Enter') commitX() },
              }),
            ),
            React.createElement('div', { className: 'dsb-sec-hint' }, '0 = 关闭；设 1 则每轮对话结束都刷新一次（后台静默）'),
          ),
          React.createElement('div', null,
            React.createElement('div', { className: 'dsb-sec-row' },
              React.createElement('span', null, '当前余额'),
              React.createElement('span', { style: { fontWeight: 600 } },
                state.phase === 'loading' ? '查询中…' : (total !== null ? total : '—'),
              ),
            ),
            React.createElement('div', { className: 'dsb-sec-row', style: { marginTop: 8 } },
              React.createElement('button', {
                type: 'button',
                className: 'dsb-sec-btn',
                disabled: saving,
                onClick: () => refresh(true),
              }, '立即查询'),
              React.createElement('button', {
                type: 'button',
                className: 'dsb-sec-btn',
                disabled: saving,
                onClick: () => refresh(false),
              }, '后台查询'),
            ),
          ),
          error ? React.createElement('div', { className: 'dsb-err' }, '保存失败: ' + error) : null,
        )
      }
      return Section
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return

      const store = createStore({
        open: false,
        phase: 'idle',
        result: null,
        settings: DEFAULT_SETTINGS,
        lastTurnCount: null,
      })
      let requestSeq = 0

      function close() {
        requestSeq++
        store.set({ ...store.get(), open: false })
      }

      async function refresh(openPanel) {
        const seq = ++requestSeq
        if (openPanel) {
          store.set({ ...store.get(), open: true, phase: 'loading' })
        }
        try {
          const { status, data } = await fetchJson('/deepseek-balance')
          if (seq !== requestSeq) return
          const result = status === 200 ? data : { ok: false, error: 'HTTP ' + status }
          const next = { ...store.get(), phase: 'ready', result }
          if (openPanel) next.open = true
          store.set(next)
        } catch (err) {
          if (seq !== requestSeq) return
          const message = err && err.name === 'AbortError'
            ? '查询超时（45 秒）'
            : String(err && err.message ? err.message : err)
          const next = { ...store.get(), phase: 'ready', result: { ok: false, error: message } }
          if (openPanel) next.open = true
          store.set(next)
        }
      }

      async function pollState() {
        try {
          const { status, data } = await fetchJson('/deepseek-balance/state')
          if (status !== 200 || !data || typeof data !== 'object') return
          const prev = store.get()
          const settings = { ...DEFAULT_SETTINGS, ...data.settings }
          const prevTurn = prev.lastTurnCount
          let lastTurnCount = prevTurn === null ? data.turnCount : prevTurn
          let shouldRefresh = false
          if (settings.enabled && settings.autoRefreshEvery >= 1) {
            if (prevTurn === null) {
              lastTurnCount = data.turnCount
            } else {
              const delta = data.turnCount - prevTurn
              if (delta >= settings.autoRefreshEvery) {
                shouldRefresh = true
                lastTurnCount = data.turnCount
              }
            }
          } else {
            lastTurnCount = data.turnCount
          }
          const settingsChanged = JSON.stringify(prev.settings) !== JSON.stringify(settings)
          store.set({ ...store.get(), settings, lastTurnCount })
          if (shouldRefresh) {
            void refresh(false)
          } else if (settingsChanged && settings.enabled && settings.showInline && store.get().result === null) {
            void refresh(false)
          }
        } catch {
          // 静默：下一个轮询周期重试
        }
      }

      void pollState()
      const timer = ctx.get('timer')
      if (timer !== undefined) {
        timer.interval(() => { void pollState() }, POLL_MS)
      }

      slots.inject('sidebar.footer.action', () => slots.register(
        { name: 'sidebar.footer.action', id: 'deepseek-balance', order: 100, label: () => 'DeepSeek 余额' },
        (props) => React.createElement(makeAction(store, refresh, close), { wide: props.wide }),
      ))

      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: 'dsh-balance', order: 50, label: () => '余额' },
        () => React.createElement(makeSection(store, refresh), null),
      ))
    }

    return { apply }
  },
})
