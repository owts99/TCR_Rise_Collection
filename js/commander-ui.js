(function () {
  'use strict';

  const {
    DEFAULT_INPUT,
    FIELD_LIMITS,
    UNUSED_POOL_FIELDS,
    TROOP_POOL_FIELDS,
    UNIT_PRESETS,
    MAX_DEPLOYED_UNITS,
    calculate,
    setUnusedPoolValue,
    adjustUnusedPool,
    setTroopPoolValue,
    adjustTroopPool,
    roundTo,
  } = globalThis.CommanderCore;

  const UNUSED_POOL_FIELD_SET = new Set(UNUSED_POOL_FIELDS);
  const TROOP_POOL_FIELD_SET = new Set(TROOP_POOL_FIELDS);

  /** 兵種降級被未使用點數卡住時的提示。 */
  const TROOP_REFUND_BLOCKED_MESSAGE = '追加點數已分配到能力；先退回能力點數，才能降兵種等級。';

  const state = { ...DEFAULT_INPUT };

const elements = {
  inputs: new Map(
    [...document.querySelectorAll('[data-bind]')].map((element) => [element.dataset.bind, element]),
  ),
  outputs: new Map(),
  presetSelect: document.querySelector('#unit-preset'),
  formulaBody: document.querySelector('#formula-body'),
  intelStrip: document.querySelector('#intel-strip'),
  slotFill: document.querySelector('#slot-fill'),
  toast: document.querySelector('#toast'),
  resetButton: document.querySelector('#reset-button'),
  copyButton: document.querySelector('#copy-button'),
};

for (const element of document.querySelectorAll('[data-output]')) {
  const key = element.dataset.output;
  if (!elements.outputs.has(key)) elements.outputs.set(key, []);
  elements.outputs.get(key).push(element);
}

const integerFormatter = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });

const formatInteger = (value) => integerFormatter.format(value);
const formatDecimal = (value, digits = 2) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return new Intl.NumberFormat('zh-TW', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : Math.min(digits, 1),
    maximumFractionDigits: digits,
  }).format(number);
};
const formatWeight = (value) => formatDecimal(value, 1);
const formatSpace = (value) => formatDecimal(value, 1);
const formatFactor = (value) => `×${Number(value).toFixed(3)}`;

function setOutput(name, value) {
  for (const element of elements.outputs.get(name) ?? []) {
    element.textContent = value;
  }
}

function getPreset(id = state.unitPresetId) {
  return UNIT_PRESETS.find((preset) => preset.id === id) ?? null;
}

function displayUnit() {
  const preset = getPreset();
  if (!preset || state.unitPresetId === 'custom') {
    return {
      name: '自訂單位',
      category: '自訂',
      type: '自訂數值',
    };
  }
  return {
    name: preset.name,
    category: preset.category,
    type: preset.category === '自訂' ? '自訂' : `${preset.category}系`,
  };
}

function populatePresetOptions() {
  const select = elements.presetSelect;
  select.replaceChildren();

  for (const preset of UNIT_PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id;
    option.textContent = `${preset.name}（${preset.en}）· ${preset.baseHp} HP · ${preset.baseWeight} kg / ${preset.baseSpace} L`;
    select.append(option);
  }

  const custom = document.createElement('option');
  custom.value = 'custom';
  custom.textContent = '自訂單位 · 手動輸入數值';
  select.append(custom);
}

function syncInputs() {
  const normalized = calculate(state).input;
  Object.assign(state, normalized);

  for (const [key, element] of elements.inputs) {
    if (key === 'name') {
      element.value = normalized.name;
      continue;
    }
    element.value = String(normalized[key]);
  }

  if (normalized.unitPresetId === 'custom' || !getPreset(normalized.unitPresetId)) {
    elements.presetSelect.value = 'custom';
  } else {
    elements.presetSelect.value = normalized.unitPresetId;
  }
}

function buildFormulaRows(result) {
  const input = result.input;
  const visibilityText = result.visibility.canSee ? '是，可見敵軍兵種' : '否';
  const holdingNote = [
    `基礎 ${result.holding.base} / ${result.holding.cap}`,
    `回歸 +${result.holding.returnBonus}`,
    `最高 ${result.holding.max}`,
    '政治金錢效果未計入',
  ].join('｜');

  return [
    {
      name: '實戰體力',
      formula: '⌊(基礎體力 + 戰略 × 3) × (1 + 貢獻萬數 ÷ 100)⌋',
      substitution: `⌊(${input.baseHp} + ${input.strategy} × 3) × (1 + ${input.contribution} ÷ 100)⌋`,
      result: `${formatInteger(result.hp.effective)} HP`,
      note: `戰略 +${result.hp.strategyBonus}｜貢獻 +${formatDecimal(result.hp.contributionPct)}%`,
    },
    {
      name: '科技等級',
      formula: '單位等級 + ⌊知識 ÷ 3⌋ + ⌊技術 ÷ 10⌋',
      substitution: `${input.unitLevel} + ⌊${input.knowledge} ÷ 3⌋ + ⌊${input.technology} ÷ 10⌋`,
      result: `${result.tech.level} 級`,
      note: `知識 +${result.tech.knowledgeTier}｜技術 +${result.tech.technologyTier}`,
    },
    {
      name: '升級指數',
      formula: '單位等級 + ⌊知識 ÷ 3⌋',
      substitution: `${input.unitLevel} + ⌊${input.knowledge} ÷ 3⌋`,
      result: `${result.upgradeIndex}`,
      note: '用於判斷單位升級來源是否解鎖',
    },
    {
      name: '單位重量',
      formula: '基礎重量 × (1 + 技術 ÷ 120)',
      substitution: `${formatWeight(input.baseWeight)} × (1 + ${input.technology} ÷ 120)`,
      result: `${formatWeight(result.weight.effective)} kg`,
      note: `技術增幅 ${formatFactor(result.weight.factor)}`,
    },
    {
      name: '單位空間',
      formula: '基礎空間 × (1 + 技術 ÷ 120)',
      substitution: `${formatSpace(input.baseSpace)} × (1 + ${input.technology} ÷ 120)`,
      result: `${formatSpace(result.space.effective)} L`,
      note: `與重量共用技術增幅 ${formatFactor(result.space.factor)}`,
    },
    {
      name: '持有單位',
      formula: 'min(48, 24 + ⌊政治 ÷ 5⌋) + 回歸次數 × 2',
      substitution: `min(48, 24 + ⌊${input.politics} ÷ 5⌋) + ${input.returns} × 2`,
      result: `${result.holding.effective} 台`,
      note: holdingNote,
    },
    {
      name: '本國戰場人員',
      formula: '10 + ⌊領主戰略 ÷ 8⌋',
      substitution: `10 + ⌊${input.strategy} ÷ 8⌋`,
      result: `${result.personnel} 人`,
      note: '此頁以目前指揮官戰略代入領主值',
    },
    {
      name: '上陣台數',
      formula: `min(${MAX_DEPLOYED_UNITS}, 6 + ⌊戰略 ÷ 20⌋)`,
      substitution: `min(${MAX_DEPLOYED_UNITS}, 6 + ⌊${input.strategy} ÷ 20⌋)`,
      result: `${result.deployment} 台`,
      note: `B 規則：每 20 點 +1，最多 ${MAX_DEPLOYED_UNITS} 台`,
    },
    {
      name: '敵軍兵種可見性',
      formula: '我方政治 ≥ 對手政治 + 10',
      substitution: `${input.politics} ≥ ${input.opponentPolitics} + 10`,
      result: visibilityText,
      note: result.visibility.canSee
        ? `我方高出 ${result.visibility.politicsLead} 點，已達 +10 門檻`
        : result.visibility.politicsLead >= 0
          ? `我方僅高出 ${result.visibility.politicsLead} 點，未達 +10 門檻`
          : `我方低於對手 ${Math.abs(result.visibility.politicsLead)} 點`,
      alert: result.visibility.canSee,
    },
  ];
}

function renderFormulaTable(result) {
  const rows = buildFormulaRows(result).map((row) => {
    const tr = document.createElement('tr');
    if (row.alert) tr.className = 'is-alert';

    const nameCell = document.createElement('td');
    nameCell.className = 'field-name';
    nameCell.textContent = row.name;

    const formulaCell = document.createElement('td');
    formulaCell.className = 'formula-code';
    formulaCell.textContent = row.formula;

    const substitutionCell = document.createElement('td');
    substitutionCell.className = 'substitution';
    substitutionCell.textContent = row.substitution;

    const resultCell = document.createElement('td');
    resultCell.className = 'result-cell';
    resultCell.textContent = row.result;
    if (row.note) {
      const note = document.createElement('small');
      note.textContent = row.note;
      resultCell.append(note);
    }

    tr.append(nameCell, formulaCell, substitutionCell, resultCell);
    return tr;
  });

  elements.formulaBody.replaceChildren(...rows);
}

function render() {
  const result = calculate(state);
  const unit = displayUnit();
  const input = result.input;

  setOutput('unitName', unit.name);
  setOutput('unitCategory', unit.category);
  setOutput('unitType', unit.type);

  setOutput('workforcePoints', formatInteger(result.workforcePoints));
  setOutput('availablePoints', formatInteger(result.availablePoints));
  setOutput('techLevel', String(result.tech.level));
  setOutput('upgradeIndex', String(result.upgradeIndex));
  setOutput('weightFactor', formatFactor(result.weight.factor));
  setOutput('holding', `${result.holding.effective} 台`);
  setOutput('fieldPersonnel', `${result.personnel} 人`);
  setOutput('deployedUnits', `${result.deployment} 台`);

  setOutput('effectiveHp', formatInteger(result.hp.effective));
  setOutput('hpBreakdown', `${formatInteger(input.baseHp)} + ${formatInteger(result.hp.strategyBonus)}｜貢獻 +${formatDecimal(result.hp.contributionPct)}%`);
  setOutput('effectiveWeight', formatWeight(result.weight.effective));
  setOutput(
    'weightBreakdown',
    `${formatWeight(input.baseWeight)} × ${result.weight.factor.toFixed(3)}｜技術 +${formatDecimal(result.weight.factor * 100 - 100, 1)}%`,
  );
  setOutput('effectiveSpace', formatSpace(result.space.effective));
  setOutput(
    'spaceBreakdown',
    `${formatSpace(input.baseSpace)} × ${result.space.factor.toFixed(3)}｜同技術倍率`,
  );
  setOutput('strategyBonus', `+${formatInteger(result.hp.strategyBonus)} HP`);
  setOutput('techBoost', formatFactor(result.weight.factor));
  setOutput('contributionBonus', `+${formatDecimal(result.hp.contributionPct)}%`);

  setOutput('holdingBig', `${result.holding.effective} 台`);
  setOutput(
    'holdingDetail',
    `基礎 ${result.holding.base} / ${result.holding.cap}｜回歸 +${result.holding.returnBonus}（${input.returns}/12）｜含回歸最高 ${result.holding.max}`,
  );
  setOutput('deploymentSmall', `${result.deployment} 台`);
  setOutput('personnelSmall', `${result.personnel} 人`);

  setOutput('enemyVisibility', result.visibility.canSee ? '可見敵軍兵種' : '不可見');
  if (result.visibility.canSee) {
    setOutput(
      'enemyDetail',
      `我方政治 ${input.politics}，高出對手 ${result.visibility.politicsLead} 點（門檻 +10）→ 可按 F2 查看對方交戰兵種。`,
    );
  } else if (result.visibility.politicsLead >= 0) {
    setOutput(
      'enemyDetail',
      `我方政治 ${input.politics}，僅高出對手 ${result.visibility.politicsLead} 點，未達 +10 門檻。`,
    );
  } else {
    setOutput(
      'enemyDetail',
      `我方政治 ${input.politics}，低於對手 ${Math.abs(result.visibility.politicsLead)} 點，未達 +10 門檻。`,
    );
  }
  elements.intelStrip.classList.toggle('is-visible', result.visibility.canSee);

  const fillPercent = Math.min(100, (result.holding.effective / result.holding.max) * 100);
  elements.slotFill.style.width = `${fillPercent}%`;

  renderFormulaTable(result);
}

function syncPresetFromBase() {
  const match = UNIT_PRESETS.find(
    (preset) =>
      preset.baseHp === state.baseHp &&
      preset.baseWeight === state.baseWeight &&
      preset.baseSpace === state.baseSpace,
  );
  state.unitPresetId = match ? match.id : 'custom';
  elements.presetSelect.value = state.unitPresetId;
}

function normalizeFields() {
  const normalized = calculate(state).input;
  Object.assign(state, normalized);
  syncInputs();
  render();
}

function parseNumericInput(element) {
  const value = Number.parseFloat(element.value);
  return Number.isFinite(value) ? value : null;
}

/** 把輸入值整理成該欄位最終會套用的整數，用來判斷是否被退款上限卡住。 */
function clampIntegerToField(field, value) {
  const limits = FIELD_LIMITS[field];
  return Math.min(limits.max, Math.max(limits.min, Math.round(value)));
}

function bindInputs() {
  for (const [key, element] of elements.inputs) {
    element.addEventListener('input', () => {
      if (key === 'name') {
        state.name = element.value;
        render();
        return;
      }

      const value = parseNumericInput(element);
      if (value === null) return;

      if (UNUSED_POOL_FIELD_SET.has(key)) {
        Object.assign(state, setUnusedPoolValue(state, key, value));
        syncInputs();
        render();
        return;
      }

      if (TROOP_POOL_FIELD_SET.has(key)) {
        const next = setTroopPoolValue(state, key, value);
        if (next[key] < clampIntegerToField(key, value)) showToast(TROOP_REFUND_BLOCKED_MESSAGE);
        Object.assign(state, next);
        syncInputs();
        render();
        return;
      }

      state[key] = value;

      if (key === 'baseHp' || key === 'baseWeight' || key === 'baseSpace') {
        syncPresetFromBase();
      }
      render();
    });

    element.addEventListener('blur', normalizeFields);
    element.addEventListener('change', normalizeFields);
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        element.blur();
      }
    });
  }
}

function bindSteppers() {
  for (const button of document.querySelectorAll('.step-button')) {
    button.addEventListener('click', () => {
      const field = button.dataset.field;
      const delta = Number(button.dataset.delta);
      const limits = FIELD_LIMITS[field];
      if (!limits || !Number.isFinite(delta)) return;

      if (UNUSED_POOL_FIELD_SET.has(field)) {
        Object.assign(state, adjustUnusedPool(state, field, delta));
        syncInputs();
        render();
        return;
      }

      if (TROOP_POOL_FIELD_SET.has(field)) {
        const next = adjustTroopPool(state, field, delta);
        if (next[field] === state[field] && delta < 0) showToast(TROOP_REFUND_BLOCKED_MESSAGE);
        Object.assign(state, next);
        syncInputs();
        render();
        return;
      }

      const normalized = calculate(state).input;
      let value = normalized[field] + delta;
      value = Math.min(limits.max, Math.max(limits.min, value));
      if (field === 'baseWeight' || field === 'baseSpace' || field === 'contribution') {
        value = roundTo(value, 2);
      } else {
        value = Math.round(value);
      }

      state[field] = value;

      if (field === 'baseHp' || field === 'baseWeight' || field === 'baseSpace') {
        syncPresetFromBase();
      }
      syncInputs();
      render();
    });
  }
}

function bindPresetSelect() {
  elements.presetSelect.addEventListener('change', () => {
    const id = elements.presetSelect.value;
    const preset = getPreset(id);

    state.unitPresetId = id;
    if (preset && id !== 'custom') {
      state.baseHp = preset.baseHp;
      state.baseWeight = preset.baseWeight;
      state.baseSpace = preset.baseSpace;
    }
    syncInputs();
    render();
  });
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2200);
}

function currentPayload() {
  const result = calculate(state);
  const unit = displayUnit();

  return {
    commander: {
      name: result.input.name,
      infantry: result.input.infantry,
      mech: result.input.mech,
      air: result.input.air,
      special: result.input.special,
      unusedPoints: result.unusedPoints,
      additionPoints: result.additionPoints,
      availablePoints: result.availablePoints,
      strategy: result.input.strategy,
      politics: result.input.politics,
      knowledge: result.input.knowledge,
      technology: result.input.technology,
      workforcePoints: result.workforcePoints,
    },
    unit: {
      presetId: result.input.unitPresetId,
      name: unit.name,
      category: unit.category,
      level: result.input.unitLevel,
      baseHp: result.input.baseHp,
      baseWeight: result.input.baseWeight,
      baseSpace: result.input.baseSpace,
    },
    derived: {
      health: result.hp.effective,
      weight: result.weight.effective,
      space: result.space.effective,
      techLevel: result.tech.level,
      upgradeIndex: result.upgradeIndex,
      holding: result.holding.effective,
      holdingMax: result.holding.max,
      fieldPersonnel: result.personnel,
      deployedUnits: result.deployment,
      deployedUnitsCap: result.deploymentCap,
      contributionPct: result.hp.contributionPct,
      opponentCanSee: result.visibility.canSee,
    },
  };
}

async function copyState() {
  const text = JSON.stringify(currentPayload(), null, 2);

  try {
    await navigator.clipboard.writeText(text);
    showToast('已複製目前狀態 JSON');
  } catch {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.append(helper);
    helper.select();
    try {
      document.execCommand('copy');
      showToast('已複製目前狀態 JSON');
    } catch {
      showToast('複製失敗，請手動選取狀態資料');
    } finally {
      helper.remove();
    }
  }
}

function resetState() {
  Object.assign(state, DEFAULT_INPUT);
  syncInputs();
  render();
  showToast('已重置為預設狀態');
}

function init() {
  populatePresetOptions();
  bindInputs();
  bindSteppers();
  bindPresetSelect();

  elements.resetButton.addEventListener('click', resetState);
  elements.copyButton.addEventListener('click', copyState);

  syncInputs();
  render();
}

  init();
})();
