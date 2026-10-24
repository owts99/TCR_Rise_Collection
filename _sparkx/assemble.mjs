import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('tc_units_zh');
const spark = path.join(root, '_sparkx');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const nameToPage = {
  'Humanoid（戰猿）': 'humanoid',
  'Bazonoid（巴茲尼德）': 'bazonoid',
  'Railgunner（榴彈兵）': 'railgunner',
  'GTA Rocket Launcher': 'gta',
  'Shark（虎鯊）': 'shark',
  'Goliath（哥利亞）': 'goliath',
  'Twin Vulcan（雙管巴爾幹）': 'twin_vulcan',
  'Exonoid（艾克斯諾）': 'exonoid',
  'Tilanoid（鈦拉諾）': 'tilanoid',
  'Giant（巨人）': 'giant',
  'Blader（刀鋒者）': 'blader',
  'Phantom（魅影）': 'phantom',
  'Sniper（狙擊手）': 'sniper',
  'Light Cannon Tank（輕炮車）': 'light_cannon',
  'Medium Tank（中戰車）': 'medium_tank',
  'Heavy Tank（重戰車）': 'heavy_tank',
  'Light Bike（輕型摩托）': 'light_bike',
  'Hover Raid（戰艦控甲者）': 'hover_raid',
  'Artillery（自走砲）': 'artillery',
  'Thor（突岩）': 'thor',
  'Duke（公爵）': 'duke',
  'Spooky Duke（幽靈公爵）': 'spooky_duke',
  'Zanak（占薩克）': 'zanak',
  'Exorion（艾洛比）': 'exorion',
  'Elombre（雷霆弩）': 'elombre',
  'Aerofighter（空戰機）': 'aerofighter',
  'Fire Eagle（火之鷹）': 'fire_eagle',
  'Orion（獵戶座）': 'orion',
  'Executor（處刑者）': 'executor',
  'Felious（支援者）': 'felious',
  'Jest（熱忱）': 'jest',
  'Medic（醫療兵）': 'medic',
  'Repairer（修理者）': 'repairer',
  'Heal Generator（野戰醫院）': 'heal_generator',
  'Dropship（運輸船）': 'dropship',
  'Bomb Squad（地雷兵）': 'bomb_squad',
  'Ranger（生化兵）': 'ranger',
  'Radar Squad（搜尋者）': 'radar_squad',
  'Sweeper（清除兵）': 'sweeper',
  'Eclipse（日蝕）': 'eclipse',
  'Bunkernoid（碉堡車）': 'bunkernoid',
};

function fixLinks(html, cat) {
  const fixed = html.replace(/<a href="units\/[^"]+\.html">([^<]+)<\/a>/g, (m, label) => {
    const page = nameToPage[label];
    if (!page) throw new Error(`${cat}: unknown unit label ${label}`);
    return `<a href="units/${page}.html">${label}</a>`;
  });
  return fixed.trim();
}

const tables = {};
for (const cat of ['infantry', 'mech', 'air', 'special']) {
  tables[cat] = fixLinks(fs.readFileSync(path.join(spark, `table_${cat}.html`), 'utf8'), cat);
}

function section(id, title, img, body) {
  return `<div class="section" id="${id}">
  <h2>${title}</h2>
  <img src="./images/${img}_grid.png" alt="${title}單位圖" class="grid-img">
  <table>
    <tr><th>單位</th><th>基礎HP</th><th>裝甲</th><th>速度</th><th>空間</th><th>重量</th><th>升級來源</th><th>特殊能力</th></tr>
${body}
  </table>`;
}

const sections = [];

sections.push(`${section('infantry', '步兵系', 'infantry', tables.infantry)}
  <div class="note">
    <strong>能力欄位已依 101 原表補回：</strong>Humanoid 的間諜、電擊、代謝強化與電擊-II，以及 Railgunner 的全套手榴彈／EMP 系列，原本在 <code>index.html</code> 被「等」省略。
  </div>
</div>`);

sections.push(`${section('mech', '機械系', 'mech', tables.mech)}
  <div class="note">
    <strong>Light Cannon Tank 重點：</strong>速度偏慢是硬傷（3.0 m/s，升級後約 3.6）。核心裝備為<strong>能源轉移</strong>（技術等級 28，能量消耗 85）：幫全隊單位補滿能量（1:1），自己不補。
  </div>
</div>`);

sections.push(`${section('air', '飛行系', 'air', tables.air)}
  <div class="note">
    <strong>本版新增 Fire Eagle（火之鷹）：</strong>基礎 1000 HP、0 裝甲、7.7 m/s，由 Exorion 以 35 點升級取得，特殊能力為「無」。<br>
    同時把 Dropship 移回特殊系，並補回 Orion 的裝甲 1／速度 6.0、Executor 的裝甲 20 與升級來源 Orion 40、Felious 的裝甲 1／速度 3.0，以及 Jest 的裝甲 6／速度 6.0 與四項翼／暗影能力。
  </div>
</div>`);

sections.push(`${section('special', '特殊系', 'special', tables.special)}
  <div class="note">
    <strong>本版把 Dropship 移回特殊系：</strong>裝甲 0、速度 2.0 m/s，能力為運輸、傳送、傳送-II、推進器、推進器-II。
  </div>
</div>`);

sections.push(`<div class="section" id="items">
  <h2>特殊道具資訊</h2>
  <p>特殊道具裝備欄分成兩格：<strong>共通道具</strong>（部分單位例外）與<strong>單位專屬道具</strong>各 1 格。</p>
  <div class="note">
    <strong>舒梅行星（슈메이커 레비）可購買：</strong>終極屏障-II、星柱（奴役-III）、E-可攜（能源轉移-II）、黑暗隱身（隱身-III）。<br>
    觀測器類道具會延長視野距離，並把方向性感測器變成全向感測。
  </div>

  <h3>步兵系共通特殊道具</h3>
  <ul class="item-list">
    <li>MCD 安瓿</li>
    <li>UCD 安瓿</li>
    <li>懸浮（Levitate）</li>
    <li>隱形裝置（Cloaking Device）</li>
    <li>微型治療（Micro Heal）</li>
    <li>定時器（Timing Fill）</li>
  </ul>

  <h3>車輛系共通特殊道具</h3>
  <ul class="item-list">
    <li>資源貨櫃（Resource Cargo）</li>
    <li>大型資源貨櫃（Large Resource Cargo）</li>
    <li>能源轉移（Energy Transfer）</li>
    <li>萃取貨櫃（Extract Cargo）</li>
    <li>E-可攜（E-Portable）</li>
  </ul>

  <h3>單位專屬特殊道具</h3>
  <table class="compact">
    <tr><th>單位</th><th>專屬道具</th></tr>
    <tr><td>Humanoid</td><td>間諜（Spion）、電擊（Electric Shock）、代謝強化（Metabolic Booster）、電擊-II</td></tr>
    <tr><td>Railgunner</td><td>手榴彈、EMP 手榴彈、EMP 刀刃、M1 手榴彈、EMP 黏土、M20 手榴彈、M24 手榴彈、M60 手榴彈</td></tr>
    <tr><td>Phantom</td><td>星殼、叮噹星殼、月神殼、彗星殼</td></tr>
    <tr><td>Sniper</td><td>時鐘-EF</td></tr>
    <tr><td>Twin Vulcan</td><td>EMP 槍、EMP 波、EMP 鉛槍</td></tr>
    <tr><td>Tilanoid</td><td>機械強化、巨大傳送、量子時鐘、輝光推進器、巨大傳送-II</td></tr>
    <tr><td>Giant</td><td>重型隱形、偽裝潛伏、地震、速度推進器、地震火焰、火焰地震</td></tr>
    <tr><td>GTA Rocket Launcher</td><td>掃蕩觀測器、掃蕩觀測器-II、I.C.B.M.、A.C.M.、A.S.M.P.、A.L.C.M.</td></tr>
    <tr><td>Shark</td><td>地毯浮游、PATRIOT</td></tr>
    <tr><td>Goliath</td><td>奴役-I、奴役-II、星柱</td></tr>
    <tr><td>Light Bike</td><td>輕型加速器、阿爾法加速器</td></tr>
    <tr><td>Hover Raid</td><td>時鐘拳</td></tr>
  </table>
</div>`);

sections.push(`<div class="section" id="prices">
  <h2>價格與資源（舊版資料）</h2>
  <p>以下價格與資源需求來自舊版資料，僅供參考；實際數值請以遊戲內為準。</p>
  <table class="compact">
    <tr><th>分類</th><th>單位</th><th>價格</th></tr>
    <tr><td>步兵系</td><td>Humanoid</td><td>4,000</td></tr>
    <tr><td>步兵系</td><td>Railgunner</td><td>3,500</td></tr>
    <tr><td>步兵系</td><td>GTA Rocket Launcher</td><td>2,000</td></tr>
    <tr><td>步兵系</td><td>Shark</td><td>9,000</td></tr>
    <tr><td>步兵系</td><td>Tilanoid</td><td>9,000</td></tr>
    <tr><td>車輛系</td><td>Light Cannon Tank</td><td>5,000</td></tr>
    <tr><td>車輛系</td><td>Medium Tank</td><td>10,000</td></tr>
    <tr><td>車輛系</td><td>Light Bike</td><td>6,000</td></tr>
    <tr><td>車輛系</td><td>Duke</td><td>9,000</td></tr>
    <tr><td>飛行系</td><td>Exorion</td><td>10,000</td></tr>
    <tr><td>特殊系</td><td>Dropship</td><td>9,000</td></tr>
    <tr><td>特殊系</td><td>Bomb Squad</td><td>4,000</td></tr>
    <tr><td>特殊系</td><td>Radar Squad</td><td>6,000</td></tr>
    <tr><td>特殊系</td><td>Repairer</td><td>5,000</td></tr>
  </table>
  <ul>
    <li>所有單位都需要鐵礦石、矽、鈾、硫各 20。</li>
    <li>沒有標價的單位只能透過升級取得；舊版可直接購買 Railgunner。</li>
  </ul>
</div>`);

sections.push(`<div class="section" id="commander">
  <h2>指揮官能力值</h2>
  <p>以下公式來自 101 原表的「커맨더 스탯 정보」段落，數值以遊戲實際版本為準。</p>
  <table class="compact">
    <tr><th>項目</th><th>公式／效果</th></tr>
    <tr><td>戰略</td><td>每 1 點讓單位基礎 HP +3</td></tr>
    <tr><td>科技等級</td><td>單位等級 + 知識/3 + 技術/10</td></tr>
    <tr><td>升級指數</td><td>單位等級 + 知識/3</td></tr>
    <tr><td>單位重量（空間）</td><td>基礎重量（空間）×（1 + 技術/120）</td></tr>
    <tr><td>持有單位數</td><td>24 台 + 政治/5（上限 48 台；回歸時每次 +2，最多 12 次）</td></tr>
    <tr><td>本國戰場人數</td><td>10 人 +（房主戰略/8）</td></tr>
    <tr><td>出戰單位數</td><td>6 台 +（戰略/20）</td></tr>
    <tr><td>政治壓制</td><td>比對方政治高 10 以上時，可看見戰爭中的敵方單位</td></tr>
    <tr><td>貢獻度</td><td>每 1 萬貢獻度 = HP +1%</td></tr>
  </table>
  <p>升級所需經驗值另見 <a href="https://everzone.tistory.com/146">146 號文章</a>。</p>
</div>`);

sections.push(`<div class="section" id="notes">
  <h2>補充說明</h2>
  <div class="note">
    <ul>
      <li>資料主要整理自 <a href="https://everzone.tistory.com/m/101" style="color:#4a90d9">Ever☆Zone Tistory</a> 單位規格頁（文章 101）。</li>
      <li>單位圖示取自使用者提供的本地 TC 資料庫截圖。</li>
      <li>EMP 相關裝備主要集中在步兵系的 Twin Vulcan（雙管巴爾幹）與 Railgunner（榴彈兵）。</li>
      <li>機械系的核心支援裝備為「能源轉移」，而非 EMP。</li>
      <li>後期主流為數量流（同時在場 8～12 隻）與極端屬性相剋，中等彈性單位使用率較低。</li>
      <li><strong>本版校正：</strong>新增 Fire Eagle；Dropship 移回特殊系；補回 Executor 裝甲 20／Orion 40；修正 Medic、Repairer、Bomb Squad、Eclipse、Sweeper、Orion、Felious、Jest、Dropship 的裝甲或速度；修正 Orion 與 Jest 的能力欄；補回特殊道具、價格、指揮官公式等章節。</li>
      <li>Giant、Light Bike、Radar Squad 的裝甲在原表有兩個數值並標註「확인」，本版保留為「主要值（另一值待確認）」，不擅自刪除。</li>
    </ul>
  </div>
  <h3>視野與射程</h3>
  <p>實際視野 = 單位基礎視野 + 感測器範圍（+ 特殊道具）；武器射程的套用上限受實際視野限制。</p>
  <h3>怪物單位</h3>
  <p><a href="https://everzone.tistory.com/147">몬스터 유닛 스펙（怪物單位規格）</a></p>
</div>`);

// head: keep everything before the first unit section, but add the new nav + a little CSS.
let head = index.slice(0, index.indexOf('<div class="section" id="infantry">'));
const oldNav = /<div class="nav">[\s\S]*?<\/div>/;
head = head.replace(oldNav, `<div class="nav">
  <a href="#infantry">步兵系</a>
  <a href="#mech">機械系</a>
  <a href="#air">飛行系</a>
  <a href="#special">特殊系</a>
  <a href="#items">特殊道具</a>
  <a href="#prices">價格/資源</a>
  <a href="#commander">指揮官</a>
  <a href="#notes">補充說明</a>
</div>`);
head = head.replace('</style>', `h3 { color: #8ab4e8; margin-top: 24px; }
.item-list { columns: 2; column-gap: 32px; }
.item-list li { break-inside: avoid; margin: 4px 0; }
table.compact td:first-child { white-space: nowrap; }
@media (max-width: 720px) { .item-list { columns: 1; } table.compact td:first-child { white-space: normal; } }
</style>`);
head = head.replace('<p>繁體中文整理版（資料來源：Ever☆Zone Tistory）</p>', '<p>繁體中文整理版（資料來源：Ever☆Zone Tistory）｜Spark-X2.5-4B 表格協作</p>');

const footer = index.slice(index.indexOf('<footer>'));
const out = head + sections.join('\n\n') + '\n\n' + footer;

fs.writeFileSync(path.join(root, 'tc_units_zh_sparkx.html'), out, 'utf8');
console.log(`wrote tc_units_zh_sparkx.html: ${out.length} chars, ${out.split('\n').length} lines`);
