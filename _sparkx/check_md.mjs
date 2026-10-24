import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('tc_units_zh');
const md = fs.readFileSync(path.resolve('everzone/posts/101-택티컬-커맨더스-유닛-스펙.md'), 'utf8');
const html = fs.readFileSync(path.join(root, 'tc_units_zh_sparkx.html'), 'utf8');

const koToPage = {
  '휴머노이드': 'humanoid',
  '바즈노이드': 'bazonoid',
  '레일건너': 'railgunner',
  'GTA로켓런쳐': 'gta',
  '샤크': 'shark',
  '골리앗': 'goliath',
  '트윈발칸': 'twin_vulcan',
  '엑소노이드': 'exonoid',
  '틸라노이드': 'tilanoid',
  '자이안트': 'giant',
  '블레이더': 'blader',
  '팬텀': 'phantom',
  '스나이퍼': 'sniper',
  '라이트캐논탱크': 'light_cannon',
  '미디움탱크': 'medium_tank',
  '헤비탱크': 'heavy_tank',
  '라이트바이크': 'light_bike',
  '호버레이드': 'hover_raid',
  '아틸러리': 'artillery',
  '토르': 'thor',
  '듀크': 'duke',
  '스푸키듀크': 'spooky_duke',
  '자낙': 'zanak',
  '엑소리온': 'exorion',
  '엘롬브레': 'elombre',
  '에어로파이터': 'aerofighter',
  '화이어이글': 'fire_eagle',
  '오리온': 'orion',
  '익스큐터': 'executor',
  '펠리우스': 'felious',
  '제스트': 'jest',
  '메딕': 'medic',
  '리페리어': 'repairer',
  '힐제너레이터': 'heal_generator',
  '드롭쉽': 'dropship',
  '봄스쿼드': 'bomb_squad',
  '레인저': 'ranger',
  '레이더스쿼드': 'radar_squad',
  '스위퍼': 'sweeper',
  '이클립스': 'eclipse',
  '벙커노이드': 'bunkernoid',
};

const mdRows = [];
for (const line of md.split('\n')) {
  if (!line.startsWith('| [')) continue;
  const cells = line.slice(1, -1).split('|').map((s) => s.trim());
  const name = cells[0].match(/\[([^\]]+)\]/)?.[1];
  if (!name || !koToPage[name]) continue;
  mdRows.push({
    ko: name,
    page: koToPage[name],
    hp: cells[1],
    armor: cells[2],
    speed: cells[3],
    space: cells[4],
    weight: cells[5],
    upgradeSource: cells[6],
    upgradeIndex: cells[7],
    abilities: cells[8],
  });
}
console.log(`MD rows: ${mdRows.length}`);
if (mdRows.length !== 41) throw new Error('MD row count != 41');

const htmlRows = [];
for (const id of ['infantry', 'mech', 'air', 'special']) {
  const start = html.indexOf(`<div class="section" id="${id}">`);
  const end = html.indexOf('</div>', html.indexOf('</table>', start));
  const block = html.slice(start, end);
  for (const r of block.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
    if (!r[1].includes('<td>')) continue;
    const tds = [...r[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    const page = r[1].match(/href="units\/([a-z_]+)\.html"/)?.[1];
    htmlRows.push({ section: id, page, name: tds[0], hp: tds[1], armor: tds[2], speed: tds[3], space: tds[4], weight: tds[5], upgrade: tds[6], abilities: tds[7] });
  }
}
console.log(`HTML rows: ${htmlRows.length}`);

const errors = [];
const seen = new Set();
for (const m of mdRows) {
  const h = htmlRows.find((r) => r.page === m.page);
  if (!h) { errors.push(`missing unit: ${m.ko} (${m.page})`); continue; }
  seen.add(m.page);
  if (h.hp !== m.hp) errors.push(`${m.ko} HP: md=${m.hp} html=${h.hp}`);
  const mdArmorFirst = m.armor.match(/\d+/)?.[0];
  const htmlArmorFirst = h.armor.match(/\d+/)?.[0];
  if (mdArmorFirst !== htmlArmorFirst) errors.push(`${m.ko} armor: md=${m.armor} html=${h.armor}`);
  if (h.speed !== m.speed) errors.push(`${m.ko} speed: md=${m.speed} html=${h.speed}`);
  if (h.space !== m.space) errors.push(`${m.ko} space: md=${m.space} html=${h.space}`);
  if (h.weight !== m.weight) errors.push(`${m.ko} weight: md=${m.weight} html=${h.weight}`);
  if (m.upgradeIndex !== '-' && !h.upgrade.includes(m.upgradeIndex)) {
    errors.push(`${m.ko} upgrade index ${m.upgradeIndex} missing: html=${h.upgrade}`);
  }
  if (m.upgradeSource !== '-' && h.upgrade === '-') {
    errors.push(`${m.ko} upgrade source missing: md=${m.upgradeSource}`);
  }
}

const extra = htmlRows.filter((r) => !seen.has(r.page));
if (extra.length) errors.push(`extra rows: ${extra.map((r) => r.page).join(', ')}`);
if (seen.size !== 41) errors.push(`matched ${seen.size} units, expected 41`);

// targeted ability checks
const byPage = Object.fromEntries(htmlRows.map((r) => [r.page, r]));
const abilityChecks = [
  ['orion', ['推進器', '隱身']],
  ['jest', ['翼', '暗影']],
  ['fire_eagle', ['無']],
  ['executor', ['量子火焰']],
];
for (const [page, terms] of abilityChecks) {
  for (const t of terms) {
    if (!byPage[page]?.abilities.includes(t)) errors.push(`${page} ability missing ${t}: ${byPage[page]?.abilities}`);
  }
}

console.log(`matched: ${seen.size}`);
if (errors.length) {
  console.log(`ERRORS (${errors.length}):\n` + errors.join('\n'));
  process.exit(1);
}
console.log('MD ↔ HTML NUMERIC CHECK PASSED');
