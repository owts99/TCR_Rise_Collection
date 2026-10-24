/**
 * UI 煙霧測試：用最小 DOM stub 載入 commander-ui.js，
 * 驗證兵種 stepper 會把追加點數轉進未使用點數、真的能再花到能力上，
 * 以及「點數已花掉時降不了兵種」。
 * 用法：node js/commander-ui.smoke.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

function makeElement(tag = 'div') {
  const listeners = new Map();
  return {
    tagName: tag.toUpperCase(),
    dataset: {},
    style: {},
    value: '',
    textContent: '',
    children: [],
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    dispatch(type) {
      for (const handler of listeners.get(type) ?? []) handler({ preventDefault() {}, key: '' });
    },
    replaceChildren(...nodes) { this.children = nodes; },
    append(...nodes) { this.children.push(...nodes); },
    select() {},
    setAttribute() {},
    remove() {},
    blur() {},
    querySelectorAll: () => [],
  };
}

const fieldNames = [
  'infantry', 'mech', 'air', 'special', 'strategy', 'politics', 'knowledge', 'technology',
  'contribution', 'returns', 'opponentPolitics', 'unitLevel', 'baseHp', 'baseWeight',
  'baseSpace', 'name',
];
const stepperFields = [...fieldNames];

const inputs = new Map(
  fieldNames.map((name) => {
    const element = makeElement('input');
    element.dataset = { bind: name };
    return [name, element];
  }),
);
const steppers = new Map();
for (const field of stepperFields) {
  for (const delta of [-1, 1]) {
    const button = makeElement('button');
    button.dataset = { field, delta: String(delta) };
    steppers.set(`${field}:${delta}`, button);
  }
}

const document = {
  body: makeElement('body'),
  querySelectorAll(selector) {
    if (selector === '[data-bind]') return [...inputs.values()].map((el) => el);
    if (selector === '.step-button') return [...steppers.values()];
    if (selector === '[data-output]') return [];
    return [];
  },
  querySelector(selector) {
    if (selector === '#unit-preset') return makeElement('select');
    if (selector === '#formula-body') return makeElement('tbody');
    if (selector === '#intel-strip') return makeElement('div');
    if (selector === '#slot-fill') return makeElement('div');
    if (selector === '#toast') return makeElement('div');
    if (selector === '#reset-button' || selector === '#copy-button') return makeElement('button');
    return makeElement('div');
  },
  createElement: (tag) => makeElement(tag),
};

const sandbox = {
  document,
  window: { setTimeout: () => 0, clearTimeout() {} },
  Intl,
  console,
  globalThis: null,
};
sandbox.globalThis = sandbox;
sandbox.navigator = { clipboard: { writeText: async () => {} } };

const corePath = path.join(__dirname, 'commander-core.js');
const uiPath = path.join(__dirname, 'commander-ui.js');
vm.runInNewContext(fs.readFileSync(corePath, 'utf8'), sandbox, { filename: corePath });
vm.runInNewContext(fs.readFileSync(uiPath, 'utf8'), sandbox, { filename: uiPath });

const read = (field) => Number(inputs.get(field).value);

// 預設：未使用 20、戰略 5。
assert.equal(read('strategy'), 5);

const click = (field, delta) => steppers.get(`${field}:${delta}`).dispatch('click');

// 兵種 +1 → 未使用 21，且第 21 點真的能點進戰略。
click('infantry', 1);
click('infantry', 1); // 兵種 3，追加 2
for (let i = 0; i < 22; i += 1) click('strategy', 1);

assert.equal(read('strategy'), 27, '戰略應吃到 27（5 + 22）');
assert.equal(read('strategy') - 5, 22, '22 點追加點數都應花得掉');

// 未使用 0 時降不了兵種；先退回 1 點能力就能降 1 級。
click('infantry', -1);
assert.equal(read('infantry'), 3, '點數已花掉時兵種等級不應下降');
click('strategy', -1);
click('infantry', -1);
assert.equal(read('infantry'), 2);

console.log('ui smoke ok: strategy =', read('strategy'), 'infantry =', read('infantry'));
