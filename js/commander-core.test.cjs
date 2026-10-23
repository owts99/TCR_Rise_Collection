const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_INPUT,
  calculate,
  normalizeInput,
  adjustAttrPool,
  setAttrPoolValue,
  adjustTroopPool,
  setTroopPoolValue,
  totalWorkforcePoints,
  additionPoints,
  availablePoints,
} = require('./commander-core.js');

test('預設值符合 A+B 規則（屬性初始各 5、未使用 20）', () => {
  const result = calculate(DEFAULT_INPUT);

  assert.equal(result.unusedPoints, 20);
  assert.equal(result.additionPoints, 0);
  assert.equal(result.availablePoints, 20);
  assert.equal(result.workforcePoints, 40);
  assert.equal(result.allocatedAttrPoints, 20);
  assert.equal(result.hp.strategyBonus, 15);
  assert.equal(result.hp.effective, 1215);
  assert.equal(result.tech.knowledgeTier, 1);
  assert.equal(result.tech.technologyTier, 0);
  assert.equal(result.tech.level, 3);
  assert.equal(result.upgradeIndex, 3);
  assert.equal(result.weight.effective, 78.13);
  assert.equal(result.space.effective, 78.13);
  assert.equal(result.holding.base, 25);
  assert.equal(result.holding.effective, 25);
  assert.equal(result.personnel, 10);
  assert.equal(result.deployment, 6);
  assert.equal(result.visibility.canSee, false);
});

test('追加點數 = 四系兵種等級加總 − 4', () => {
  assert.equal(additionPoints(DEFAULT_INPUT), 0);
  const raised = calculate({
    ...DEFAULT_INPUT,
    infantry: 3,
    mech: 2,
    air: 1,
    special: 4,
  });
  assert.equal(raised.additionPoints, 6); // 3+2+1+4-4
});

test('全部點數 = 未使用 + 四屬性 + 追加點數', () => {
  const result = calculate({
    ...DEFAULT_INPUT,
    unusedPoints: 10,
    strategy: 8,
    politics: 7,
    knowledge: 6,
    technology: 9,
  });
  assert.equal(result.workforcePoints, 40);
  assert.equal(totalWorkforcePoints(result.input), 40);
});

test('兵種等級 +1 → addition +1 → available +1；unused 不變', () => {
  const next = adjustTroopPool(DEFAULT_INPUT, 'infantry', 1);
  assert.equal(next.infantry, 2);
  assert.equal(next.unusedPoints, 20);
  assert.equal(additionPoints(next), 1);
  assert.equal(availablePoints(next), 21);
  assert.equal(totalWorkforcePoints(next), 41);
});

test('屬性 + 會降低（未使用 + 追加）加總', () => {
  const next = adjustAttrPool(DEFAULT_INPUT, 'strategy', 1);
  assert.equal(next.unusedPoints, 19);
  assert.equal(additionPoints(next), 0);
  assert.equal(availablePoints(next), 19);
  assert.equal(totalWorkforcePoints(next), 40);
});

test('兵種等級 − 只降 addition；未使用為 0 時兵種仍可 +', () => {
  const refunded = adjustTroopPool(
    { ...DEFAULT_INPUT, infantry: 3, unusedPoints: 18 },
    'infantry',
    -1,
  );
  assert.equal(refunded.infantry, 2);
  assert.equal(refunded.unusedPoints, 18);
  assert.equal(additionPoints(refunded), 1);
  assert.equal(availablePoints(refunded), 19);

  const raised = adjustTroopPool({ ...DEFAULT_INPUT, unusedPoints: 0 }, 'mech', 1);
  assert.equal(raised.mech, 2);
  assert.equal(raised.unusedPoints, 0);
  assert.equal(additionPoints(raised), 1);
  assert.equal(availablePoints(raised), 1);
});

test('直接輸入兵種等級不受 unused 限制，最高到欄位上限', () => {
  const next = setTroopPoolValue(DEFAULT_INPUT, 'air', 100);
  assert.equal(next.air, 100);
  assert.equal(next.unusedPoints, 20);
  assert.equal(additionPoints(next), 99); // 1+1+100+1-4
  assert.equal(availablePoints(next), 119);
  assert.equal(totalWorkforcePoints(next), 139);
});

test('屬性 + 會花未使用點數；未使用為 0 時不能再加', () => {
  let next = adjustAttrPool(DEFAULT_INPUT, 'strategy', 1);
  assert.equal(next.strategy, 6);
  assert.equal(next.unusedPoints, 19);
  assert.equal(totalWorkforcePoints(next), 40);

  next = adjustAttrPool({ ...DEFAULT_INPUT, unusedPoints: 0 }, 'strategy', 1);
  assert.equal(next.strategy, 5);
  assert.equal(next.unusedPoints, 0);
});

test('屬性 − 會退回未使用點數', () => {
  const next = adjustAttrPool(DEFAULT_INPUT, 'politics', -2);
  assert.equal(next.politics, 3);
  assert.equal(next.unusedPoints, 22);
  assert.equal(totalWorkforcePoints(next), 40);
});

test('直接輸入屬性時，超出未使用負擔的部分會被截斷', () => {
  const next = setAttrPoolValue(DEFAULT_INPUT, 'knowledge', 100);
  assert.equal(next.knowledge, 25); // 5 + 20 unused
  assert.equal(next.unusedPoints, 0);
  assert.equal(totalWorkforcePoints(next), 40);
});

test('戰略每 1 點增加 3 點基礎體力', () => {
  const result = calculate({ ...DEFAULT_INPUT, baseHp: 1000, strategy: 20 });
  assert.equal(result.hp.strategyBonus, 60);
  assert.equal(result.hp.effective, 1060);
});

test('貢獻度以「萬」為單位，1 萬等於體力 +1%', () => {
  const result = calculate({ ...DEFAULT_INPUT, contribution: 100 });
  assert.equal(result.hp.beforeContribution, 1215);
  assert.equal(result.hp.effective, 2430);
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
    unusedPoints: -3,
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
  assert.equal(normalized.unusedPoints, 0);
  assert.equal(normalized.returns, 12);
  assert.equal(normalized.baseWeight, 0.1);
  assert.equal(normalized.baseSpace, 0.1);
  assert.equal(normalized.contribution, 0.01);
  assert.equal(normalized.name, DEFAULT_INPUT.name);
});
