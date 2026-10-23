const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_INPUT,
  calculate,
  normalizeInput,
} = require('./commander-core.js');

test('預設值符合 A+B 規則', () => {
  const result = calculate(DEFAULT_INPUT);

  assert.equal(result.hp.strategyBonus, 90);
  assert.equal(result.hp.effective, 1290);
  assert.equal(result.tech.knowledgeTier, 7);
  assert.equal(result.tech.technologyTier, 2);
  assert.equal(result.tech.level, 11);
  assert.equal(result.upgradeIndex, 9);
  assert.equal(result.weight.effective, 87.5);
  assert.equal(result.space.effective, 87.5);
  assert.equal(result.holding.base, 30);
  assert.equal(result.holding.effective, 30);
  assert.equal(result.personnel, 13);
  assert.equal(result.deployment, 7);
  assert.equal(result.visibility.canSee, false);
});

test('戰略每 1 點增加 3 點基礎體力', () => {
  const result = calculate({ ...DEFAULT_INPUT, baseHp: 1000, strategy: 20 });
  assert.equal(result.hp.strategyBonus, 60);
  assert.equal(result.hp.effective, 1060);
});

test('貢獻度以「萬」為單位，1 萬等於體力 +1%', () => {
  const result = calculate({ ...DEFAULT_INPUT, contribution: 100 });
  assert.equal(result.hp.beforeContribution, 1290);
  assert.equal(result.hp.effective, 2580);
});

test('知識與技術的分項整數除法', () => {
  const result = calculate({
    ...DEFAULT_INPUT,
    unitLevel: 10,
    knowledge: 29,
    technology: 119,
  });
  assert.equal(result.tech.knowledgeTier, 9);
  assert.equal(result.tech.technologyTier, 11);
  assert.equal(result.tech.level, 30);
  assert.equal(result.upgradeIndex, 19);
  assert.equal(result.weight.factor, 1 + 119 / 120);
});

test('持有單位基礎值上限 48，回歸最多 12 次、每次 +2', () => {
  const capped = calculate({
    ...DEFAULT_INPUT,
    politics: 999,
    returns: 12,
  });
  assert.equal(capped.holding.base, 48);
  assert.equal(capped.holding.returnBonus, 24);
  assert.equal(capped.holding.effective, 72);
  assert.equal(capped.holding.max, 72);
  assert.equal(capped.holding.atBaseCap, true);
});

test('政治 5 點換 1 台，未滿 5 點不進位', () => {
  assert.equal(calculate({ ...DEFAULT_INPUT, politics: 4 }).holding.base, 24);
  assert.equal(calculate({ ...DEFAULT_INPUT, politics: 5 }).holding.base, 25);
  assert.equal(calculate({ ...DEFAULT_INPUT, politics: 120 }).holding.base, 48);
});

test('本國人員與上陣台數使用戰略整數除法', () => {
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 0 }).personnel, 10);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 7 }).personnel, 10);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 8 }).personnel, 11);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 19 }).deployment, 6);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 20 }).deployment, 7);
});

test('B 規則：上陣台數每 20 點 +1，最多 12 台', () => {
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 119 }).deployment, 11);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 120 }).deployment, 12);
  assert.equal(calculate({ ...DEFAULT_INPUT, strategy: 999 }).deployment, 12);
});

test('B 規則：重量與空間各自套用同一個技術倍率', () => {
  const result = calculate({
    ...DEFAULT_INPUT,
    baseWeight: 75,
    baseSpace: 60,
    technology: 120,
  });
  assert.equal(result.weight.factor, 2);
  assert.equal(result.weight.effective, 150);
  assert.equal(result.space.factor, 2);
  assert.equal(result.space.effective, 120);
});

test('我方政治高出對手 10 點以上才可見', () => {
  const base = { ...DEFAULT_INPUT, politics: 33 };
  assert.equal(calculate({ ...base, opponentPolitics: 23 }).visibility.canSee, true);
  assert.equal(calculate({ ...base, opponentPolitics: 24 }).visibility.canSee, false);
  assert.equal(calculate({ ...base, opponentPolitics: 99 }).visibility.politicsLead, -66);
});

test('輸入會被限制在合法範圍並正規化', () => {
  const normalized = normalizeInput({
    strategy: -10,
    politics: 5000,
    knowledge: '22.7',
    technology: 'abc',
    returns: 99,
    baseWeight: 0,
    baseSpace: 0,
    contribution: 0.005,
    name: '   ',
  });

  assert.equal(normalized.strategy, 0);
  assert.equal(normalized.politics, 999);
  assert.equal(normalized.knowledge, 23);
  assert.equal(normalized.technology, DEFAULT_INPUT.technology);
  assert.equal(normalized.returns, 12);
  assert.equal(normalized.baseWeight, 0.1);
  assert.equal(normalized.baseSpace, 0.1);
  assert.equal(normalized.contribution, 0.01);
  assert.equal(normalized.name, DEFAULT_INPUT.name);
});
