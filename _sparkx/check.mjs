import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('tc_units_zh');
const file = path.join(root, 'tc_units_zh_sparkx.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [];
const warn = [];

// ---------- tag balance ----------
const voidTags = new Set(['meta', 'link', 'img', 'br', 'hr', 'input', 'source', 'area', 'base', 'col', 'embed', 'param', 'track', 'wbr']);
const stack = [];
for (const m of html.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g)) {
  const [, closing, tag, attrs] = m;
  const t = tag.toLowerCase();
  if (t === '!doctype') continue;
  if (attrs.trim().endsWith('/')) continue;
  if (voidTags.has(t)) continue;
  if (!closing) stack.push(t);
  else {
    const top = stack.pop();
    if (top !== t) errors.push(`tag mismatch: </${t}> closes <${top ?? 'none'}> near char ${m.index}`);
  }
}
if (stack.length) errors.push(`unclosed tags: ${stack.join(', ')}`);

// ---------- sections & rows ----------
const sectionIds = [...html.matchAll(/<div class="section" id="([^"]+)">/g)].map((m) => m[1]);
for (const id of sectionIds) {
  if (!html.includes(`href="#${id}"`)) warn.push(`nav missing #${id}`);
}
for (const m of html.matchAll(/href="#([^"]+)"/g)) {
  if (!sectionIds.includes(m[1])) errors.push(`anchor target missing: #${m[1]}`);
}

const unitSectionIds = ['infantry', 'mech', 'air', 'special'];
const unitRows = [];
for (const id of unitSectionIds) {
  const start = html.indexOf(`<div class="section" id="${id}">`);
  const end = html.indexOf('</div>', html.indexOf('</table>', start));
  const block = html.slice(start, end);
  const rows = [...block.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((r) => r[1])
    .filter((r) => r.includes('<td>'));
  for (const row of rows) {
    const tds = [...row.matchAll(/<td>([\s\S]*?)<\/td>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    if (tds.length !== 8) errors.push(`${id}: row has ${tds.length} tds: ${tds[0]}`);
    const href = row.match(/href="(units\/[^"]+)"/)?.[1];
    unitRows.push({ section: id, tds, href });
  }
  console.log(`${id}: ${rows.length} rows`);
  if (rows.length !== { infantry: 13, mech: 9, air: 9, special: 10 }[id]) {
    errors.push(`${id}: expected ${ { infantry: 13, mech: 9, air: 9, special: 10 }[id] } rows, got ${rows.length}`);
  }
}

console.log(`total unit rows: ${unitRows.length}`);
if (unitRows.length !== 41) errors.push(`total rows ${unitRows.length} != 41`);

const hrefs = unitRows.map((r) => r.href).filter(Boolean);
if (new Set(hrefs).size !== 41) errors.push(`unique hrefs ${new Set(hrefs).size} != 41`);
for (const h of hrefs) {
  if (!/^units\/[a-z_]+\.html$/.test(h)) errors.push(`bad href: ${h}`);
  if (!fs.existsSync(path.join(root, h))) errors.push(`missing page: ${h}`);
}

// expected values for the rows that were wrong in index.html
const expected = {
  'Fire Eagle（火之鷹）': ['1000', '0', '7.7 m/s', '90', '100', 'Exorion 35', '無'],
  'Executor（處刑者）': ['1700', '20', '3.0 m/s', '100', '130', 'Orion 40'],
  'Orion（獵戶座）': ['1050', '1', '6.0 m/s', '90', '120', '-', '推進器、隱身類'],
  'Medic（醫療兵）': ['1150', '1', '2.8 m/s', '60', '70'],
  'Repairer（修理者）': ['1100', '2', '2.2 m/s', '90', '100'],
  'Bomb Squad（地雷兵）': ['1300', '2', '2.0 m/s', '60', '70'],
  'Eclipse（日蝕）': ['1500', '5', '3.0 m/s', '120', '150'],
  'Sweeper（清除兵）': ['1500', '1', '4.5 m/s', '90', '100'],
  'Felious（支援者）': ['1000', '1', '3.0 m/s', '90', '100'],
  'Jest（熱忱）': ['2350', '6', '6.0 m/s', '-', '-'],
  'Dropship（運輸船）': ['1000', '0', '2.0 m/s', '110', '100'],
  'Giant（巨人）': ['2000', '12（10 待確認）', '3.6 m/s', '150', '150'],
  'Light Bike（輕型摩托）': ['1200', '8（3 待確認）', '8.0 m/s', '160', '160'],
  'Radar Squad（搜尋者）': ['1300', '2（0 待確認）', '1.0 m/s', '60', '70'],
};
for (const row of unitRows) {
  const name = row.tds[0];
  if (expected[name]) {
    const got = row.tds.slice(1, 1 + expected[name].length);
    expected[name].forEach((v, i) => {
      if (got[i] !== v) errors.push(`${name}: field ${i + 1} expected "${v}" got "${got[i]}"`);
    });
  }
}

// Fire Eagle once, Dropship only in special
const fe = unitRows.filter((r) => r.tds[0].includes('Fire Eagle'));
if (fe.length !== 1) errors.push(`Fire Eagle rows: ${fe.length}`);
if (fe[0]?.section !== 'air') errors.push(`Fire Eagle section: ${fe[0]?.section}`);
const ds = unitRows.filter((r) => r.tds[0].includes('Dropship'));
if (ds.length !== 1) errors.push(`Dropship rows: ${ds.length}`);
if (ds[0]?.section !== 'special') errors.push(`Dropship section: ${ds[0]?.section}`);

// images
for (const m of html.matchAll(/<img[^>]+src="([^"]+)"/g)) {
  const p = path.join(root, m[1].replace(/^\.\//, ''));
  if (!fs.existsSync(p)) errors.push(`missing image: ${m[1]}`);
}

// ---------- output ----------
console.log(`sections: ${sectionIds.join(', ')}`);
console.log(`length: ${html.length}, lines: ${html.split('\n').length}`);
if (warn.length) console.log('WARN:\n' + warn.join('\n'));
if (errors.length) {
  console.log(`ERRORS (${errors.length}):\n` + errors.join('\n'));
  process.exit(1);
}
console.log('ALL CHECKS PASSED');
