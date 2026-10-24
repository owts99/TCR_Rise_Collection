import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8090/v1';
const MODEL = 'Spark-X2.5-4B';
const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

const cats = {
  infantry: {
    title: '步兵系',
    rows: [
      ['Humanoid（戰猿）', 'humanoid', '1400', '0', '2.4 m/s', '70', '70', '-', '隱形、安瓿、懸浮、間諜（偽裝）、電擊（電路障礙）、代謝強化、電擊-II'],
      ['Bazonoid（巴茲尼德）', 'bazonoid', '2000', '10', '2.6 m/s', '80', '90', 'Humanoid 47', '隱形、安瓿、懸浮'],
      ['Railgunner（榴彈兵）', 'railgunner', '1800', '1', '3.0 m/s', '80', '80', 'Humanoid 47', '隱形、安瓿、懸浮、手榴彈、EMP手榴彈、EMP刀刃、M1手榴彈、EMP黏土、M20手榴彈、M24手榴彈、M60手榴彈'],
      ['GTA Rocket Launcher（GTA 火箭筒）', 'gta', '1300', '5', '1.6 m/s', '90', '90', '-', '隱形、安瓿、懸浮、掃蕩觀測器、掃蕩觀測器-II、I.C.B.M.、A.C.M.、A.S.M.P.、A.L.C.M.'],
      ['Shark（虎鯊）', 'shark', '1650', '8', '2.2 m/s', '90', '100', 'GTA 50', '隱形、安瓿、懸浮、地毯浮游、PATRIOT'],
      ['Goliath（哥利亞）', 'goliath', '1600', '8', '3.3 m/s', '100', '100', 'GTA 50', '隱形、安瓿、懸浮、奴役-I、奴役-II、星柱'],
      ['Twin Vulcan（雙管巴爾幹）', 'twin_vulcan', '1600', '0', '4.0 m/s', '80', '80', '-', '隱形、安瓿、懸浮、EMP槍、EMP波、EMP鉛槍'],
      ['Exonoid（艾克斯諾）', 'exonoid', '2000', '5', '3.2 m/s', '90', '100', 'Twin Vulcan 40', '隱形、安瓿、懸浮'],
      ['Tilanoid（鈦拉諾）', 'tilanoid', '2000', '10', '1.4 m/s', '90', '110', 'Twin Vulcan 40', '安瓿、懸浮、機械強化、巨大傳送、量子時鐘、輝光推進器、巨大傳送-II'],
      ['Giant（巨人）', 'giant', '2000', '12（10 待確認）', '3.6 m/s', '150', '150', '-', '重型隱形、速度推進器、偽裝潛伏、地震、地震火焰、火焰地震'],
      ['Blader（刀鋒者）', 'blader', '1600', '8', '7.5 m/s', '90', '90', 'Giant 45', '隱形、安瓿、懸浮'],
      ['Phantom（魅影）', 'phantom', '1050', '0', '4.8 m/s', '70', '70', '-', '隱形、安瓿、懸浮、星殼、叮噹星殼、月神殼、彗星殼'],
      ['Sniper（狙擊手）', 'sniper', '600', '0', '3.0 m/s', '75', '75', 'Phantom 45', '時鐘-EF、狙擊模式'],
    ],
  },
  mech: {
    title: '機械系',
    rows: [
      ['Light Cannon Tank（輕炮車）', 'light_cannon', '1950', '10', '3.0 m/s', '160', '200', '-', '隱形、手榴彈、資源貨櫃'],
      ['Medium Tank（中戰車）', 'medium_tank', '2400', '20', '1.6 m/s', '240', '300', 'Light Cannon 30', '能源轉移、終極屏障、資源貨櫃'],
      ['Heavy Tank（重戰車）', 'heavy_tank', '2900', '30', '1.4 m/s', '260', '320', 'Light Cannon 30', '重型能源轉移'],
      ['Light Bike（輕型摩托）', 'light_bike', '1200', '8（3 待確認）', '8.0 m/s', '160', '160', '-', '能源轉移、輕型加速器（9.2 m/s）、阿爾法加速器、資源貨櫃'],
      ['Hover Raid（懸浮突擊車）', 'hover_raid', '1200', '0', '6.8 m/s', '160', '160', 'Light Bike 45', '能源轉移、時鐘拳'],
      ['Artillery（自走砲）', 'artillery', '1300', '1', '1.0 m/s', '160', '180', '-', '野砲模式'],
      ['Thor（索爾）', 'thor', '1300', '1', '1.0 m/s', '160', '160', 'Artillery 45', '野砲模式'],
      ['Duke（公爵）', 'duke', '1600', '5', '2.8 m/s', '160', '180', '-', '能源轉移、資源貨櫃、觀測器'],
      ['Spooky Duke（幽靈公爵）', 'spooky_duke', '1500', '3', '6.9 m/s', '160', '180', 'Duke 45', '能源轉移、資源貨櫃、觀測器'],
    ],
  },
  air: {
    title: '飛行系',
    rows: [
      ['Zanak（占薩克）', 'zanak', '1000', '1', '5.4 m/s', '90', '100', '-', '推進器、地毯轟炸類'],
      ['Exorion（艾洛比）', 'exorion', '950', '0', '11.0 m/s', '90', '100', '-', '中子推進器、五重推進器'],
      ['Elombre（雷霆弩）', 'elombre', '1000', '1', '4.5 m/s', '90', '100', 'Zanak 45', '推進器'],
      ['Aerofighter（空戰機）', 'aerofighter', '1300', '2', '5.4 m/s', '90', '100', 'Exorion 35', '推進器、雙重觀測器（視野擴張）'],
      ['Fire Eagle（火之鷹）', 'fire_eagle', '1000', '0', '7.7 m/s', '90', '100', 'Exorion 35', '無'],
      ['Orion（獵戶座）', 'orion', '1050', '1', '6.0 m/s', '90', '120', '-', '推進器、隱身類'],
      ['Executor（處刑者）', 'executor', '1700', '20', '3.0 m/s', '100', '130', 'Orion 40', '量子火焰、神經量子火焰'],
      ['Felious（支援者）', 'felious', '1000', '1', '3.0 m/s', '90', '100', '-', '空中地雷'],
      ['Jest（熱忱）', 'jest', '2350', '6', '6.0 m/s', '-', '-', '-', '翼（推進器）-I、翼-II、暗影（隱身）-I、暗影-II'],
    ],
  },
  special: {
    title: '特殊系',
    rows: [
      ['Medic（醫療兵）', 'medic', '1150', '1', '2.8 m/s', '60', '70', '-', '治療（200）、治療-II（300）、精神錯亂'],
      ['Repairer（修理者）', 'repairer', '1100', '2', '2.2 m/s', '90', '100', '-', '修理（200）、修理-II（300）、推進器'],
      ['Heal Generator（野戰醫院）', 'heal_generator', '1300', '4', '2.2 m/s', '240', '300', 'Repairer 或 Medic 45', '恢復模式（場域生成 80 起）'],
      ['Dropship（運輸船）', 'dropship', '1000', '0', '2.0 m/s', '110', '100', '-', '運輸、傳送、傳送-II、推進器、推進器-II'],
      ['Bomb Squad（地雷兵）', 'bomb_squad', '1300', '2', '2.0 m/s', '60', '70', '-', '埋設地雷、自爆、炸藥'],
      ['Ranger（生化兵）', 'ranger', '1500', '8', '4.8 m/s', '160', '180', 'Bomb Squad 40', '體力下降、強制敵方自爆'],
      ['Radar Squad（搜尋者）', 'radar_squad', '1300', '2（0 待確認）', '1.0 m/s', '60', '70', '-', '雷達、自爆、雷達干擾器、探測'],
      ['Sweeper（清除兵）', 'sweeper', '1500', '1', '4.5 m/s', '90', '100', '-', '隱形偵測、偽裝、迷彩、多瑪、防護幕類'],
      ['Eclipse（日蝕）', 'eclipse', '1500', '5', '3.0 m/s', '120', '150', '-', '單位移動（2 道閘門）、護盾類、傳送類'],
      ['Bunkernoid（碉堡車）', 'bunkernoid', '2000', '12', '3.2 m/s', '240', '300', '-', '碉堡模式（碉堡功能強化類）'],
    ],
  },
};

function clean(text) {
  return text
    .replace(/^\s*```(?:html)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

async function chat(prompt, maxTokens = 6000) {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: '你是資深前端工程師，只輸出被要求的 HTML 片段。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    max_tokens: maxTokens,
    stream: false,
  };
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  return { text: j.choices?.[0]?.message?.content ?? '', usage: j.usage ?? {} };
}

function promptFor(cat) {
  return `你是資深前端工程師。請把以下 ${cat.rows.length} 筆${cat.title}單位資料轉成 HTML 表格列。

嚴格規則：
- 只輸出 <tr>...</tr>，共 ${cat.rows.length} 列，不要 <table>、不要表頭、不要 markdown、不要說明。
- 每列只能有 8 個 <td>，順序：單位、基礎HP、裝甲、速度、空間、重量、升級來源、特殊能力。
- 第 1 欄格式：<a href="units/頁面.html">English（中文）</a>。
- 頁面代碼只用在連結，絕對不要變成第 9 欄。
- 數值與文字照抄，不要改寫、不要加單位、不要省略任何一列。

資料格式：單位|頁面|HP|裝甲|速度|空間|重量|升級來源|特殊能力
${cat.rows.map((r) => r.join('|')).join('\n')}`;
}

for (const [key, cat] of Object.entries(cats)) {
  let out = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { text, usage } = await chat(promptFor(cat));
    out = clean(text);
    const trs = (out.match(/<tr>/g) || []).length;
    const bad = out.split('\n').filter((l) => l.includes('<tr>') && (l.match(/<td>/g) || []).length !== 8).length;
    console.log(`${key} attempt ${attempt}: rows=${trs}/${cat.rows.length}, badRows=${bad}, tok=${usage.prompt_tokens}/${usage.completion_tokens}`);
    if (trs === cat.rows.length && bad === 0) break;
  }
  fs.writeFileSync(path.join(DIR, `table_${key}.html`), out + '\n', 'utf8');
}
