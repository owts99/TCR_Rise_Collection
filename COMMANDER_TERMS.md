# 指揮官頁術語對照

依 Designer 參考圖、遊戲內「指揮官資訊」、以及單位資料庫慣用分類整理。  
對應頁面：[commander.html](commander.html)｜參考圖：[images/designer-reference.png](images/designer-reference.png)

## 1. 兵種等級 ≠ 能力

| 概念 | 含義 | 本頁欄位 |
|------|------|----------|
| **兵種等級** | 四系各自的等級；之後會接**職級** | `infantry` `mech` `air` `special` |
| **能力** | 可分配點數加到的四項 | `strategy` `politics` `knowledge` `technology` |
| **點數** | 可分配池（遊戲「點數」） | `availablePoints`（畫面「未使用點數」） |

Designer 的 **Total** 只加總右欄四能力，**不含**左欄四系等級。

## 2. 四系對照

| 中文（本頁） | Designer EN | 遊戲 UI（常見） | 欄位 id |
|--------------|-------------|-----------------|---------|
| 步兵 | Infantry | 步兵 | `infantry` |
| 機械 | **Mobile** | 坦克 | `mech` |
| 飛行 | Aviation | 飛行 | `air` |
| 特殊 | **Organic** | 特殊 | `special` |

資料庫慣用「系」涵蓋（單位表，非完整名單）：

- **步兵系**：含醫護兵、地雷兵、生化兵等  
- **機械系**：車輛／機械線（遊戲分頁常寫坦克）  
- **飛行系**：含支援者、空中判官等  
- **特殊系**：含嘲弄者等  

## 3. 點數連動

- **單一來源**：`unusedPoints` 就是唯一可分配池；畫面「未使用點數」直接顯示它，扣款也用同一個數  
- 兵種等級 **+1** → `additionPoints +1`，並在同一次操作把這 1 點**轉入** `unusedPoints`（之後才點得到能力）  
- 兵種等級 **−1** → 從 `unusedPoints` **收回** 1 點；若點數已花在能力上（未使用為 0），要先退回能力點數才能降級  
- `additionPoints = 四系等級加總 − 4`（每系最低 1），僅作為「追加點數」的統計顯示  
- `availablePoints ≡ unusedPoints`（保留舊名稱供畫面／payload 相容）  
- `workforcePoints`（全部點數）= `unusedPoints` + 四項能力 = 40 + `additionPoints`  

## 4. 三層勿混（坦克／機械最容易混）

| 層級 | 例子 | 用途 |
|------|------|------|
| 兵種等級（指揮官） | Infantry / Mobile / Aviation / Organic | 升級灌點、職級 |
| 單位資料庫「系」 | 步兵系、機械系、飛行系、特殊系 | 單位分類；本頁中文用「機械」 |
| 單位體質 | Biological / Mechanical（Type） | **主要區分 EMP**；與系別正交 |

另外：

- **Mech Apt**＝技術「能力」  
- **Mobile**＝機械「兵種等級」  
- 兩者都有 Mech／機械字樣，不是同一欄  

## 5. 本頁刻意不做（之後再說）

- 職級、經驗條、軍階  
- 生物／機械體質與 EMP 邏輯  
- 裝甲色、電池符號（○△◇▽）圖例  

## 6. UI 約定

- 區塊標題用 **兵種等級**、**能力點數**（勿再寫「兵種能力」）  
- 四系 label 前可放小 icon（對齊社群工具／Designer 左欄小圖）  
- 有遊戲原版小圖時可放到 `images/troop-icons/` 再替換 SVG  
