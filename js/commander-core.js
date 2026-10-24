/**
 * 《戰術指揮官》指揮官狀態欄位計算核心
 *
 * 公式來源：Everzone #101〈戰術指揮官 單位規格〉
 * 「指揮官屬性資訊（戰略, 政治, 知識, 技術）」章節。
 *
 * 此檔只處理資料與公式，不碰 DOM。
 * 使用 UMD 形式，讓靜態頁可以直接用 <script> 載入，
 * 也能在 Node.js 裡用 require() 做測試，不需要先開伺服器。
 */
(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.CommanderCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_INPUT = Object.freeze({
    name: 'New Hero 0',
    infantry: 1,
    mech: 1,
    air: 1,
    special: 1,
    unusedPoints: 20,
    strategy: 5,
    politics: 5,
    knowledge: 5,
    technology: 5,
    unitLevel: 2,
    baseHp: 1400,
    baseWeight: 70,
    baseSpace: 70,
    contribution: 0,
    returns: 0,
    opponentPolitics: 30,
    unitPresetId: 'humanoid',
  });

  /**
   * 少量示範單位；數值取自 #101 的單位表。
   * 之後若接上完整單位資料庫，只要維持 baseHp / baseWeight / baseSpace / category 欄位即可。
   * baseSpace 來自 #101 的「空間」欄位；重量與空間各自套用技術倍率。
   */
  const UNIT_PRESETS = Object.freeze([
    { id: 'daeya', name: 'Daeya', en: 'Custom sample', category: '自訂', baseHp: 1200, baseWeight: 75, baseSpace: 75 },
    { id: 'humanoid', name: '戰猿', en: 'Humanoid', category: '步兵', baseHp: 1400, baseWeight: 70, baseSpace: 70 },
    { id: 'bazonoid', name: '巴茲尼德', en: 'Bazonoid', category: '步兵', baseHp: 2000, baseWeight: 90, baseSpace: 80 },
    { id: 'medium-tank', name: '中型坦克', en: 'Medium Tank', category: '車輛', baseHp: 2400, baseWeight: 300, baseSpace: 240 },
    { id: 'light-bike', name: '輕型摩托', en: 'Light Bike', category: '車輛', baseHp: 1200, baseWeight: 160, baseSpace: 160 },
    { id: 'exorion', name: '艾索里昂', en: 'Exorion', category: '飛行', baseHp: 950, baseWeight: 100, baseSpace: 90 },
    { id: 'executor', name: '執行者', en: 'Executor', category: '飛行', baseHp: 1700, baseWeight: 130, baseSpace: 100 },
    { id: 'medic', name: '醫護兵', en: 'Medic', category: '特殊', baseHp: 1150, baseWeight: 70, baseSpace: 60 },
    { id: 'bunkernoid', name: '堡壘尼德', en: 'Bunkernoid', category: '特殊', baseHp: 2000, baseWeight: 300, baseSpace: 240 },
  ]);

  const FIELD_LIMITS = Object.freeze({
    infantry: { min: 1, max: 100 },
    mech: { min: 1, max: 100 },
    air: { min: 1, max: 100 },
    special: { min: 1, max: 100 },
    unusedPoints: { min: 0, max: 999 },
    strategy: { min: 0, max: 999 },
    politics: { min: 0, max: 999 },
    knowledge: { min: 0, max: 999 },
    technology: { min: 0, max: 999 },
    unitLevel: { min: 1, max: 200 },
    baseHp: { min: 1, max: 100000 },
    baseWeight: { min: 0.1, max: 10000 },
    baseSpace: { min: 0.1, max: 10000 },
    contribution: { min: 0, max: 10000 },
    returns: { min: 0, max: 12 },
    opponentPolitics: { min: 0, max: 999 },
  });

  /** 四項能力（戰略／政治／知識／技術）：加減時與 unusedPoints 互換。 */
  const ATTR_POOL_FIELDS = Object.freeze(['strategy', 'politics', 'knowledge', 'technology']);

  /**
   * 兵種等級（Designer: Infantry / Mobile / Aviation / Organic）。
   * 獨立加減，只影響 additionPoints（不扣 unused）。
   * 注意：Mobile＝機械系等級；Mech Apt＝技術「能力」，兩者不同。
   */
  const TROOP_POOL_FIELDS = Object.freeze(['infantry', 'mech', 'air', 'special']);

  /** 未使用點數池：僅四項「能力」（戰略／政治／知識／技術）。 */
  const UNUSED_POOL_FIELDS = Object.freeze([...ATTR_POOL_FIELDS]);

  /**
   * 四系兵種等級最低各 1，加總基底 4；超過的部分才算追加點數。
   * 追加點數會在兵種等級變動的當下轉入／轉出 unusedPoints，
   * 所以「顯示的未使用點數」與「實際可扣的額度」共用同一個數。
   */
  const TROOP_BASE_SUM = 4;

  const MAX_RETURNS = 12;
  const BASE_HOLDING_CAP = 48;
  const RETURN_UNITS = 2;
  const MAX_DEPLOYED_UNITS = 12;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function roundTo(value, decimals = 0) {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }

  function normalizeInteger(value, fallback, limits) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    const finite = Number.isFinite(parsed) ? parsed : fallback;
    return Math.round(clamp(finite, limits.min, limits.max));
  }

  function normalizeDecimal(value, fallback, limits, decimals) {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
    const finite = Number.isFinite(parsed) ? parsed : fallback;
    return roundTo(clamp(finite, limits.min, limits.max), decimals);
  }

  /**
   * 將任意輸入整理成可計算的狀態。
   * 文字欄位不會影響公式；空白名稱會回到預設名稱。
   */
  function normalizeInput(raw = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const merged = { ...DEFAULT_INPUT, ...source };

    return {
      name: String(merged.name ?? '').trim().slice(0, 32) || DEFAULT_INPUT.name,
      infantry: normalizeInteger(merged.infantry, DEFAULT_INPUT.infantry, FIELD_LIMITS.infantry),
      mech: normalizeInteger(merged.mech, DEFAULT_INPUT.mech, FIELD_LIMITS.mech),
      air: normalizeInteger(merged.air, DEFAULT_INPUT.air, FIELD_LIMITS.air),
      special: normalizeInteger(merged.special, DEFAULT_INPUT.special, FIELD_LIMITS.special),
      unusedPoints: normalizeInteger(
        merged.unusedPoints,
        DEFAULT_INPUT.unusedPoints,
        FIELD_LIMITS.unusedPoints,
      ),
      strategy: normalizeInteger(merged.strategy, DEFAULT_INPUT.strategy, FIELD_LIMITS.strategy),
      politics: normalizeInteger(merged.politics, DEFAULT_INPUT.politics, FIELD_LIMITS.politics),
      knowledge: normalizeInteger(merged.knowledge, DEFAULT_INPUT.knowledge, FIELD_LIMITS.knowledge),
      technology: normalizeInteger(merged.technology, DEFAULT_INPUT.technology, FIELD_LIMITS.technology),
      unitLevel: normalizeInteger(merged.unitLevel, DEFAULT_INPUT.unitLevel, FIELD_LIMITS.unitLevel),
      baseHp: normalizeInteger(merged.baseHp, DEFAULT_INPUT.baseHp, FIELD_LIMITS.baseHp),
      baseWeight: normalizeDecimal(merged.baseWeight, DEFAULT_INPUT.baseWeight, FIELD_LIMITS.baseWeight, 2),
      baseSpace: normalizeDecimal(merged.baseSpace, DEFAULT_INPUT.baseSpace, FIELD_LIMITS.baseSpace, 2),
      contribution: normalizeDecimal(
        merged.contribution,
        DEFAULT_INPUT.contribution,
        FIELD_LIMITS.contribution,
        2,
      ),
      returns: normalizeInteger(merged.returns, DEFAULT_INPUT.returns, FIELD_LIMITS.returns),
      opponentPolitics: normalizeInteger(
        merged.opponentPolitics,
        DEFAULT_INPUT.opponentPolitics,
        FIELD_LIMITS.opponentPolitics,
      ),
      unitPresetId: String(merged.unitPresetId ?? DEFAULT_INPUT.unitPresetId),
    };
  }

  function allocatedAttrPoints(input) {
    return input.strategy + input.politics + input.knowledge + input.technology;
  }

  function troopTypeSum(input) {
    return input.infantry + input.mech + input.air + input.special;
  }

  /** 四系兵種等級加總 − 4（每系基底 1）。 */
  function additionPoints(input) {
    return troopTypeSum(input) - TROOP_BASE_SUM;
  }

  /**
   * 未使用點數＝唯一可分配的池子（單一來源）。
   * 兵種等級的追加點數在升級時就已轉入 unusedPoints，
   * 因此這裡直接等於 unusedPoints，不再另外相加 additionPoints。
   */
  function availablePoints(input) {
    return input.unusedPoints;
  }

  /** 全部點數 = 未使用（含兵種追加） + 四項能力。 */
  function totalWorkforcePoints(input) {
    return availablePoints(input) + allocatedAttrPoints(input);
  }

  /**
   * 調整未使用點數池（僅四項能力：戰略／政治／知識／技術）：
   * 花費從 unusedPoints 扣，退回則加回。
   * 未使用點數不足時，+ 只能加到負擔得起的上限。
   */
  function setUnusedPoolValue(rawInput, field, nextValue) {
    if (!UNUSED_POOL_FIELDS.includes(field)) {
      throw new Error(`setUnusedPoolValue: ${field} 不是未使用點數池欄位`);
    }

    const input = normalizeInput(rawInput);
    const limits = FIELD_LIMITS[field];
    let next = normalizeInteger(nextValue, input[field], limits);
    const maxAffordable = input[field] + input.unusedPoints;
    next = Math.min(next, maxAffordable);

    const spent = next - input[field];
    return {
      ...input,
      [field]: next,
      unusedPoints: input.unusedPoints - spent,
    };
  }

  function adjustUnusedPool(rawInput, field, delta) {
    const input = normalizeInput(rawInput);
    return setUnusedPoolValue(rawInput, field, input[field] + delta);
  }

  function setAttrPoolValue(rawInput, field, nextValue) {
    if (!ATTR_POOL_FIELDS.includes(field)) {
      throw new Error(`setAttrPoolValue: ${field} 不是能力點數池欄位`);
    }
    return setUnusedPoolValue(rawInput, field, nextValue);
  }

  function adjustAttrPool(rawInput, field, delta) {
    return adjustUnusedPool(rawInput, field, delta);
  }

  /**
   * 兵種等級調整：追加點數的增減直接轉入／轉出 unusedPoints。
   *
   * 升級（+）：unusedPoints 增加，之後就能拿去點四項能力。
   * 降級（−）：要把先前追加的點數收回；但已花在能力上的點數不能再退，
   * 所以降級幅度最多只能到 unusedPoints 歸零為止（例如未使用 0 時降不了級）。
   */
  function setTroopPoolValue(rawInput, field, nextValue) {
    if (!TROOP_POOL_FIELDS.includes(field)) {
      throw new Error(`setTroopPoolValue: ${field} 不是兵種等級欄位`);
    }

    const input = normalizeInput(rawInput);
    let next = normalizeInteger(nextValue, input[field], FIELD_LIMITS[field]);
    if (next < input[field]) {
      next = Math.max(next, input[field] - input.unusedPoints);
    }

    const transferred = next - input[field];
    return {
      ...input,
      [field]: next,
      unusedPoints: input.unusedPoints + transferred,
    };
  }

  function adjustTroopPool(rawInput, field, delta) {
    const input = normalizeInput(rawInput);
    return setTroopPoolValue(rawInput, field, input[field] + delta);
  }

  /**
   * 規則 A：#101 的七條數值規則。
   * 規則 B：龍傲天下提供的四項對照規則（2026-10-23 使用者提供）。
   *
   * A/B 對照後採用的重點：
   * - 戰略/戰術：每 1 點 +3 體力；每 20 點 +1 上陣台數，最多 12 台（B 補上限）。
   * - 政治：每 5 點 +1 持有；A 的基礎 24、上限 48、回歸 +2/次保留。
   * - 知識/教育：每 3 點 +1 科技與升級指數。
   * - 技術：每 10 點 +1 科技；重量與空間各自乘上 (1 + 技術/120)。
   * - 可見性：我方政治需高出對手 10 點以上（B 與韓文原文方向一致；
   *   A 的中文翻譯「對方政治比自己高」方向相反，已修正）。
   *
   * 取整約定：
   * - 知識/3、技術/10、政治/5、戰略/8、戰略/20 皆為整數除法（向下取整）。
   * - 體力在套用貢獻加成後向下取整。
   * - 重量與空間保留兩位小數；畫面通常只顯示一位。
   */
  function calculate(rawInput = {}) {
    const input = normalizeInput(rawInput);

    const knowledgeTier = Math.floor(input.knowledge / 3);
    const technologyTier = Math.floor(input.technology / 10);

    const techLevel = input.unitLevel + knowledgeTier + technologyTier;
    const upgradeIndex = input.unitLevel + knowledgeTier;

    const strategyHpBonus = input.strategy * 3;
    const hpBeforeContribution = input.baseHp + strategyHpBonus;
    const contributionPct = input.contribution; // 1 萬 = 1%
    const effectiveHp = Math.floor(hpBeforeContribution * (1 + contributionPct / 100) + 1e-9);
    const hpDelta = effectiveHp - input.baseHp;

    const weightFactor = 1 + input.technology / 120;
    const effectiveWeight = roundTo(input.baseWeight * weightFactor, 2);
    const effectiveSpace = roundTo(input.baseSpace * weightFactor, 2);

    const holdingBaseUncapped = 24 + Math.floor(input.politics / 5);
    const holdingBase = Math.min(BASE_HOLDING_CAP, holdingBaseUncapped);
    const returnBonus = input.returns * RETURN_UNITS;
    const holding = holdingBase + returnBonus;
    const maxHolding = BASE_HOLDING_CAP + MAX_RETURNS * RETURN_UNITS;

    const fieldPersonnel = 10 + Math.floor(input.strategy / 8);
    const deployedUnits = Math.min(MAX_DEPLOYED_UNITS, 6 + Math.floor(input.strategy / 20));
    const addition = additionPoints(input);
    const available = availablePoints(input);
    const workforcePoints = totalWorkforcePoints(input);

    // B 規則：由「我方」政治高出對手 10 點以上，才能看到對方兵種。
    const politicsLead = input.politics - input.opponentPolitics;
    const canSeeOpponentUnits = politicsLead >= 10;

    return {
      input,
      workforcePoints,
      unusedPoints: input.unusedPoints,
      additionPoints: addition,
      availablePoints: available,
      allocatedAttrPoints: allocatedAttrPoints(input),
      hp: {
        base: input.baseHp,
        strategyBonus: strategyHpBonus,
        beforeContribution: hpBeforeContribution,
        contributionPct,
        effective: effectiveHp,
        delta: hpDelta,
      },
      tech: {
        level: techLevel,
        knowledgeTier,
        technologyTier,
        unitLevel: input.unitLevel,
      },
      upgradeIndex,
      weight: {
        base: input.baseWeight,
        factor: weightFactor,
        effective: effectiveWeight,
      },
      space: {
        base: input.baseSpace,
        factor: weightFactor,
        effective: effectiveSpace,
      },
      holding: {
        base: holdingBase,
        baseUncapped: holdingBaseUncapped,
        cap: BASE_HOLDING_CAP,
        returnCount: input.returns,
        returnBonus,
        effective: holding,
        max: maxHolding,
        atBaseCap: holdingBaseUncapped >= BASE_HOLDING_CAP,
      },
      personnel: fieldPersonnel,
      deployment: deployedUnits,
      deploymentCap: MAX_DEPLOYED_UNITS,
      visibility: {
        ownPolitics: input.politics,
        opponentPolitics: input.opponentPolitics,
        politicsLead,
        canSee: canSeeOpponentUnits,
      },
    };
  }

  return {
    DEFAULT_INPUT,
    UNIT_PRESETS,
    FIELD_LIMITS,
    ATTR_POOL_FIELDS,
    TROOP_POOL_FIELDS,
    UNUSED_POOL_FIELDS,
    TROOP_BASE_SUM,
    MAX_RETURNS,
    BASE_HOLDING_CAP,
    RETURN_UNITS,
    MAX_DEPLOYED_UNITS,
    normalizeInput,
    calculate,
    allocatedAttrPoints,
    totalWorkforcePoints,
    troopTypeSum,
    additionPoints,
    availablePoints,
    setUnusedPoolValue,
    adjustUnusedPool,
    setAttrPoolValue,
    adjustAttrPool,
    setTroopPoolValue,
    adjustTroopPool,
    roundTo,
  };
});
