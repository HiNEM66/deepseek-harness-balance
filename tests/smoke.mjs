// Smoke test: execute lib/client.js against a fake ModuleLoader kernel and a
// minimal document, then drive the registered factory with a stub require.
// Catches the classic failure of a hand-written bundle: a factory that forgets
// to declare its `require` parameter ("require is not defined" at boot).
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'

const code = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

const registrations = []
const sandbox = {
  window: {},
  document: {
    querySelector: () => null,
    createElement: (tag) => ({
      tag,
      dataset: {},
      children: [],
      setAttribute() {},
      appendChild(child) { this.children.push(child) },
    }),
    head: { appendChild() {} },
  },
}
sandbox.window.__ModuleLoader__ = {
  load: (registration) => { registrations.push(registration) },
}
vm.createContext(sandbox)
vm.runInContext(code, sandbox)

if (registrations.length !== 1) {
  throw new Error('expected one __ModuleLoader__.load registration, got ' + registrations.length)
}
const registration = registrations[0]
if (registration.id !== 'dsh-balance') {
  throw new Error('unexpected module id: ' + registration.id)
}

const reactStub = {
  createElement: () => ({}),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useRef: () => ({ current: null }),
}
const plugin = registration.factory((id) => {
  if (id !== 'react') throw new Error('unexpected require: ' + id)
  return reactStub
})
if (plugin === null || typeof plugin !== 'object' || typeof plugin.apply !== 'function') {
  throw new Error('factory did not return a plugin object with apply()')
}
console.log('smoke OK: bundle registered, factory received require, apply() present')
