"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    welcome: document.getElementById("welcome-window"),
    dashboard: document.getElementById("dashboard-window"),
    transition: document.getElementById("cyber-transition"),
    toastContainer: document.getElementById("toast-container"),
    start: document.getElementById("start-btn"),
    exit: document.getElementById("exit-btn"),
    refresh: document.getElementById("refresh-btn"),
    apiDot: document.getElementById("api-dot"),
    apiStatus: document.getElementById("api-status"),
    statApi: document.getElementById("stat-api"),
    statUptime: document.getElementById("stat-uptime"),
    statSessions: document.getElementById("stat-sessions"),
    serverMessage: document.getElementById("server-message"),
    serverStarted: document.getElementById("server-started"),
    serverTime: document.getElementById("server-time"),
    lastUpdated: document.getElementById("last-updated"),
    sessionCountBadge: document.getElementById("session-count-badge"),
    sessionList: document.getElementById("session-list"),
    logs: document.getElementById("terminal-logs"),
    searchInput: document.getElementById("tool-search-input"),
    toolsGrid: document.getElementById("tools-grid"),
    typingText: document.getElementById("typing-sub-text")
  };

  let refreshTimer = null;
  let requestInProgress = false;

  // 🌈 AUTO モード用 7色レインボー循環タイマー
  let autoThemeTimer = null;
  let autoHue = 0;

  function stopAutoTheme() {
    if (autoThemeTimer) {
      clearInterval(autoThemeTimer);
      autoThemeTimer = null;
    }
    document.body.style.removeProperty('--main-neon');
    document.body.style.removeProperty('--cyan-neon');
    document.body.style.removeProperty('--border-color');
    document.body.style.removeProperty('--accent-purple');
  }

  function startAutoTheme() {
    stopAutoTheme();
    autoThemeTimer = setInterval(() => {
      autoHue = (autoHue + 1) % 360;
      const mainNeon = `hsl(${autoHue}, 100%, 50%)`;
      const cyanNeon = `hsl(${(autoHue + 60) % 360}, 100%, 50%)`;
      const borderCol = `hsla(${autoHue}, 100%, 50%, 0.35)`;
      const accentPurp = `hsl(${(autoHue + 120) % 360}, 100%, 50%)`;

      document.body.style.setProperty('--main-neon', mainNeon);
      document.body.style.setProperty('--cyan-neon', cyanNeon);
      document.body.style.setProperty('--border-color', borderCol);
      document.body.style.setProperty('--accent-purple', accentPurp);
    }, 40);
  }

  // カラーテーマの適用と保持
  window.setTheme = function(themeName) {
    const themes = ["auto", "matrix", "purple", "cyan", "amber"];

    if (themeName === "auto") {
      document.body.setAttribute("data-theme", "auto");
      startAutoTheme();
    } else {
      stopAutoTheme();
      if (themeName === "matrix") {
        document.body.removeAttribute("data-theme");
      } else {
        document.body.setAttribute("data-theme", themeName);
      }
    }
    localStorage.setItem("byakuya_theme", themeName);

    document.querySelectorAll(".theme-btn").forEach((btn, index) => {
      if (themes[index] === themeName) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });

    showToast("THEME", `Switched to ${themeName.toUpperCase()} mode`, "info");
  };

  const savedTheme = localStorage.getItem("byakuya_theme") || "matrix";
  window.setTheme(savedTheme);

  // タイピングアニメーション
  const subtitleString = "// NEXT-GEN LINEJS & OPENCHAT AUTOMATION SYSTEM [v3.4.2]";
  let typingIndex = 0;

  function startTypingAnimation() {
    if (!elements.typingText) return;
    elements.typingText.textContent = "";
    typingIndex = 0;
    const interval = setInterval(() => {
      if (typingIndex < subtitleString.length) {
        elements.typingText.textContent += subtitleString.charAt(typingIndex);
        typingIndex++;
      } else {
        clearInterval(interval);
      }
    }, 40);
  }

  // モーダル操作
  window.openModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("hidden");
  };

  window.closeModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  };

  function showToast(tag, msg, type = "success") {
    if (!elements.toastContainer) return;
    const card = document.createElement("div");
    card.className = `toast-card ${type}`;
    const time = new Date().toLocaleTimeString("ja-JP");
    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
        <span style="font-family:'Orbitron',sans-serif; font-size:9px; font-weight:800; color:var(--main-neon);">[${tag.toUpperCase()}]</span>
        <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:var(--text-dim);">${time}</span>
      </div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:10px; color:#FFF;">${msg}</div>
    `;
    elements.toastContainer.appendChild(card);
    setTimeout(() => card.remove(), 3200);
  }

  function addLog(msg, type = "info") {
    if (!elements.logs) return;
    const time = new Date().toLocaleTimeString("ja-JP");
    const line = document.createElement("div");
    line.className = "log-line";
    const cls = type === "success" ? "log-success" : "";
    line.innerHTML = `<span class="log-time">[${time}]</span><span class="${cls}">${msg}</span>`;
    elements.logs.appendChild(line);
    elements.logs.scrollTop = elements.logs.scrollHeight;
  }

  if (elements.searchInput && elements.toolsGrid) {
    elements.searchInput.addEventListener("input", (e) => {
      const keyword = e.target.value.toLowerCase().trim();
      const cards = elements.toolsGrid.querySelectorAll(".tool-card");
      cards.forEach(card => {
        const title = card.querySelector(".tool-title")?.textContent.toLowerCase() || "";
        const desc = card.querySelector(".tool-desc")?.textContent.toLowerCase() || "";
        const keywords = card.getAttribute("data-keywords") || "";
        if (!keyword || title.includes(keyword) || desc.includes(keyword) || keywords.includes(keyword)) {
          card.classList.remove("hidden");
        } else {
          card.classList.add("hidden");
        }
      });
    });
  }

  function showDashboard() {
    if (elements.transition) elements.transition.classList.remove("hidden");
    setTimeout(() => {
      if (elements.welcome) elements.welcome.classList.add("hidden");
      if (elements.dashboard) elements.dashboard.classList.remove("hidden");
      if (elements.transition) elements.transition.classList.add("hidden");
      startTypingAnimation();
      showToast("SYSTEM", "Control Center Loaded", "success");
      refreshStatus();
      if (refreshTimer !== null) clearInterval(refreshTimer);
      refreshTimer = setInterval(refreshStatus, 5000);
    }, 650);
  }

  function showWelcome() {
    if (elements.dashboard) elements.dashboard.classList.add("hidden");
    if (elements.welcome) elements.welcome.classList.remove("hidden");
    showToast("SYSTEM", "Returned to Welcome Portal", "info");
    if (refreshTimer !== null) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }
  }

  function formatDate(val) {
    if (!val) return "--";
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? "--" : d.toLocaleString("ja-JP");
  }

  function formatUptime(secs) {
    if (!Number.isFinite(secs) || secs < 0) return "--";
    const total = Math.floor(secs);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const h = Math.floor((total % 86400) / 3600);
    return `${h}h ${m}m ${s}s`;
  }

  async function refreshStatus() {
    if (requestInProgress) return;
    requestInProgress = true;
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      
      if (elements.apiStatus) elements.apiStatus.textContent = "ONLINE";
      if (elements.statApi) elements.statApi.textContent = "ONLINE";
      if (elements.apiDot) elements.apiDot.className = "status-dot online";

      if (elements.statUptime) elements.statUptime.textContent = formatUptime(data.uptimeSeconds);
      if (elements.statSessions) elements.statSessions.textContent = String(data.sessionCount);
      if (elements.serverStarted) elements.serverStarted.textContent = formatDate(data.startedAt);
      if (elements.serverTime) elements.serverTime.textContent = formatDate(data.serverTime);
      if (elements.serverMessage) elements.serverMessage.textContent = data.message || "正常稼働中";
      if (elements.lastUpdated) elements.lastUpdated.textContent = formatDate(new Date());
      if (elements.sessionCountBadge) elements.sessionCountBadge.textContent = String(data.sessionCount);

      if (elements.sessionList) {
        if (Array.isArray(data.sessions) && data.sessions.length > 0) {
          elements.sessionList.innerHTML = data.sessions.map(s => 
            `<div style="padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
              <div>
                <div style="font-weight:700; color:#FFF;">${s.userId || 'UNKNOWN USER'}</div>
                <div style="font-size:9px; color:var(--text-dim); margin-top:2px;">Started: ${formatDate(s.startedAt)}</div>
              </div>
              <span style="font-size:8px; color:var(--main-neon); border:1px solid var(--border-color); padding:2px 5px;">REGISTERED</span>
            </div>`
          ).join("");
        } else {
          elements.sessionList.textContent = "アクティブなセッションはありません。";
        }
      }

      addLog("Status synchronized with server.", "success");
    } catch (e) {
      if (elements.apiStatus) elements.apiStatus.textContent = "OFFLINE";
      if (elements.statApi) elements.statApi.textContent = "OFFLINE";
      if (elements.apiDot) elements.apiDot.className = "status-dot offline";
      addLog(`Connection error: ${e.message}`, "error");
    } finally {
      requestInProgress = false;
    }
  }

  // 🔑 長押し（ホールド）ボタン & 認証結果表示ロジック
  let holdInterval = null;
  const HOLD_DURATION = 1500;
  const btnSync = document.getElementById('btn-sync-token');
  const btnProgressBg = document.getElementById('btn-progress-bg');
  const btnSyncText = document.getElementById('btn-sync-text');

  function startHold(e) {
    if (!btnSync || btnSync.disabled) return;
    if (btnProgressBg) {
      btnProgressBg.style.transition = 'none';
      btnProgressBg.style.width = '0%';
    }
    if (btnSyncText) btnSyncText.textContent = '⌛ そのまま長押し...';
    
    const startTime = Date.now();
    holdInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
      if (btnProgressBg) btnProgressBg.style.width = progress + '%';

      if (elapsed >= HOLD_DURATION) {
        clearInterval(holdInterval);
        holdInterval = null;
        if (btnProgressBg) btnProgressBg.style.width = '100%';
        if (navigator.vibrate) navigator.vibrate(50);
        executeTokenSync();
      }
    }, 30);
  }

  function cancelHold() {
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
    if (btnSync && !btnSync.disabled) {
      if (btnProgressBg) {
        btnProgressBg.style.transition = 'width 0.2s ease-out';
        btnProgressBg.style.width = '0%';
      }
      if (btnSyncText) btnSyncText.textContent = '🔑 ホールドして認証開始 (長押し)';
    }
  }

  if (btnSync) {
    btnSync.addEventListener('mousedown', startHold);
    btnSync.addEventListener('touchstart', startHold, { passive: true });
    btnSync.addEventListener('mouseup', cancelHold);
    btnSync.addEventListener('mouseleave', cancelHold);
    btnSync.addEventListener('touchend', cancelHold);
    btnSync.addEventListener('touchcancel', cancelHold);
  }

  async function executeTokenSync() {
    const email = document.getElementById('line-email')?.value.trim() || "";
    const password = document.getElementById('line-password')?.value.trim() || "";

        const agreeCheck = document.getElementById('agree-terms-check');
    if (!agreeCheck || !agreeCheck.checked) {
      showToast("AGREEMENT REQUIRED", "利用規約および注意事項への同意チェックが必要です", "error");
      cancelHold();
      return;
    }

    if (!email || !password) {
      showToast("AUTH ERROR", "Eメールとパスワードを入力してください", "error");
      cancelHold();
      return;
    }

    if (btnSync) btnSync.disabled = true;
    if (btnSyncText) btnSyncText.textContent = '🚀 認証通信中...';

    try {
      const res = await fetch('/api/sync-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      const resultBox = document.getElementById('result-box');
      const pinArea = document.getElementById('pin-display-area');
      const tokenArea = document.getElementById('token-display-area');

      if (resultBox) resultBox.classList.remove('hidden');

      if (data.authToken) {
        if (pinArea) pinArea.classList.add('hidden');
        if (tokenArea) tokenArea.classList.remove('hidden');
        const tokenOut = document.getElementById('token-output');
        const jwtOut = document.getElementById('jwt-token-output');
        if (tokenOut) tokenOut.value = data.authToken;
        if (jwtOut) jwtOut.value = data.jwtToken || data.accessToken || ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + btoa(data.authToken).replace(/=/g, ""));
        showToast("SUCCESS", "AuthTokenの取得に成功しました！", "success");
        addLog("AuthToken successfully acquired.", "success");
      } else if (data.pincode) {
        if (tokenArea) tokenArea.classList.add('hidden');
        if (pinArea) pinArea.classList.remove('hidden');
        const pinVal = document.getElementById('pin-code-val');
        if (pinVal) pinVal.textContent = data.pincode;
        showToast("PIN WAIT", `PINコード [ ${data.pincode} ] をスマホに入力してください`, "info");
        addLog(`PIN code issued: [ ${data.pincode} ]`, "info");
      } else {
        showToast("AUTH ERROR", data.error || "認証に失敗しました", "error");
      }
    } catch (err) {
      showToast("SYSTEM ERROR", err.message, "error");
    } finally {
      if (btnSync) btnSync.disabled = false;
      if (btnProgressBg) btnProgressBg.style.width = '0%';
      if (btnSyncText) btnSyncText.textContent = '🔑 ホールドして認証開始 (長押し)';
    }
  }

  // 🧪 トークン有効性検証 (Token Verification)
  document.getElementById('btn-verify-token')?.addEventListener('click', async () => {
    const tokenInput = document.getElementById('token-output')?.value.trim() || "";
    const statusBox = document.getElementById('verify-status-box');
    const statusText = document.getElementById('verify-status-text');

    if (!tokenInput) {
      showToast("CHECK ERROR", "検証するTokenを入力または取得してください", "error");
      return;
    }

    const btn = document.getElementById('btn-verify-token');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '⌛ Validating Token...';
    }
    if (statusBox) statusBox.classList.remove('hidden');
    if (statusText) statusText.innerHTML = '<span style="color:var(--cyan-neon);">⌛ LINEJS サーバーへ検証リクエスト送信中...</span>';

    try {
      const res = await fetch('/api/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: tokenInput })
      });

      if (!res.ok) {
        const errText = await res.text();
        if (res.status === 404) {
          throw new Error("404 Not Found: サーバーのデプロイ完了をお待ちください。");
        }
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      if (data.valid) {
        if (statusText) statusText.innerHTML = `<span style="color:var(--main-neon); font-weight:700;">✓ VALID TOKEN</span><br><span style="color:#FFF;">アカウント表示名: ${data.displayName || 'LINE User'}</span>`;
        showToast("VERIFY SUCCESS", "Tokenは有効です！", "success");
        addLog(`Token Verification: VALID (${data.displayName || 'OK'})`, "success");
      } else {
        if (statusText) statusText.innerHTML = `<span style="color:var(--accent-red); font-weight:700;">✕ INVALID TOKEN</span><br><span style="color:var(--text-sub);">${data.error || '期限切れ、または無効なトークンです'}</span>`;
        showToast("VERIFY FAILED", "無効なTokenです", "error");
        addLog(`Token Verification: INVALID`, "error");
      }
    } catch (err) {
      if (statusText) statusText.innerHTML = `<span style="color:var(--accent-red);">通信エラー: ${err.message}</span>`;
      showToast("SYSTEM ERROR", err.message, "error");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🧪 トークン有効性チェック (Verify Token)';
      }
    }
  });

  // コピー処理
  document.getElementById('btn-copy-pin')?.addEventListener('click', () => {
    const pin = document.getElementById('pin-code-val')?.textContent || "";
    if (pin) {
      navigator.clipboard.writeText(pin);
      showToast("COPIED", `PINコード [ ${pin} ] をコピーしました`, "success");
    }
  });

  document.getElementById('btn-copy-token')?.addEventListener('click', () => {
    const output = document.getElementById('token-output');
    if (output) {
      output.select();
      navigator.clipboard.writeText(output.value);
      showToast("COPIED", "AuthTokenをクリップボードにコピーしました", "success");
    }
  });

  document.getElementById('btn-copy-jwt')?.addEventListener('click', () => {
    const output = document.getElementById('jwt-token-output');
    if (output) {
      output.select();
      navigator.clipboard.writeText(output.value);
      showToast("COPIED", "JWT Token (ey...) をコピーしました", "success");
    }
  });

  // 🚀 ボタンイベントの登録（安全ガード付き）
  if (elements.start) elements.start.addEventListener("click", showDashboard);
  if (elements.exit) elements.exit.addEventListener("click", showWelcome);
  if (elements.refresh) {
    elements.refresh.addEventListener("click", () => {
      refreshStatus();
      showToast("REFRESH", "API Sync Triggered", "info");
    });
  }
});