document.addEventListener('DOMContentLoaded', () => {
  // 1. Accessible Tabs (ARIA role="tablist" + Arrow key navigation)
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

  function activateTab(selectedTab) {
    tabs.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    panels.forEach((panel) => {
      panel.hidden = panel.id !== selectedTab.getAttribute('aria-controls');
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      let nextIndex = null;
      if (e.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
      if (e.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
      if (nextIndex !== null) {
        e.preventDefault();
        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      }
    });
  });

  // 2. Theme Toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  const root = document.documentElement;
  themeBtn.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', nextTheme);
    themeBtn.setAttribute('aria-pressed', String(nextTheme === 'dark'));
  });

  // 3. Native <dialog> Classroom Timer
  const timerDialog = document.getElementById('timer-dialog');
  const openTimerBtn = document.getElementById('open-timer-btn');
  const closeTimerBtn = document.getElementById('close-timer-btn');
  const timerDisplay = document.getElementById('timer-display');
  const startBtn = document.getElementById('timer-start-btn');
  const resetBtn = document.getElementById('timer-reset-btn');
  const presetBtns = document.querySelectorAll('.preset-btn');

  let defaultSeconds = 600;
  let remainingSeconds = defaultSeconds;
  let timerId = null;

  function renderTime() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    startBtn.textContent = '開始計時';
  }

  openTimerBtn.addEventListener('click', () => timerDialog.showModal());
  closeTimerBtn.addEventListener('click', () => timerDialog.close());

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stopTimer();
      defaultSeconds = Number(btn.dataset.seconds);
      remainingSeconds = defaultSeconds;
      renderTime();
    });
  });

  startBtn.addEventListener('click', () => {
    if (timerId !== null) {
      stopTimer();
      return;
    }
    startBtn.textContent = '暫停';
    timerId = setInterval(() => {
      if (remainingSeconds > 0) {
        remainingSeconds -= 1;
        renderTime();
      } else {
        stopTimer();
        timerDisplay.textContent = '00:00 ⏰';
      }
    }, 1000);
  });

  resetBtn.addEventListener('click', () => {
    stopTimer();
    remainingSeconds = defaultSeconds;
    renderTime();
  });

  // 4. Multilingual Filter & Print
  const langChips = document.querySelectorAll('.chip[data-lang]');
  const safetyTable = document.getElementById('safety-table');
  const langCols = ['vi', 'id', 'my'];

  langChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      langChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const selected = chip.dataset.lang;

      langCols.forEach((lang) => {
        const cells = safetyTable.querySelectorAll(`.col-${lang}`);
        const shouldHide = selected !== 'all' && selected !== lang;
        cells.forEach((cell) => cell.classList.toggle('is-hidden-col', shouldHide));
      });
    });
  });

  document.getElementById('print-cards-btn').addEventListener('click', () => window.print());

  // 5. Week 2 Flight Algorithm & Debug Simulator
  const fwdInput = document.getElementById('fwd-sec');
  const driftInput = document.getElementById('drift-deg');
  const fixCheckbox = document.getElementById('enable-fix');
  const fwdVal = document.getElementById('fwd-sec-val');
  const driftVal = document.getElementById('drift-deg-val');
  const idealPathEl = document.getElementById('ideal-path');
  const actualPathEl = document.getElementById('actual-path');
  const endDot = document.getElementById('end-dot');
  const simStatus = document.getElementById('sim-status');

  function updateSimulator() {
    const sec = Number(fwdInput.value);
    const drift = Number(driftInput.value);
    const isFixed = fixCheckbox.checked;

    fwdVal.textContent = `${sec.toFixed(1)}s`;
    driftVal.textContent = `${drift}°`;

    const sideLen = sec * 38;
    const startX = 80;
    const startY = 180;

    // Ideal square path
    const ix1 = startX;
    const iy1 = startY - sideLen;
    const ix2 = startX + sideLen;
    const iy2 = iy1;
    const ix3 = ix2;
    const iy3 = startY;
    idealPathEl.setAttribute('d', `M ${startX} ${startY} L ${ix1} ${iy1} L ${ix2} ${iy2} L ${ix3} ${iy3} Z`);

    // Actual path with cumulative drift (or compensated via IF-ELSE feedback)
    const effectiveDrift = isFixed ? drift * 0.15 : drift;
    let x = startX;
    let y = startY;
    let angleDeg = -90; // facing up
    let d = `M ${x} ${y}`;

    for (let i = 0; i < 4; i++) {
      const rad = ((angleDeg + effectiveDrift * (i * 0.35 + 0.5)) * Math.PI) / 180;
      x += Math.cos(rad) * sideLen;
      y += Math.sin(rad) * sideLen;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      angleDeg += 90;
    }

    actualPathEl.setAttribute('d', d);
    endDot.setAttribute('cx', x.toFixed(1));
    endDot.setAttribute('cy', y.toFixed(1));

    const dist = Math.hypot(x - startX, y - startY);
    if (dist < 12) {
      simStatus.textContent = `✅ 降落誤差極小（約 ${dist.toFixed(0)} cm），成功回到起點附近！`;
    } else {
      simStatus.textContent = `⚠️ 累積偏移約 ${dist.toFixed(0)} cm，建議開啟 IF-ELSE 微調修正或縮短單邊時間。`;
    }
  }

  [fwdInput, driftInput, fixCheckbox].forEach((el) => el.addEventListener('input', updateSimulator));
  updateSimulator();

  // 6. Week 3 HCI Data Calculator
  const appInput = document.getElementById('app-times');
  const ctrlInput = document.getElementById('ctrl-times');
  const calcBtn = document.getElementById('calc-hci-btn');
  const appAvgText = document.getElementById('app-avg-text');
  const ctrlAvgText = document.getElementById('ctrl-avg-text');
  const appBar = document.getElementById('app-bar');
  const ctrlBar = document.getElementById('ctrl-bar');
  const hciSummary = document.getElementById('hci-summary');

  function parseAvg(str) {
    const nums = str
      .split(/[,，\s]+/)
      .map(Number)
      .filter((n) => !Number.isNaN(n) && n > 0);
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function updateHci() {
    const appAvg = parseAvg(appInput.value);
    const ctrlAvg = parseAvg(ctrlInput.value);
    if (appAvg === null || ctrlAvg === null) {
      hciSummary.textContent = '請輸入有效的正數秒數（以逗號分隔）。';
      return;
    }

    const maxVal = Math.max(appAvg, ctrlAvg, 1);
    appAvgText.textContent = `${appAvg.toFixed(1)} 秒`;
    ctrlAvgText.textContent = `${ctrlAvg.toFixed(1)} 秒`;
    appBar.style.inlineSize = `${(appAvg / maxVal) * 100}%`;
    ctrlBar.style.inlineSize = `${(ctrlAvg / maxVal) * 100}%`;

    const diffPct = ((appAvg - ctrlAvg) / appAvg) * 100;
    if (diffPct > 0) {
      hciSummary.innerHTML = `實體遙控手柄平均快了 <strong>${diffPct.toFixed(1)}%</strong>，顯示實體觸覺回饋與低延遲協定對精準操控有顯著幫助。`;
    } else {
      hciSummary.innerHTML = `手機虛擬搖桿本次表現較快（差異 <strong>${Math.abs(diffPct).toFixed(1)}%</strong>），可進一步討論兩者操作習慣的影響。`;
    }
  }

  calcBtn.addEventListener('click', updateHci);

  // 7. Student Study Guide Self-Check Quiz
  const quizData = [
    {
      q: '1. 為什麼四軸無人機的 4 顆馬達不能全部往同一個方向旋轉？',
      opts: ['為了省電', '為了抵消反扭力，避免機身原地打轉', '為了讓鏡頭拍得更清楚'],
      ans: 1,
      exp: '對角線 2 順 2 逆旋轉才能互相抵消螺旋槳產生的反作用力矩。'
    },
    {
      q: '2. 在沒有 GPS 的室內飛行時，若飛到「全黑或鏡面反光地板」上方容易飄移，是因為哪個感測器失效？',
      opts: ['底部光流鏡頭 (Optical Flow)', '電池溫度計', 'Wi-Fi 天線'],
      ans: 0,
      exp: '光流鏡頭需要拍攝地面紋理來判斷水平移動，全黑或反光表面會讓它找不到特徵點。'
    },
    {
      q: '3. 在美國手 (Mode 2) 操控邏輯中，負責控制無人機「前進與後退 (Pitch)」的是哪一個搖桿？',
      opts: ['左搖桿上下', '右搖桿上下', '左搖桿左右'],
      ans: 1,
      exp: '右搖桿上下控制俯仰 (Pitch) 前後移動；左搖桿上下才是油門 (Throttle) 升降。'
    },
    {
      q: '4. 為什麼實體遙控手柄在障礙賽中通常比手機觸控螢幕更精準？',
      opts: ['因為手柄比較重', '具備彈簧置中觸覺回饋與低延遲通訊協定', '因為手柄不用充電'],
      ans: 1,
      exp: '實體搖桿放開即自動回正煞車，且專用射頻協定比一般 Wi-Fi 延遲更低、抗干擾更強。'
    }
  ];

  const quizContainer = document.getElementById('quiz-container');
  if (quizContainer) {
    quizData.forEach((item, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'quiz-item';

      const qEl = document.createElement('p');
      qEl.className = 'quiz-q';
      qEl.textContent = item.q;
      wrapper.appendChild(qEl);

      const optsEl = document.createElement('div');
      optsEl.className = 'quiz-options';

      const feedbackEl = document.createElement('p');
      feedbackEl.className = 'quiz-feedback';
      feedbackEl.setAttribute('aria-live', 'polite');

      item.opts.forEach((optText, optIdx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'quiz-opt';
        btn.textContent = optText;
        btn.addEventListener('click', () => {
          if (optIdx === item.ans) {
            feedbackEl.textContent = `✅ 答對了！${item.exp}`;
          } else {
            feedbackEl.textContent = `❌ 再想想看喔！提示：${item.exp}`;
          }
        });
        optsEl.appendChild(btn);
      });

      wrapper.appendChild(optsEl);
      wrapper.appendChild(feedbackEl);
      quizContainer.appendChild(wrapper);
    });
  }

  // 8. Weekly Hands-on Checklist & Take-Home Assignment Form
  const hwTasksByWeek = {
    w1: {
      title: '第 1 週：嵌入式感測器與邊緣 AI 視覺追蹤',
      tasks: [
        '【實作 1-1】開機前檢查：已卸下 [1] 雲台保護罩、確認 4 顆螺旋槳保護罩無裂痕、[6] 下視視覺感測器乾淨無遮擋',
        '【實作 1-2】全員掌上起降：組內每位成員皆以「五指併攏完全平伸」姿勢完成 Follow / Dronie 掌上起飛與接機降落',
        '【實作 1-3】邊緣 AI 極限實測：完成 3 種變因（移動速度、遮擋、光線）測試並記錄跟丟條件',
        '【實作 1-4】中場 PD 快充：第一波實飛後正確關機，將機尾 [9] USB-C 埠連接中央快充站補電'
      ],
      prompt: '請在校園或家中找出 1 個「適合底部光流鏡頭定位的地面」與 1 個「會導致光流漂移失效的地面」，寫下地點與原因（並確認個人手機已安裝 DJI Fly App）：'
    },
    w2: {
      title: '第 2 週：無線通訊架構與飛行演算法',
      tasks: [
        '【實作 2-1】Wi-Fi 防連錯配對：正確連上本組專屬編號 (#01–#07) 無人機，完成懸停 10 秒與四軸方向練習',
        '【實作 2-2】正方形演算法與 Debug：撰寫含 REPEAT 4 與 IF-ELSE 修正的虛擬碼，實飛 2 次並修正秒數參數',
        '【實作 2-3】低空穿框挑戰：使用手機虛擬搖桿穩定穿越 80cm 障礙門框至少 1 次'
      ],
      prompt: '1. 使用網站「飛行演算法模擬器」測試偏航誤差 15° 時，開啟 IF-ELSE 修正前後的偏移距離各為多少 cm？\n2. 為什麼相同的前進秒數，電池滿電 (100%) 與低電量 (25%) 飛出來的距離會不同？'
    },
    w3: {
      title: '第 3 週：人機介面 (HCI) 量化實驗與賽道工程',
      tasks: [
        '【實作 3-1】雙站 HCI 對照實測：完成「手機 Wi-Fi 觸控」與「實體遙控手柄」S 型繞標計時及停機坪誤差 (cm) 測量',
        '【實作 3-2】賽道搭建與安全檢驗：繪製草圖並搭建符合規範（門框 ≥80cm、離牆 ≥1.5m、無細線）之障礙賽道',
        '【實作 3-3】系統整合壓力測試：完成跨組賽道試飛並微調障礙物間距'
      ],
      prompt: '1. 將全班數據輸入「HCI 計算機」，實體遙控手柄平均快了多少 %？為什麼？\n2. 請列出你們第 4 週決賽三階段（穿門、AI 偵察、降落）的飛手與觀察員多語口令分工策略：'
    },
    w4: {
      title: '第 4 週：智慧無人機綜合挑戰賽與產業提案',
      tasks: [
        '【實作 4-1】雙門精準穿越：於雙軌 PK 賽中完成第一階段障礙門穿越並交棒',
        '【實作 4-2】多語密碼牌 AI 偵察：懸停俯拍地面「台/越/印/緬通關密碼牌」並從 DJI Fly 匯出清晰照片',
        '【實作 4-3】同心圓停機坪降落：完成返航降落並記錄得分',
        '【實作 4-4】跨文化成果發表：完成 2 分鐘團隊短講（展示偵察影像與 4 週 Debug 歷程）'
      ],
      prompt: '【期末跨文化科技提案】結合台灣或你的家鄉（越南／印尼／緬甸），提出一個「無人機 + AI 影像辨識」能解決的真實問題（如：稻田病蟲害巡檢、山區地震 3D 測繪），說明需搭配哪些感測器與預期效益：'
    }
  };

  const hwForm = document.getElementById('homework-form');
  const weekRadios = document.querySelectorAll('input[name="hw_week"]');
  const checklistLegend = document.getElementById('hw-checklist-legend');
  const checklistBox = document.getElementById('hw-checklist-box');
  const promptLegend = document.getElementById('hw-prompt-legend');
  const questionDesc = document.getElementById('hw-question-desc');
  const hwGroupInput = document.getElementById('hw-group');
  const hwNameInput = document.getElementById('hw-name');
  const hwAnswerInput = document.getElementById('hw-answer');
  const hwStatus = document.getElementById('hw-status');
  const hwOutput = document.getElementById('hw-output');
  const hwCopyBtn = document.getElementById('hw-copy-btn');
  const hwPrintBtn = document.getElementById('hw-print-btn');

  function getSelectedWeek() {
    const checked = document.querySelector('input[name="hw_week"]:checked');
    return checked ? checked.value : 'w1';
  }

  function loadWeekUI(weekKey) {
    const data = hwTasksByWeek[weekKey];
    if (!data || !checklistBox) return;

    const weekNum = weekKey.replace('w', '');
    checklistLegend.textContent = `2. 🛠️ 第 ${weekNum} 週課堂實作闖關檢核（當堂完成打勾）`;
    promptLegend.textContent = `3. 📝 第 ${weekNum} 週課後延伸作業（Take-Home Assignment）`;
    questionDesc.textContent = data.prompt;

    // Load saved state from localStorage if available
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(`drone_hw_${weekKey}`) || '{}');
    } catch (_) {
      saved = {};
    }

    checklistBox.innerHTML = '';
    data.tasks.forEach((taskText, i) => {
      const label = document.createElement('label');
      label.className = 'hw-check-item';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.name = `task_${i}`;
      cb.value = taskText;
      cb.checked = Array.isArray(saved.checked) ? saved.checked.includes(i) : false;

      const span = document.createElement('span');
      span.textContent = taskText;

      label.appendChild(cb);
      label.appendChild(span);
      checklistBox.appendChild(label);
    });

    if (saved.group) hwGroupInput.value = saved.group;
    if (saved.name) hwNameInput.value = saved.name;
    hwAnswerInput.value = saved.answer || '';
    hwStatus.textContent = '';
  }

  weekRadios.forEach((radio) => {
    radio.addEventListener('change', () => loadWeekUI(getSelectedWeek()));
  });

  if (hwForm) {
    loadWeekUI('w1');

    hwForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!hwForm.checkValidity()) {
        hwStatus.textContent = '❌ 請填寫必填欄位（組別編號 1–7、姓名與課後作業作答區）！';
        hwForm.reportValidity();
        return;
      }

      const weekKey = getSelectedWeek();
      const data = hwTasksByWeek[weekKey];
      const checkboxes = Array.from(checklistBox.querySelectorAll('input[type="checkbox"]'));
      const checkedIndices = [];
      const taskLines = checkboxes.map((cb, idx) => {
        if (cb.checked) checkedIndices.push(idx);
        return `${cb.checked ? '✅ [已完成]' : '⬜ [待完成]'} ${cb.value}`;
      });

      const payload = {
        group: hwGroupInput.value.trim(),
        name: hwNameInput.value.trim(),
        checked: checkedIndices,
        answer: hwAnswerInput.value.trim()
      };

      try {
        localStorage.setItem(`drone_hw_${weekKey}`, JSON.stringify(payload));
      } catch (_) {}

      const reportText = [
        `=== 無人機 × 資訊科技｜實作檢核與課後作業報告 ===`,
        `課程單元：${data.title}`,
        `組別編號：第 ${payload.group} 組（無人機 #0${payload.group}）`,
        `學生姓名：${payload.name}`,
        `----------------------------------------`,
        `【課堂實作闖關進度 (${checkedIndices.length}/${checkboxes.length})】`,
        ...taskLines,
        `----------------------------------------`,
        `【課後延伸作業回答】`,
        payload.answer
      ].join('\n');

      hwOutput.textContent = reportText;
      hwOutput.hidden = false;
      hwStatus.textContent = '✅ 已成功產生並儲存本週作業報告！（可點選下方按鈕複製或列印）';
    });

    hwCopyBtn.addEventListener('click', async () => {
      if (hwOutput.hidden || !hwOutput.textContent) {
        hwStatus.textContent = 'ℹ️ 請先點選「產生並儲存本週作業單」再複製！';
        return;
      }
      try {
        await navigator.clipboard.writeText(hwOutput.textContent);
        hwStatus.textContent = '📋 已複製到剪貼簿！可直接貼上至學習平台或傳給老師。';
      } catch (_) {
        hwStatus.textContent = 'ℹ️ 請直接選取下方報告框內的文字進行複製。';
      }
    });

    hwPrintBtn.addEventListener('click', () => window.print());
  }
});
