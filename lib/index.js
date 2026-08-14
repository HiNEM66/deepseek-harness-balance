// dsh-balance host half.
//
// - GET  /deepseek-balance          → DeepSeek API balance JSON
// - GET  /deepseek-balance/state    → { settings, turnCount } (light poll)
// - POST /deepseek-balance/config   → merge a settings patch, persists to
//                                     ~/.dsh/settings.yaml via the settings seam
//
// The API key never appears in code or logs: it resolves per request from the
// DSH credential seam (`~/.dsh/.credentials.yaml` DEEPSEEK_API_KEY).
// `turnCount` advances on every closed agent turn (agent/turn-stopping).

import z from '@deepseek-ai/schemastery'

const BALANCE_URL = 'https://api.deepseek.com/user/balance'
const NS = 'dsh-balance'

const SettingsSchema = z.object({
  enabled: z.boolean().default(true),
  showInline: z.boolean().default(false),
  autoRefreshEvery: z.natural().max(1000).default(0),
})

export const name = 'dsh-balance'

export const inject = ['webServer', 'settings', 'agents']

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function readText(reader) {
  if (reader === undefined) return ''
  return reader.readFrom(0).text
}

async function readJsonBody(req, maxBytes) {
  let raw = ''
  req.setEncoding('utf8')
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > maxBytes) break
  }
  try {
    return JSON.parse(raw)
  } catch {
    return undefined
  }
}

async function queryBalance(ctx) {
  const credentials = ctx.get('credentials')
  const subprocess = ctx.get('subprocess')
  if (credentials === undefined || subprocess === undefined) {
    return { ok: false, error: '宿主服务未挂载（credentials/subprocess）' }
  }

  let resolved
  try {
    resolved = await credentials.resolve('DEEPSEEK_API_KEY')
  } catch (err) {
    return { ok: false, error: '读取凭据失败: ' + String(err && err.message ? err.message : err) }
  }
  if (resolved === undefined) {
    return { ok: false, error: '未配置 DEEPSEEK_API_KEY（~/.dsh/.credentials.yaml）' }
  }

  let handle
  try {
    handle = subprocess.spawn({
      argv: ['curl.exe', '-s', '-m', '30', '-H', 'Authorization: Bearer ' + resolved.value, BALANCE_URL],
      cwd: 'C:\\',
      stdio: { stdin: 'ignore', stdout: { maxBytes: 65536 }, stderr: { maxBytes: 16384 } },
      graceMs: 5000,
    })
  } catch (err) {
    return { ok: false, error: '启动 curl 失败: ' + String(err && err.message ? err.message : err) }
  }

  let outcome
  try {
    outcome = await handle.done
  } catch (err) {
    return { ok: false, error: '执行失败: ' + String(err && err.message ? err.message : err) }
  }

  if (outcome.exitCode !== 0) {
    const errText = readText(handle.collected.stderr).trim()
    return { ok: false, error: 'curl 退出码 ' + outcome.exitCode + (errText ? ': ' + errText.slice(0, 300) : '') }
  }

  const text = readText(handle.collected.stdout)
  let data
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: '响应解析失败: ' + text.slice(0, 200) }
  }

  const list = data && Array.isArray(data.balance_infos) ? data.balance_infos : []
  return {
    ok: true,
    isAvailable: data.is_available === true,
    infos: list.map((b) => ({
      currency: String(b.currency == null ? '' : b.currency),
      total: String(b.total_balance == null ? '' : b.total_balance),
      granted: String(b.granted_balance == null ? '' : b.granted_balance),
      toppedUp: String(b.topped_up_balance == null ? '' : b.topped_up_balance),
    })),
  }
}

export function apply(ctx) {
  const scope = ctx.settings.register(NS, SettingsSchema, { applies: 'live' })

  let turnCount = 0
  ctx.on('agent/created', ({ agent }) => {
    agent.ctx.effect(() => {
      const stop = agent.ctx.on('agent/turn-stopping', () => {
        turnCount++
      })
      return () => {
        stop()
      }
    }, 'dsh-balance: turn counter')
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/deepseek-balance',
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, { ok: false, error: 'method not allowed' })
      }
      json(res, 200, await queryBalance(ctx))
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/deepseek-balance/state',
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return json(res, 405, { ok: false, error: 'method not allowed' })
      }
      json(res, 200, { settings: scope.get(), turnCount })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/deepseek-balance/config',
    handler: async (req, res) => {
      if (req.method !== 'POST') {
        return json(res, 405, { ok: false, error: 'method not allowed' })
      }
      const patch = await readJsonBody(req, 65536)
      if (patch === undefined || typeof patch !== 'object' || patch === null || Array.isArray(patch)) {
        return json(res, 400, { ok: false, error: 'invalid JSON body' })
      }
      const allowed = {}
      for (const key of ['enabled', 'showInline', 'autoRefreshEvery']) {
        if (patch[key] !== undefined) allowed[key] = patch[key]
      }
      try {
        await scope.update(allowed)
        json(res, 200, { ok: true, settings: scope.get() })
      } catch (err) {
        json(res, 400, { ok: false, error: String(err && err.message ? err.message : err) })
      }
    },
  })
}
