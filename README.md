# TCR_Rise_Collection
這是給TC玩家的一個小收集處

# 指揮官狀態欄位（Commander Status）

依《戰術指揮官》（Tactical Commanders）Everzone #101 的
「指揮官屬性資訊（戰略, 政治, 知識, 技術）」章節，用原生 JavaScript
製作的即時狀態面板。

頁面可直接開啟，不需要安裝套件、不需要 build，也不需要啟動伺服器。
版面參考舊式 Designer 工具介面；數值與公式則以 #101 為準。

## 快速開始

直接開啟 [commander.html](commander.html) 即可。

也可以從 [index.html](index.html) 的「指揮官狀態」導覽進入。

若要用本機 HTTP 伺服器預覽：

```powershell
cd tc_units_zh
python -m http.server 8000
# 開啟 http://localhost:8000/commander.html
```

頁面使用傳統 `<script>` 載入，沒有 ES module 的 `file://` CORS 限制。

## 功能

- 戰略、政治、知識、技術四項指揮官屬性輸入
- 單位等級、基礎體力、基礎重量、貢獻度、回歸次數、對手政治輸入
- 即時計算並顯示：
  - 實戰體力
  - 科技等級
  - 升級指數
  - 單位重量（空間）
  - 持有單位數
  - 本國戰場人員數
  - 戰鬥投入單位數
  - 對手可見性
- 9 個示範單位模板，可直接改基礎數值
- 下方公式表同步顯示「公式／目前代入／結果」
- 一鍵重置、複製目前狀態 JSON

## 介面參考

![舊式 Designer 介面參考截圖](images/designer-reference.png)

此截圖僅供版面與欄位配置參考；圖中的單位數值不是本頁的計算資料。

## 檔案結構

```text
tc_units_zh/
├─ README.md                     # 本文件
├─ commander.html                # 指揮官狀態頁
├─ index.html                    # 單位資料庫首頁（已加入導覽）
├─ css/
│  └─ commander.css              # 面板樣式與響應式版面
├─ js/
│  ├─ commander-core.js          # 公式、輸入正規化、單位模板
│  ├─ commander-ui.js            # DOM 綁定與畫面更新
│  └─ commander-core.test.cjs    # Node.js 公式測試
└─ images/
   └─ designer-reference.png     # 版面參考截圖
```

## 公式來源

主要來源：

- [Everzone #101：戰術指揮官 單位規格](https://everzone.tistory.com/101)
  - 原文日期：2025-07-31
  - 目標章節：〈指揮官屬性資訊（戰略, 政治, 知識, 技術）〉
- 本地中文翻譯：
  [everzone/posts-zh/101-戰術指揮官-單位規格.md](../everzone/posts-zh/101-戰術指揮官-單位規格.md)
  - 翻譯：`qwen36-35b-a3b`
  - 結構審閱：`structural_pass`
- 韓文原文：
  [everzone/posts/101-택티컬-커맨더스-유닛-스펙.md](../everzone/posts/101-택티컬-커맨더스-유닛-스펙.md)

輔助參考：

- [Everzone #146：指揮官升級所需經驗值](https://everzone.tistory.com/146)
  （與指揮官養成相關，但目前頁面沒有使用經驗值公式。）
- [Everzone #101 單位表](https://everzone.tistory.com/101)
  （頁面內 9 個示範單位的基礎體力、基礎重量與分類來源。）

> #101 也註明部分價格、空間與重量資訊來自舊版資料；實際遊戲數值可能隨版本變動。

## 公式與實作

核心計算位於
[js/commander-core.js](js/commander-core.js)
的 `calculate()`。

| 狀態欄位 | #101 規則 | 本專案實作 |
| --- | --- | --- |
| 實戰體力 | 戰略 1 點使單位基礎體力 +3；貢獻 1 萬 = 生命值 +1% | `floor((baseHp + strategy * 3) * (1 + contribution / 100))` |
| 科技等級 | 單位等級 + 知識/3 + 技術/10 | `unitLevel + floor(knowledge / 3) + floor(technology / 10)` |
| 升級指數 | 單位等級 + 知識/3 | `unitLevel + floor(knowledge / 3)` |
| 單位重量（空間） | 基礎重量 × (1 + 技術/120) | `baseWeight * (1 + technology / 120)` |
| 持有單位數 | 基礎 24 + 政治/5，基礎上限 48；回歸 +2/次，最多 12 次 | `min(48, 24 + floor(politics / 5)) + returns * 2` |
| 本國戰場人員 | 基礎 10 + 領主戰略/8 | `10 + floor(strategy / 8)` |
| 戰鬥投入單位 | 基礎 6 + 戰略/20 | `6 + floor(strategy / 20)` |
| 對手可見性 | 對手政治 ≥ 我方政治 + 10 | 比較式回傳布林值 |
| 貢獻度 | 貢獻 1 萬 = 生命值 +1% | `contributionPct = contribution`（輸入單位為「萬」） |

### 取捨與假設

1. **整數除法**
   #101 沒有明講 `知識/3`、`技術/10` 等除法的小數處理方式。本頁採分項向下取整，
   因為遊戲中的等級與指數以整數顯示。若原始碼其實是先加總再取整，只需調整
   `calculate()` 內的 `Math.floor` 位置。

2. **貢獻加成順序**
   先加上「戰略 × 3」的體力，再套用貢獻百分比，最後向下取整。

3. **持有單位上限**
   將「最大 48 台」視為政治的基礎上限；回歸 12 次、每次 +2 另計，
   因此含回歸最高為 `48 + 24 = 72` 台。若你要把 48 當成總上限，
   請調整 `BASE_HOLDING_CAP`、`MAX_RETURNS`、`RETURN_UNITS` 三個常數。

4. **領主戰略**
   「本國戰場人員」原文採領主戰略。本頁只有一位指揮官，因此暫以目前指揮官的
   戰略代入；頁面下方有相同註記。

5. **重量與空間**
   #101 將重量與空間寫在同一個倍率公式中。頁面目前顯示「重量」，
   但同一倍率可直接套用到空間。

6. **單位資料範圍**
   頁面只內建 9 個示範單位，並非完整單位資料庫；完整清單請見 #101。

## 測試

不需要安裝任何測試套件：

```powershell
cd tc_units_zh
node js/commander-core.test.cjs
```

目前包含 9 項測試，涵蓋：

- 預設值
- 戰略對體力的加成
- 貢獻度百分比
- 知識／技術的整數除法
- 政治換算與持有上限
- 回歸次數
- 戰場人員與投入單位
- 對手可見性門檻
- 輸入範圍正規化

預設狀態的畫面輸出為：

- 實戰體力：1,290
- 單位重量：87.5 kg
- 科技等級：11
- 升級指數：9
- 持有單位：30 台
- 公式列：8 列

## 核心 API

`commander-core.js` 同時支援瀏覽器與 Node.js。

瀏覽器：

```js
const result = CommanderCore.calculate({
  strategy: 30,
  politics: 33,
  knowledge: 22,
  technology: 20,
  unitLevel: 2,
  baseHp: 1200,
  baseWeight: 75,
  contribution: 0,
  returns: 0,
  opponentPolitics: 30,
});

console.log(result.hp.effective);     // 1290
console.log(result.tech.level);       // 11
console.log(result.weight.effective); // 87.5
```

Node.js：

```js
const { calculate } = require('./js/commander-core.js');
const result = calculate({ strategy: 30, politics: 33 });
```

## 製作資訊

- 協助工具：DeepSeek Harness AI 編碼代理
- 平台標示：DeepSeek V4.1（使用者標示）
- 本會話模型識別：`deepseek-flash`
- 整理日期：2026-10-23

> 平台版本名稱與內部路由模型識別可能不同；本文件如實記錄兩者，實際版本以平台顯示為準。

### Token 用量快照

統計時間：2026-10-23 21:21（Asia/Taipei）  
統計範圍：建立 `commander.html` 與本 README 的兩個工作回合，包含工具呼叫與中介步驟。

| 工作回合 | API 呼叫 | 非快取輸入 | 輸出 | 快取讀取 | 合計 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 頁面實作 | 61 | 41,314 | 78,039 | 4,915,968 | 5,035,321 |
| README | 9 | 4,585 | 8,640 | 1,136,128 | 1,149,353 |
| **合計** | **70** | **45,899** | **86,679** | **6,052,096** | **6,184,674** |

> 上表是 provider 回報的 token 計數加總，包含每次模型呼叫重讀的系統提示、工具定義與快取上下文；
> 不等同文章字數。實際費用需依快取命中與平台單價計算，請以帳單為準。
> 此快照不包含後續對話（包含新增這段說明本身）。

## 資料與授權

- 遊戲名稱、單位資料與原文內容版權屬原遊戲與 Everzone 作者所有。
- 本目錄的程式碼是依據上述公開資料整理的中文版本，供個人研究與遊玩參考。
- 若數值與遊戲內實際顯示不同，以遊戲版本與原始文章為準。
