# dsh-balance

[DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) **web 模式**插件：在侧边栏底部「设置」按钮上方加一个 **DeepSeek API 余额查询按钮**。

- 点击按钮 → 弹出面板显示各币种**总余额 / 赠送 / 充值**，带「刷新」「✕」按钮
- 可选**按钮直显余额**：不开面板也能在按钮上看到余额
- 可选**自动刷新**：每 N 轮对话结束后后台静默查询一次
- 设置面板里有完整「余额」栏目：启用/停用插件、按钮直显、自动刷新间隔
- 附赠：把官方 Cordis 徽章压缩成纯图标小圆钮，与余额按钮同排不拥挤
- 点击面板外任意位置自动合上

**API Key 不内置**：每次查询从 DSH 凭据库（`~/.dsh/.credentials.yaml` 的 `DEEPSEEK_API_KEY` 或环境变量）现取现用。

## 安装

```bash
# 1. 用 dsh 自带的 plugin 指令安装到 web profile（底层转发 pnpm）
dsh plugin --profile web add github:HiNEM66/deepseek-harness-balance

# 2. 注册补丁层：编辑 ~/.dsh/profiles/web/package.json，
#    把 "dsh-balance" 加进 "dsh.profile.bundles" 数组，例如：
#    "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-balance"]

# 3. 重启 web
dsh web
```

第 2 步的替代做法：手动在 `~/.dsh/profiles/web/cordis.patch.yml` 里加一行：

```yaml
- insert:
    - id: dsh-balance
      name: dsh-balance
```

> 前提：已配置 `DEEPSEEK_API_KEY` 凭据（在 `~/.dsh/.credentials.yaml` 里写，
> 或通过 dsh 的模型设置页面保存）。插件本身不携带任何 key。

## 设置

设置持久化在 `~/.dsh/settings.yaml` 的 `dsh-balance:` 段（live 生效，手动改文件约 10 秒内同步到界面）：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `enabled` | `true` | 是否启用：关闭后侧边栏按钮隐藏、自动刷新暂停，设置保留 |
| `showInline` | `false` | 按钮上直接显示余额（仅宽栏；窄栏圆钮无文字空间，悬停可见） |
| `autoRefreshEvery` | `0` | 每几轮对话自动刷新余额；`0` = 关闭，`1` = 每轮都刷 |

## 环境要求

- dsh `0.1.0-rc.x` web 模式（带标准客户端模块：sidebar / settings / slots）
- 余额路由在 Windows 上通过 `curl.exe` 查询，需能访问 `https://api.deepseek.com`

## 开发

**无需构建**：`lib/client.js` 是手写的自包含 `__ModuleLoader__` bundle（React 取自外壳的共享模块注册表），`lib/index.js` 是纯 ESM。

```bash
npm run check   # 对两个文件做 node --check 语法检查
```

目录结构：

```
lib/index.js        Host 半侧：/deepseek-balance、/state、/config 三个路由 +
                    设置命名空间 + agent 回合计数器
lib/client.js       客户端 bundle：侧边栏按钮 + 弹层 + 设置栏目
cordis.patch.yml    补丁层：插入双面插件行
dsh.plugin.json     插件面板元数据
```

## 已知限制

- 徽章压缩的 CSS 依赖官方 `Nqubda_*` 类名；dsh 升级若改了类名，徽章会静默恢复原样（余额按钮不受影响）。
- 客户端通过每 10 秒轮询 `/deepseek-balance/state` 同步设置与回合数。

## 卸载

```bash
dsh plugin --profile web remove dsh-balance
# 同时从 "dsh.profile.bundles" 里去掉 "dsh-balance"（或删掉 cordis.patch.yml 里的行）
```

## License

MIT
