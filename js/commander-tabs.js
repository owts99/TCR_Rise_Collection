/* 工作區頁簽：公式明細 / 展示台
 * 使用 ARIA tabs 模式；支援鍵盤、深連結、列印全開與展示台換圖。
 */
(function () {
  'use strict';

  const tablist = document.querySelector('[data-tabs]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panes = new Map(
    tabs.map((tab) => [tab.id, document.getElementById(tab.getAttribute('aria-controls'))]),
  );
  const STORAGE_KEY = 'tc-commander-active-tab';
  let active = tabs[0];

  function activate(tab, options = {}) {
    if (!tab) return;
    const { focus = false, persist = true } = options;
    active = tab;

    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;

      const pane = panes.get(item.id);
      if (!pane) continue;
      pane.hidden = !selected;
      if (selected) {
        pane.classList.remove('is-entering');
        void pane.offsetWidth; // 重新觸發進場動畫
        pane.classList.add('is-entering');
      }
    }

    if (focus) tab.focus();

    if (!persist) return;

    try {
      localStorage.setItem(STORAGE_KEY, tab.id);
    } catch {
      /* file:// 或隱私模式可能不允許 */
    }

    try {
      if (location.hash !== `#${tab.id}`) {
        history.replaceState(null, '', `#${tab.id}`);
      }
    } catch {
      // 部分瀏覽器不允許對 file:// 改寫歷史，退回直接設定 hash
      try {
        if (location.hash !== `#${tab.id}`) location.hash = tab.id;
      } catch {
        /* 忽略：深連結仍可直接在網址列輸入 */
      }
    }
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab && tabs.includes(tab)) activate(tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;

    let next = null;
    if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
    else if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
    else if (event.key === 'Home') next = tabs[0];
    else if (event.key === 'End') next = tabs[tabs.length - 1];
    if (!next) return;

    event.preventDefault();
    activate(next, { focus: true });
  });

  // 初始頁簽：網址 hash → 上次選擇 → 第一頁
  const hashTab = tabs.find((tab) => `#${tab.id}` === location.hash);
  let storedTab = null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    storedTab = tabs.find((tab) => tab.id === stored) ?? null;
  } catch {
    storedTab = null;
  }
  activate(hashTab || storedTab || tabs[0], { persist: false });

  // 列印時全部展開，印完回到原本頁簽
  window.addEventListener('beforeprint', () => {
    for (const pane of panes.values()) pane.hidden = false;
  });
  window.addEventListener('afterprint', () => activate(active, { persist: false }));

  // 展示台：本機換圖（不寫入檔案，只換畫面預覽）
  const fileInput = document.querySelector('#showcase-file');
  const image = document.querySelector('#showcase-image');
  if (fileInput && image) {
    let objectUrl = null;
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      image.alt = file.name;
    });
  }

  // 展示台：滑鼠視差
  const stage = document.querySelector('[data-doll-stage]');
  const reduceMotion =
    typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : { matches: false };
  if (stage && !reduceMotion.matches) {
    stage.addEventListener('pointermove', (event) => {
      const rect = stage.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      stage.style.setProperty('--look-x', x.toFixed(3));
      stage.style.setProperty('--look-y', y.toFixed(3));
    });
    stage.addEventListener('pointerleave', () => {
      stage.style.setProperty('--look-x', '0');
      stage.style.setProperty('--look-y', '0');
    });
  }
})();
