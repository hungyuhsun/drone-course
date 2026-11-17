document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  // 0. Feature Detection for Discrete Display & Top-Layer Transitions (modern-web-guidance)
  let supportsDisplayTransition;
  function canTransitionDisplay() {
    if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
    if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
      return false;
    }
    const probe = document.createElement('div');
    probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
    document.body.appendChild(probe);
    getComputedStyle(probe).display;
    probe.style.display = 'none';
    supportsDisplayTransition = getComputedStyle(probe).display === 'block';
    probe.remove();
    return supportsDisplayTransition;
  }

  function supportsTopLayerExit() {
    return window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay();
  }

  async function closeTopLayer(element) {
    if (!supportsTopLayerExit()) {
      element.setAttribute('data-closing', '');
      const animations = element.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 2000)),
        ]);
      }
      if (!element.hasAttribute('data-closing')) return;
      element.removeAttribute('data-closing');
    }
    element.close();
  }

  // 1. Global Motion Pause / Play Control (WCAG 2.2.2 Pause, Stop, Hide)
  const motionToggleBtn = document.getElementById('motion-toggle-btn');
  let stopSimAnimation = null;

  if (motionToggleBtn) {
    motionToggleBtn.addEventListener('click', () => {
      const isPaused = root.getAttribute('data-motion-paused') === 'true';
      const nextPaused = !isPaused;
      if (nextPaused) {
        root.setAttribute('data-motion-paused', 'true');
        motionToggleBtn.textContent = '▶️ 播放動態效果';
        if (typeof stopSimAnimation === 'function') stopSimAnimation();
      } else {
        root.removeAttribute('data-motion-paused');
        motionToggleBtn.textContent = '⏸️ 暫停動態效果';
      }
    });
  }

  // 2. Accessible Tabs (Single-Row Scrollable + Edge Fades + Smooth Panel Switch)
  const tablist = document.querySelector('.tablist');
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

  if (tablist && !window.CSS?.supports?.('animation-timeline', 'scroll()')) {
    const first = tablist.firstElementChild;
    const last = tablist.lastElementChild;
    if (first && last && 'IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const { target, intersectionRatio } of entries) {
            tablist.classList.toggle(
              target === first ? 'more-start' : 'more-end',
              intersectionRatio < 1
            );
          }
        },
        { root: tablist, threshold: 1, rootMargin: '1px' }
      );
      observer.observe(first);
      observer.observe(last);
    }
  }

  function applyTabSwitch(selectedTab) {
    tabs.forEach((tab) => {
      const isSelected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.setAttribute('tabindex', isSelected ? '0' : '-1');
    });

    panels.forEach((panel) => {
      const shouldShow = panel.id === selectedTab.getAttribute('aria-controls');
      panel.removeAttribute('data-closing');
      panel.hidden = !shouldShow;
    });

    selectedTab.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      container: 'nearest',
    });
  }

  function activateTab(selectedTab) {
    const isReducedMotion =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      root.getAttribute('data-motion-paused') === 'true';

    if (!document.startViewTransition || isReducedMotion) {
      applyTabSwitch(selectedTab);
      return;
    }
    document.startViewTransition(() => applyTabSwitch(selectedTab));
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

  // 3. Accordion Expand All / Collapse All + Animated <details>
  const studyAccordion = document.getElementById('study-accordion');
  const toggleAllUnitsBtn = document.getElementById('toggle-all-units-btn');

  function toggleAllStudyUnits() {
    if (!studyAccordion || !toggleAllUnitsBtn) return;
    const expand = toggleAllUnitsBtn.getAttribute('aria-expanded') !== 'true';
    for (const details of studyAccordion.querySelectorAll(':scope > details')) {
      details.open = expand;
    }
    toggleAllUnitsBtn.setAttribute('aria-expanded', String(expand));
  }

  document.addEventListener(
    'command',
    (event) => {
      if (event.command !== '--toggle-all') return;
      toggleAllStudyUnits();
    },
    { capture: true }
  );

  if (toggleAllUnitsBtn && !Object.hasOwn(HTMLButtonElement.prototype, 'commandForElement')) {
    toggleAllUnitsBtn.addEventListener('click', toggleAllStudyUnits);
  }

  document.addEventListener(
    'toggle',
    (event) => {
      if (!event.target.matches('#study-accordion > details')) return;
      if (!studyAccordion || !toggleAllUnitsBtn) return;
      const items = studyAccordion.querySelectorAll(':scope > details');
      const allOpen = Array.prototype.every.call(items, (d) => d.open);
      toggleAllUnitsBtn.setAttribute('aria-expanded', String(allOpen));
    },
    { capture: true }
  );

  // 4. Interactive Quadcopter Rotor Speed & Attitude Simulator (Unit 1)
  const maneuverBtns = document.querySelectorAll('[data-maneuver]');
  const liveQuadFrame = document.getElementById('live-quad-frame');
  const maneuverExplain = document.getElementById('maneuver-explain');

  const maneuverConfigs = {
    hover: {
      rpm: [60, 60, 60, 60],
      dur: ['0.55s', '0.55s', '0.55s', '0.55s'],
      text: '<strong>🟢 穩定懸停 (Hover)：</strong>4 顆馬達均維持 60% 轉速，總升力等於機身重量（135g），且 M1+M3 順時針反扭力與 M2+M4 逆時針反扭力完全抵消。',
    },
    'throttle-up': {
      rpm: [90, 90, 90, 90],
      dur: ['0.24s', '0.24s', '0.24s', '0.24s'],
      text: '<strong>⬆️ 油門上升 (Throttle+)：</strong>左搖桿往上推，4 顆馬達同時加速至 90%，總升力大於重力垂直爬升，正反槳扭力依然保持平衡不自轉！',
    },
    'yaw-right': {
      rpm: [85, 40, 85, 40],
      dur: ['0.25s', '0.95s', '0.25s', '0.95s'],
      text: '<strong>↪️ 機頭右轉 (Yaw ↻)：</strong>左搖桿往右推，對角線順時針槳 (M1, M3) 加速至 85%、逆時針槳 (M2, M4) 減速至 40%，利用反扭力差讓機頭原地向右旋轉！',
    },
    'yaw-left': {
      rpm: [40, 85, 40, 85],
      dur: ['0.95s', '0.25s', '0.95s', '0.25s'],
      text: '<strong>↩️ 機頭左轉 (Yaw ↺)：</strong>左搖桿往左推，逆時針槳 (M2, M4) 加速至 85%、順時針槳 (M1, M3) 減速至 40%，產生逆時針轉向力矩！',
    },
    'pitch-fwd': {
      rpm: [48, 48, 86, 86],
      dur: ['0.75s', '0.75s', '0.26s', '0.26s'],
      text: '<strong>⏩ 俯仰前進 (Pitch+)：</strong>右搖桿往上推，後方兩顆馬達 (M3, M4) 加速至 86%、前方 (M1, M2) 減速至 48%，機頭微微前傾產生向前推進分力！',
    },
    'roll-right': {
      rpm: [86, 48, 48, 86],
      dur: ['0.26s', '0.75s', '0.75s', '0.26s'],
      text: '<strong>➡️ 橫滾右移 (Roll+)：</strong>右搖桿往右推，左側兩顆馬達 (M1, M4) 加速至 86%、右側 (M2, M3) 減速至 48%，機身向右傾斜平移！',
    },
  };

  maneuverBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      maneuverBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const key = btn.dataset.maneuver;
      const cfg = maneuverConfigs[key];
      if (!cfg || !liveQuadFrame) return;

      liveQuadFrame.setAttribute('data-state', key);
      ['m1', 'm2', 'm3', 'm4'].forEach((m, idx) => {
        const prop = document.getElementById(`prop-${m}`);
        const valEl = document.getElementById(`rpm-val-${m}`);
        const barEl = document.getElementById(`rpm-bar-${m}`);
        if (prop) prop.style.setProperty('--spin-dur', cfg.dur[idx]);
        if (valEl) valEl.textContent = `${cfg.rpm[idx]}%`;
        if (barEl) barEl.style.inlineSize = `${cfg.rpm[idx]}%`;
      });
      if (maneuverExplain) maneuverExplain.innerHTML = cfg.text;
    });
  });

  // 5. Theme Toggle
  const themeBtn = document.getElementById('theme-toggle-btn');
  themeBtn.addEventListener('click', () => {
    const isDark =
      root.getAttribute('data-theme') === 'dark' ||
      (!root.hasAttribute('data-theme') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', nextTheme);
    themeBtn.setAttribute('aria-pressed', String(nextTheme === 'dark'));
  });

  // 6. Native <dialog> Classroom Timer with Animated Progress Ring & Audio Chime
  const timerDialog = document.getElementById('timer-dialog');
  const openTimerBtn = document.getElementById('open-timer-btn');
  const closeTimerBtn = document.getElementById('close-timer-btn');
  const timerDisplay = document.getElementById('timer-display');
  const timerRingProgress = document.getElementById('timer-ring-progress');
  const startBtn = document.getElementById('timer-start-btn');
  const resetBtn = document.getElementById('timer-reset-btn');
  const presetBtns = document.querySelectorAll('.preset-btn');

  const RING_CIRCUMFERENCE = 427.26;
  let defaultSeconds = 600;
  let remainingSeconds = defaultSeconds;
  let timerId = null;

  function playTimerChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.36);
      });
    } catch (_) {}
  }

  function renderTime() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;

    if (timerRingProgress) {
      const fraction = defaultSeconds > 0 ? remainingSeconds / defaultSeconds : 0;
      const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction)));
      timerRingProgress.style.strokeDashoffset = offset.toFixed(2);
      timerRingProgress.classList.toggle('is-done', remainingSeconds === 0);
    }
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    startBtn.textContent = '開始計時';
  }

  openTimerBtn.addEventListener('click', () => {
    timerDialog.removeAttribute('data-closing');
    timerDialog.showModal();
  });

  closeTimerBtn.addEventListener('click', () => closeTopLayer(timerDialog));
  timerDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeTopLayer(timerDialog);
  });

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
        if (remainingSeconds === 0) {
          stopTimer();
          timerDisplay.textContent = '00:00 ⏰';
          playTimerChime();
        }
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

  // 7. Multilingual Filter & Print
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

  // 8. Week 2 Flight Algorithm & Animated Trajectory Simulator
  const fwdInput = document.getElementById('fwd-sec');
  const driftInput = document.getElementById('drift-deg');
  const fixCheckbox = document.getElementById('enable-fix');
  const fwdVal = document.getElementById('fwd-sec-val');
  const driftVal = document.getElementById('drift-deg-val');
  const idealPathEl = document.getElementById('ideal-path');
  const actualPathEl = document.getElementById('actual-path');
  const endDot = document.getElementById('end-dot');
  const simDrone = document.getElementById('sim-drone');
  const simFixRing = document.getElementById('sim-fix-ring');
  const simPlayBtn = document.getElementById('sim-play-btn');
  const simStepBadge = document.getElementById('sim-step-badge');
  const simStatus = document.getElementById('sim-status');
  const traceIter = document.getElementById('trace-iter');
  const traceSec = document.getElementById('trace-sec');
  const traceDrift = document.getElementById('trace-drift');
  const traceLines = document.querySelectorAll('#algo-trace .trace-line');

  let currentWaypoints = [];
  let simRafId = null;

  function highlightTraceLine(stepName, iterNum) {
    if (traceIter && iterNum) traceIter.textContent = String(iterNum);
    traceLines.forEach((line) => {
      line.classList.toggle('is-active', line.dataset.step === stepName);
    });
  }

  function cancelFlightPlayback() {
    if (simRafId !== null) {
      cancelAnimationFrame(simRafId);
      simRafId = null;
    }
    if (simPlayBtn) simPlayBtn.textContent = '▶️ 播放動態飛行模擬';
    if (simFixRing) simFixRing.classList.remove('is-pulsing');
    actualPathEl.style.strokeDasharray = 'none';
    actualPathEl.style.strokeDashoffset = '0';
  }
  stopSimAnimation = cancelFlightPlayback;

  function updateSimulator() {
    cancelFlightPlayback();

    const sec = Number(fwdInput.value);
    const drift = Number(driftInput.value);
    const isFixed = fixCheckbox.checked;

    fwdVal.textContent = `${sec.toFixed(1)}s`;
    driftVal.textContent = `${drift}°`;
    if (traceSec) traceSec.textContent = sec.toFixed(1);
    if (traceDrift) traceDrift.textContent = String(drift);

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
    idealPathEl.setAttribute(
      'd',
      `M ${startX} ${startY} L ${ix1} ${iy1} L ${ix2} ${iy2} L ${ix3} ${iy3} Z`
    );

    // Actual path with cumulative drift (or compensated via IF-ELSE feedback)
    const effectiveDrift = isFixed ? drift * 0.15 : drift;
    let x = startX;
    let y = startY;
    let angleDeg = -90; // facing up
    let d = `M ${x} ${y}`;

    currentWaypoints = [{ x, y, heading: 0 }];

    for (let i = 0; i < 4; i++) {
      const actualAngle = angleDeg + effectiveDrift * (i * 0.35 + 0.5);
      const rad = (actualAngle * Math.PI) / 180;
      x += Math.cos(rad) * sideLen;
      y += Math.sin(rad) * sideLen;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      currentWaypoints.push({ x, y, heading: actualAngle + 90 });
      angleDeg += 90;
    }

    actualPathEl.setAttribute('d', d);
    endDot.setAttribute('cx', x.toFixed(1));
    endDot.setAttribute('cy', y.toFixed(1));

    if (simDrone) {
      const lastWp = currentWaypoints[currentWaypoints.length - 1];
      simDrone.setAttribute(
        'transform',
        `translate(${lastWp.x.toFixed(1)}, ${lastWp.y.toFixed(1)}) rotate(${lastWp.heading.toFixed(1)})`
      );
    }

    highlightTraceLine(isFixed ? 'fix' : 'loop', 4);
    if (simStepBadge) {
      simStepBadge.textContent = isFixed
        ? '✅ 已套用 IF-ELSE 偏航修正'
        : '⚠️ 未修正模式（點擊播放觀察偏離過程）';
    }

    const dist = Math.hypot(x - startX, y - startY);
    if (dist < 12) {
      simStatus.textContent = `✅ 降落誤差極小（約 ${dist.toFixed(0)} cm），成功回到起點附近！`;
    } else {
      simStatus.textContent = `⚠️ 累積偏移約 ${dist.toFixed(0)} cm，建議開啟 IF-ELSE 微調修正或縮短單邊時間。`;
    }
  }

  function playFlightSimulation() {
    if (simRafId !== null) {
      cancelFlightPlayback();
      if (simStepBadge) simStepBadge.textContent = '⏸️ 已暫停飛行模擬';
      return;
    }

    if (currentWaypoints.length < 5) updateSimulator();

    // Respect global pause if user had paused animations, unpause when explicitly clicking Play
    root.removeAttribute('data-motion-paused');
    if (motionToggleBtn) motionToggleBtn.textContent = '⏸️ 暫停動態效果';

    simPlayBtn.textContent = '⏸️ 暫停模擬';
    const isFixed = fixCheckbox.checked;
    const totalLength = actualPathEl.getTotalLength ? actualPathEl.getTotalLength() : 320;
    actualPathEl.style.strokeDasharray = `${totalLength}`;
    actualPathEl.style.strokeDashoffset = `${totalLength}`;

    const legDurationMs = 950;
    const turnPauseMs = 420;
    const cycleMs = legDurationMs + turnPauseMs;
    const totalDurationMs = cycleMs * 4;
    const startTime = performance.now();

    function stepFrame(now) {
      const elapsed = now - startTime;
      if (elapsed >= totalDurationMs) {
        actualPathEl.style.strokeDasharray = 'none';
        actualPathEl.style.strokeDashoffset = '0';
        const finalWp = currentWaypoints[4];
        if (simDrone) {
          simDrone.setAttribute(
            'transform',
            `translate(${finalWp.x.toFixed(1)}, ${finalWp.y.toFixed(1)}) rotate(${finalWp.heading.toFixed(1)})`
          );
        }
        if (simFixRing) simFixRing.classList.remove('is-pulsing');
        highlightTraceLine(isFixed ? 'fix' : 'loop', 4);
        if (simStepBadge) {
          simStepBadge.textContent = '🏁 4 邊迴圈飛行完成！';
        }
        simRafId = null;
        simPlayBtn.textContent = '▶️ 重新播放飛行模擬';
        return;
      }

      const legIndex = Math.min(3, Math.floor(elapsed / cycleMs));
      const legElapsed = elapsed - legIndex * cycleMs;
      const wpStart = currentWaypoints[legIndex];
      const wpEnd = currentWaypoints[legIndex + 1];

      if (legElapsed < legDurationMs) {
        // Moving forward phase
        const t = legElapsed / legDurationMs;
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const curX = wpStart.x + (wpEnd.x - wpStart.x) * easeT;
        const curY = wpStart.y + (wpEnd.y - wpStart.y) * easeT;

        if (simDrone) {
          simDrone.setAttribute(
            'transform',
            `translate(${curX.toFixed(1)}, ${curY.toFixed(1)}) rotate(${wpEnd.heading.toFixed(1)})`
          );
        }
        if (simFixRing) simFixRing.classList.remove('is-pulsing');

        const overallProgress = (legIndex + easeT) / 4;
        actualPathEl.style.strokeDashoffset = `${(totalLength * (1 - overallProgress)).toFixed(1)}`;

        highlightTraceLine('move', legIndex + 1);
        if (simStepBadge) {
          simStepBadge.textContent = `🚁 第 ${legIndex + 1}/4 邊：Pitch 直線推進中...`;
        }
      } else {
        // Corner turn & IF-ELSE yaw compensation phase
        const turnT = (legElapsed - legDurationMs) / turnPauseMs;
        const nextHeading =
          legIndex < 3 ? currentWaypoints[legIndex + 2].heading : wpEnd.heading + 90;
        const curHeading = wpEnd.heading + (nextHeading - wpEnd.heading) * turnT;

        if (simDrone) {
          simDrone.setAttribute(
            'transform',
            `translate(${wpEnd.x.toFixed(1)}, ${wpEnd.y.toFixed(1)}) rotate(${curHeading.toFixed(1)})`
          );
        }

        if (isFixed && turnT > 0.35) {
          highlightTraceLine('fix', legIndex + 1);
          if (simFixRing) simFixRing.classList.add('is-pulsing');
          if (simStepBadge) {
            simStepBadge.textContent = `🔧 第 ${legIndex + 1} 轉角：執行 IF 偏航微調修正！`;
          }
        } else {
          highlightTraceLine('turn', legIndex + 1);
          if (simFixRing) simFixRing.classList.remove('is-pulsing');
          if (simStepBadge) {
            simStepBadge.textContent = `🔄 第 ${legIndex + 1} 轉角：Yaw 右轉 90°`;
          }
        }
      }

      simRafId = requestAnimationFrame(stepFrame);
    }

    simRafId = requestAnimationFrame(stepFrame);
  }

  [fwdInput, driftInput, fixCheckbox].forEach((el) =>
    el.addEventListener('input', updateSimulator)
  );
  if (simPlayBtn) simPlayBtn.addEventListener('click', playFlightSimulation);
  updateSimulator();

  // 9. Week 3 HCI Data Calculator
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
      appAvgText.textContent = '-- 秒';
      ctrlAvgText.textContent = '-- 秒';
      appBar.style.inlineSize = '0%';
      ctrlBar.style.inlineSize = '0%';
      hciSummary.textContent = '⚠️ 請輸入有效的正數秒數（以逗號分隔）。';
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

  // 10. Student Study Guide Self-Check Quiz
  const quizData = [
    {
      q: '1. 為什麼四軸無人機的 4 顆馬達不能全部往同一個方向旋轉？',
      opts: ['為了省電', '為了抵消反扭力，避免機身原地打轉', '為了讓鏡頭拍得更清楚'],
      ans: 1,
      exp: '對角線 2 順 2 逆旋轉才能互相抵消螺旋槳產生的反作用力矩。',
    },
    {
      q: '2. 在沒有 GPS 的室內飛行時，若飛到「全黑或鏡面反光地板」上方容易飄移，是因為哪個感測器失效？',
      opts: ['底部光流鏡頭 (Optical Flow)', '電池溫度計', 'Wi-Fi 天線'],
      ans: 0,
      exp: '光流鏡頭需要拍攝地面紋理來判斷水平移動，全黑或反光表面會讓它找不到特徵點。',
    },
    {
      q: '3. 在美國手 (Mode 2) 操控邏輯中，負責控制無人機「前進與後退 (Pitch)」的是哪一個搖桿？',
      opts: ['左搖桿上下', '右搖桿上下', '左搖桿左右'],
      ans: 1,
      exp: '右搖桿上下控制俯仰 (Pitch) 前後移動；左搖桿上下才是油門 (Throttle) 升降。',
    },
    {
      q: '4. 為什麼實體遙控手柄在障礙賽中通常比手機觸控螢幕更精準？',
      opts: ['因為手柄比較重', '具備彈簧置中觸覺回饋與低延遲通訊協定', '因為手柄不用充電'],
      ans: 1,
      exp: '實體搖桿放開即自動回正煞車，且專用射頻協定比一般 Wi-Fi 延遲更低、抗干擾更強。',
    },
  ];

  const quizContainer = document.getElementById('quiz-container');
  if (quizContainer) {
    quizData.forEach((item) => {
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
          optsEl.querySelectorAll('.quiz-opt').forEach((b) => {
            b.classList.remove('is-correct', 'is-wrong');
          });
          if (optIdx === item.ans) {
            btn.classList.add('is-correct');
            feedbackEl.textContent = `✅ 答對了！${item.exp}`;
          } else {
            btn.classList.add('is-wrong');
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

  // 11. Weekly Hands-on Checklist & Take-Home Assignment Form
  const hwTasksByWeek = {
    w1: {
      title: '第 1 週：嵌入式感測器與邊緣 AI 視覺追蹤',
      tasks: [
        '【實作 1-1】開機前檢查：已卸下 [1] 雲台保護罩、確認 4 顆螺旋槳保護罩無裂痕、[6] 下視視覺感測器乾淨無遮擋',
        '【實作 1-2】全員掌上起降：組內每位成員皆以「五指併攏完全平伸」姿勢完成 Follow / Dronie 掌上起飛與接機降落',
        '【實作 1-3】邊緣 AI 極限實測：完成 3 種變因（移動速度、遮擋、光線）測試並記錄跟丟條件',
        '【實作 1-4】中場 PD 快充：第一波實飛後正確關機，將機尾 [9] USB-C 埠連接中央快充站補電',
      ],
      prompt:
        '請在校園或家中找出 1 個「適合底部光流鏡頭定位的地面」與 1 個「會導致光流漂移失效的地面」，寫下地點與原因（並確認個人手機已安裝 DJI Fly App）：',
    },
    w2: {
      title: '第 2 週：無線通訊架構與飛行演算法',
      tasks: [
        '【實作 2-1】Wi-Fi 防連錯配對：正確連上本組專屬編號 (#01–#07) 無人機，完成懸停 10 秒與四軸方向練習',
        '【實作 2-2】正方形演算法與 Debug：撰寫含 REPEAT 4 與 IF-ELSE 修正的虛擬碼，實飛 2 次並修正秒數參數',
        '【實作 2-3】低空穿框挑戰：使用手機虛擬搖桿穩定穿越 80cm 障礙門框至少 1 次',
      ],
      prompt:
        '1. 使用網站「飛行演算法模擬器」測試偏航誤差 15° 時，開啟 IF-ELSE 修正前後的偏移距離各為多少 cm？\n2. 為什麼相同的前進秒數，電池滿電 (100%) 與低電量 (25%) 飛出來的距離會不同？',
    },
    w3: {
      title: '第 3 週：人機介面 (HCI) 量化實驗與賽道工程',
      tasks: [
        '【實作 3-1】雙站 HCI 對照實測：完成「手機 Wi-Fi 觸控」與「實體遙控手柄」S 型繞標計時及停機坪誤差 (cm) 測量',
        '【實作 3-2】賽道搭建與安全檢驗：繪製草圖並搭建符合規範（門框 ≥80cm、離牆 ≥1.5m、無細線）之障礙賽道',
        '【實作 3-3】系統整合壓力測試：完成跨組賽道試飛並微調障礙物間距',
      ],
      prompt:
        '1. 將全班數據輸入「HCI 計算機」，實體遙控手柄平均快了多少 %？為什麼？\n2. 請列出你們第 4 週決賽三階段（穿門、AI 偵察、降落）的飛手與觀察員多語口令分工策略：',
    },
    w4: {
      title: '第 4 週：智慧無人機綜合挑戰賽與產業提案',
      tasks: [
        '【實作 4-1】雙門精準穿越：於雙軌 PK 賽中完成第一階段障礙門穿越並交棒',
        '【實作 4-2】多語密碼牌 AI 偵察：懸停俯拍地面「台/越/印/緬通關密碼牌」並從 DJI Fly 匯出清晰照片',
        '【實作 4-3】同心圓停機坪降落：完成返航降落並記錄得分',
        '【實作 4-4】跨文化成果發表：完成 2 分鐘團隊短講（展示偵察影像與 4 週 Debug 歷程）',
      ],
      prompt:
        '【期末跨文化科技提案】結合台灣或你的家鄉（越南／印尼／緬甸），提出一個「無人機 + AI 影像辨識」能解決的真實問題（如：稻田病蟲害巡檢、山區地震 3D 測繪），說明需搭配哪些感測器與預期效益：',
    },
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
      const checkboxes = Array.from(
        checklistBox.querySelectorAll('input[type="checkbox"]')
      );
      const checkedIndices = [];
      const taskLines = checkboxes.map((cb, idx) => {
        if (cb.checked) checkedIndices.push(idx);
        return `${cb.checked ? '✅ [已完成]' : '⬜ [待完成]'} ${cb.value}`;
      });

      const payload = {
        group: hwGroupInput.value.trim(),
        name: hwNameInput.value.trim(),
        checked: checkedIndices,
        answer: hwAnswerInput.value.trim(),
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
        payload.answer,
      ].join('\n');

      hwOutput.textContent = reportText;
      hwOutput.removeAttribute('data-closing');
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

  // 12. Student Hands-On SOP Practice & Checklist Sync (Tab 2)
  const sopStepBtns = document.querySelectorAll('.sop-step-btn');
  const sopProgressBadge = document.getElementById('sop-progress-badge');
  const sopSyncHwBtn = document.getElementById('sop-sync-hw-btn');
  const sopResetBtn = document.getElementById('sop-reset-btn');
  const sopDroneGroup = document.getElementById('sop-drone-group');
  const sopGimbalCover = document.getElementById('sop-gimbal-cover');
  const sopFlowCone = document.getElementById('sop-flow-cone');
  const sopFloorTexture = document.getElementById('sop-floor-texture');
  const sopFlatPalm = document.getElementById('sop-flat-palm');
  const sopUsbCable = document.getElementById('sop-usb-cable');
  const sopStageCaption = document.getElementById('sop-stage-caption');
  const sopLeds = document.querySelectorAll('.sop-led');

  const completedSopSteps = new Set();

  function updateSopProgressUI() {
    if (sopProgressBadge) {
      sopProgressBadge.textContent = `進度：${completedSopSteps.size} / 4 完成`;
    }
    if (sopSyncHwBtn) {
      sopSyncHwBtn.disabled = completedSopSteps.size < 4;
    }
  }

  sopStepBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.sopStep);
      btn.classList.add('is-done');
      completedSopSteps.add(step);
      updateSopProgressUI();

      if (step === 0) {
        if (sopGimbalCover) sopGimbalCover.classList.add('is-removed');
        if (sopStageCaption) {
          sopStageCaption.textContent = '✅ Step 1 完成：已取下 [1] 雲台保護罩，AI 鏡頭視野暢通！';
        }
      } else if (step === 1) {
        if (sopFlowCone) sopFlowCone.setAttribute('opacity', '1');
        if (sopFloorTexture) sopFloorTexture.setAttribute('opacity', '1');
        if (sopStageCaption) {
          sopStageCaption.textContent = '✅ Step 2 完成：[6] 光流感測器成功鎖定地面紋理特徵點！';
        }
      } else if (step === 2) {
        if (sopFlatPalm) sopFlatPalm.setAttribute('opacity', '1');
        if (sopUsbCable) sopUsbCable.setAttribute('opacity', '0');
        if (sopDroneGroup) sopDroneGroup.classList.add('is-flying');
        if (sopStageCaption) {
          sopStageCaption.textContent = '🚁 Step 3 完成：五指平伸掌上起飛！對角正反槳高速旋轉穩定懸停！';
        }
      } else if (step === 3) {
        if (sopDroneGroup) sopDroneGroup.classList.remove('is-flying');
        if (sopFlatPalm) sopFlatPalm.setAttribute('opacity', '0');
        if (sopFlowCone) sopFlowCone.setAttribute('opacity', '0');
        if (sopUsbCable) sopUsbCable.setAttribute('opacity', '1');
        sopLeds.forEach((led) => led.setAttribute('fill', '#4ade80'));
        if (sopStageCaption) {
          sopStageCaption.textContent = '⚡ Step 4 完成：已關機接上 [9] USB-C PD 快充，4 顆電量燈全亮！';
        }
      }
    });
  });

  if (sopResetBtn) {
    sopResetBtn.addEventListener('click', () => {
      completedSopSteps.clear();
      sopStepBtns.forEach((b) => b.classList.remove('is-done'));
      if (sopGimbalCover) sopGimbalCover.classList.remove('is-removed');
      if (sopFlowCone) sopFlowCone.setAttribute('opacity', '0');
      if (sopFloorTexture) sopFloorTexture.setAttribute('opacity', '0.25');
      if (sopFlatPalm) sopFlatPalm.setAttribute('opacity', '0');
      if (sopUsbCable) sopUsbCable.setAttribute('opacity', '0');
      if (sopDroneGroup) sopDroneGroup.classList.remove('is-flying');
      sopLeds.forEach((led, i) => led.setAttribute('fill', i < 2 ? '#4ade80' : '#334155'));
      if (sopStageCaption) {
        sopStageCaption.textContent = '👆 請點擊左側 Step 1 開始起飛前安全實作！';
      }
      updateSopProgressUI();
    });
  }

  if (sopSyncHwBtn) {
    sopSyncHwBtn.addEventListener('click', () => {
      if (!checklistBox) return;
      const cbs = checklistBox.querySelectorAll('input[type="checkbox"]');
      cbs.forEach((cb) => {
        cb.checked = true;
      });
      if (hwStatus) {
        hwStatus.textContent = '🎉 已將線上 SOP 實作完成紀錄自動打勾至本週實作檢核表！';
      }
      checklistBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // 13. Student Block Coding Challenge (Tab 5 Hands-On Practice 1)
  const codeAddBtns = document.querySelectorAll('.code-add-btn');
  const codeBlocksList = document.getElementById('code-blocks-list');
  const codeSampleBtn = document.getElementById('code-sample-btn');
  const codeClearBtn = document.getElementById('code-clear-btn');
  const codeRunBtn = document.getElementById('code-run-btn');
  const codeRunStatus = document.getElementById('code-run-status');
  const codingDrone = document.getElementById('coding-drone');
  const codingFlashRing = document.getElementById('coding-flash-ring');

  const cmdLabels = {
    FWD: '⬆️ 前進1格',
    LEFT: '↩️ 左轉90°',
    RIGHT: '↪️ 右轉90°',
    SNAP: '📸 拍密碼牌',
  };

  // Default starter blocks so students can immediately run or modify
  let studentProgram = ['FWD', 'FWD', 'RIGHT', 'FWD', 'LEFT', 'FWD', 'RIGHT', 'FWD', 'SNAP', 'FWD'];
  let isCodingRunning = false;

  function renderCodeBlocks(activeIndex = -1) {
    if (!codeBlocksList) return;
    codeBlocksList.innerHTML = '';
    if (studentProgram.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'field-hint';
      empty.textContent = '（尚未加入指令，請點擊上方按鈕組合你的飛行演算法）';
      codeBlocksList.appendChild(empty);
      return;
    }

    studentProgram.forEach((cmd, idx) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'code-block-chip';
      if (idx === activeIndex) chip.classList.add('is-executing');
      chip.textContent = `${idx + 1}. ${cmdLabels[cmd] || cmd}`;
      chip.title = '點擊刪除此步驟';
      chip.addEventListener('click', () => {
        if (isCodingRunning) return;
        studentProgram.splice(idx, 1);
        renderCodeBlocks();
      });
      codeBlocksList.appendChild(chip);
    });
  }

  function setCodingDronePos(col, row, deg) {
    if (!codingDrone) return;
    const x = 62 + col * 52;
    const y = 42 + row * 52;
    codingDrone.setAttribute('transform', `translate(${x}, ${y}) rotate(${deg})`);
  }

  codeAddBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (isCodingRunning || studentProgram.length >= 16) return;
      studentProgram.push(btn.dataset.cmd);
      renderCodeBlocks();
    });
  });

  if (codeSampleBtn) {
    codeSampleBtn.addEventListener('click', () => {
      if (isCodingRunning) return;
      studentProgram = ['FWD', 'FWD', 'RIGHT', 'FWD', 'LEFT', 'FWD', 'RIGHT', 'FWD', 'SNAP', 'FWD'];
      renderCodeBlocks();
      setCodingDronePos(0, 3, 0);
      if (codeRunStatus) codeRunStatus.textContent = '💡 已載入範例解答，請點「執行我的演算法」！';
    });
  }

  if (codeClearBtn) {
    codeClearBtn.addEventListener('click', () => {
      if (isCodingRunning) return;
      studentProgram = [];
      renderCodeBlocks();
      setCodingDronePos(0, 3, 0);
      if (codeRunStatus) codeRunStatus.textContent = '🗑️ 已清空指令，請重新組合！';
    });
  }

  if (codeRunBtn) {
    codeRunBtn.addEventListener('click', async () => {
      if (isCodingRunning) return;
      if (studentProgram.length === 0) {
        if (codeRunStatus) codeRunStatus.textContent = '⚠️ 請先加入至少 1 個飛行指令積木！';
        return;
      }

      isCodingRunning = true;
      codeRunBtn.disabled = true;
      let col = 0;
      let row = 3;
      let dir = 0; // 0: Up, 1: Right, 2: Down, 3: Left
      let deg = 0;
      let snappedPasscode = false;
      let passedGate = false;
      setCodingDronePos(col, row, deg);
      if (codingFlashRing) codingFlashRing.setAttribute('opacity', '0');

      const dx = [0, 1, 0, -1];
      const dy = [-1, 0, 1, 0];

      for (let i = 0; i < studentProgram.length; i++) {
        const cmd = studentProgram[i];
        renderCodeBlocks(i);
        if (codeRunStatus) {
          codeRunStatus.textContent = `⏳ 執行步驟 ${i + 1}/${studentProgram.length}：${cmdLabels[cmd]}`;
        }

        await new Promise((r) => setTimeout(r, 420));

        if (cmd === 'FWD') {
          const nextCol = col + dx[dir];
          const nextRow = row + dy[dir];
          if (nextCol < 0 || nextCol > 3 || nextRow < 0 || nextRow > 3) {
            if (codeRunStatus) {
              codeRunStatus.textContent = `💥 第 ${i + 1} 步超出 3m×3m 安全飛行格邊界！請 Debug 修正。`;
            }
            isCodingRunning = false;
            codeRunBtn.disabled = false;
            return;
          }
          col = nextCol;
          row = nextRow;
          setCodingDronePos(col, row, deg);

          if ((col === 1 && row === 2) || (col === 2 && row === 1)) {
            await new Promise((r) => setTimeout(r, 300));
            if (codeRunStatus) {
              codeRunStatus.textContent =
                col === 1
                  ? '💥 誤入 (1,2) 冷氣出風口強風區導致氣壓計失準！請繞道飛行。'
                  : '💥 誤入 (2,1) 細繩障礙區捲槳！請修改演算法避開。';
            }
            isCodingRunning = false;
            codeRunBtn.disabled = false;
            return;
          }
          if (col === 1 && row === 1) passedGate = true;
        } else if (cmd === 'RIGHT') {
          dir = (dir + 1) % 4;
          deg += 90;
          setCodingDronePos(col, row, deg);
        } else if (cmd === 'LEFT') {
          dir = (dir + 3) % 4;
          deg -= 90;
          setCodingDronePos(col, row, deg);
        } else if (cmd === 'SNAP') {
          if (col === 2 && row === 0) {
            snappedPasscode = true;
            if (codingFlashRing) {
              codingFlashRing.setAttribute('opacity', '1');
              setTimeout(() => codingFlashRing.setAttribute('opacity', '0'), 550);
            }
          }
        }
      }

      await new Promise((r) => setTimeout(r, 400));
      renderCodeBlocks(-1);
      if (col === 3 && row === 0 && snappedPasscode) {
        if (codeRunStatus) {
          codeRunStatus.textContent = `🏆 完美通關！成功穿門、拍下密碼牌 IT-MM04 並精準降落終點！`;
        }
      } else if (col === 3 && row === 0 && !snappedPasscode) {
        if (codeRunStatus) {
          codeRunStatus.textContent = 'ℹ️ 已抵達終點 (3,0)，但別忘了在 (2,0) 密碼牌上方加入「📸 拍密碼牌」指令喔！';
        }
      } else {
        if (codeRunStatus) {
          codeRunStatus.textContent = `📍 程式結束於 (${col},${row})，尚未抵達終點 (3,0)，請再調整步數！`;
        }
      }

      isCodingRunning = false;
      codeRunBtn.disabled = false;
    });
  }

  renderCodeBlocks();

  // 14. Student Mode 2 Dual-Stick Flight Trainer (Tab 5 Hands-On Practice 2)
  const stickModeBtns = document.querySelectorAll('[data-stick-mode]');
  const trainerResetBtn = document.getElementById('trainer-reset-btn');
  const trainerRecordBtn = document.getElementById('trainer-record-btn');
  const trainerDrone = document.getElementById('trainer-drone');
  const hudAlt = document.getElementById('hud-alt');
  const hudTime = document.getElementById('hud-time');
  const hudMission = document.getElementById('hud-mission');
  const dpadBtns = document.querySelectorAll('.dpad-btn');

  let stickMode = 'controller'; // 'controller' | 'phone'
  const trainerState = {
    x: 45,
    y: 150,
    vx: 0,
    vy: 0,
    alt: 0.0,
    heading: 0,
    stage: 1, // 1: takeoff, 2: fly to gate (165,55), 3: fly to pad (275,95) & land, 4: done
    startTime: null,
    elapsedSec: 0,
  };

  function updateTrainerVisuals() {
    if (!trainerDrone) return;
    const scale = (0.9 + trainerState.alt * 0.22).toFixed(2);
    trainerDrone.setAttribute(
      'transform',
      `translate(${trainerState.x.toFixed(1)}, ${trainerState.y.toFixed(1)}) rotate(${trainerState.heading.toFixed(0)}) scale(${scale})`
    );
    if (hudAlt) {
      hudAlt.textContent = `${trainerState.alt.toFixed(1)}m`;
      hudAlt.style.color = trainerState.alt > 1.5 ? '#ef4444' : '';
    }
    if (hudTime) {
      hudTime.textContent = `${trainerState.elapsedSec.toFixed(1)}s`;
    }

    if (trainerState.stage === 1 && trainerState.alt >= 1.0 && trainerState.alt <= 1.5) {
      trainerState.stage = 2;
      if (hudMission) hudMission.textContent = '任務 2：推右搖桿飛過 ① 穿門區 (165, 55)';
    }
    if (trainerState.stage === 2) {
      const distGate = Math.hypot(trainerState.x - 165, trainerState.y - 55);
      if (distGate < 24 && trainerState.alt >= 0.8) {
        trainerState.stage = 3;
        if (hudMission) hudMission.textContent = '任務 3：飛至 ② 停機坪並推左搖桿⬇️降落至 0.0m！';
      }
    }
    if (trainerState.stage === 3) {
      const distPad = Math.hypot(trainerState.x - 275, trainerState.y - 95);
      if (distPad < 22 && trainerState.alt <= 0.2) {
        trainerState.stage = 4;
        trainerState.alt = 0;
        if (hudMission) {
          hudMission.textContent = `🎉 挑戰成功！耗時 ${trainerState.elapsedSec.toFixed(1)} 秒（可點擊下方按鈕匯入 HCI 計算機）`;
        }
        if (trainerRecordBtn) trainerRecordBtn.disabled = false;
      }
    }
  }

  function applyStickAction(act) {
    if (trainerState.stage === 4) return;
    if (trainerState.startTime === null) {
      trainerState.startTime = performance.now();
    }
    trainerState.elapsedSec = (performance.now() - trainerState.startTime) / 1000;

    const rad = (trainerState.heading * Math.PI) / 180;
    const stepDist = stickMode === 'controller' ? 14 : 18;

    if (act === 'thr-up') {
      trainerState.alt = Math.min(2.0, +(trainerState.alt + 0.3).toFixed(1));
    } else if (act === 'thr-down') {
      trainerState.alt = Math.max(0.0, +(trainerState.alt - 0.3).toFixed(1));
    } else if (act === 'yaw-l') {
      trainerState.heading -= 30;
    } else if (act === 'yaw-r') {
      trainerState.heading += 30;
    } else if (act === 'pitch-f' || act === 'pitch-b' || act === 'roll-l' || act === 'roll-r') {
      if (trainerState.alt < 0.3) {
        if (hudMission) hudMission.textContent = '⚠️ 請先推左搖桿「⬆️ 油門+」起飛離地再平移！';
        return;
      }
      let localX = 0;
      let localY = 0;
      if (act === 'pitch-f') localY = -stepDist;
      if (act === 'pitch-b') localY = stepDist;
      if (act === 'roll-l') localX = -stepDist;
      if (act === 'roll-r') localX = stepDist;

      // Rotate local movement by drone heading (Mode 2 aircraft-frame control)
      let dx = localX * Math.cos(rad) - localY * Math.sin(rad);
      let dy = localX * Math.sin(rad) + localY * Math.cos(rad);

      // In phone mode, add slight touch drift/overshoot to demonstrate lack of tactile centering
      if (stickMode === 'phone') {
        dx += (Math.random() - 0.5) * 9;
        dy += (Math.random() - 0.5) * 9;
      }

      trainerState.x = Math.max(20, Math.min(300, trainerState.x + dx));
      trainerState.y = Math.max(20, Math.min(170, trainerState.y + dy));
    }

    updateTrainerVisuals();
  }

  dpadBtns.forEach((btn) => {
    btn.addEventListener('click', () => applyStickAction(btn.dataset.stickAct));
  });

  document.addEventListener('keydown', (e) => {
    const labPanel = document.getElementById('panel-lab');
    if (!labPanel || labPanel.hidden) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    const keyMap = {
      w: 'thr-up',
      W: 'thr-up',
      s: 'thr-down',
      S: 'thr-down',
      a: 'yaw-l',
      A: 'yaw-l',
      d: 'yaw-r',
      D: 'yaw-r',
      ArrowUp: 'pitch-f',
      ArrowDown: 'pitch-b',
      ArrowLeft: 'roll-l',
      ArrowRight: 'roll-r',
    };
    const act = keyMap[e.key];
    if (act) {
      e.preventDefault();
      applyStickAction(act);
    }
  });

  stickModeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stickModeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      stickMode = btn.dataset.stickMode;
    });
  });

  if (trainerResetBtn) {
    trainerResetBtn.addEventListener('click', () => {
      trainerState.x = 45;
      trainerState.y = 150;
      trainerState.alt = 0.0;
      trainerState.heading = 0;
      trainerState.stage = 1;
      trainerState.startTime = null;
      trainerState.elapsedSec = 0;
      if (hudMission) hudMission.textContent = '任務 1：推左搖桿⬆️起飛至 1.0m 以上';
      if (trainerRecordBtn) trainerRecordBtn.disabled = true;
      updateTrainerVisuals();
    });
  }

  if (trainerRecordBtn) {
    trainerRecordBtn.addEventListener('click', () => {
      const secVal = Math.max(5, Math.round(trainerState.elapsedSec));
      const targetInput = stickMode === 'controller' ? ctrlInput : appInput;
      if (targetInput) {
        targetInput.value = targetInput.value.trim()
          ? `${targetInput.value.trim()}, ${secVal}`
          : String(secVal);
        updateHci();
      }
      trainerRecordBtn.disabled = true;
      if (hudMission) {
        hudMission.textContent = `✅ 已將 ${secVal} 秒填入上方「${stickMode === 'controller' ? '🎮 實體手柄' : '📱 手機觸控'}」數據欄！`;
      }
    });
  }
});
