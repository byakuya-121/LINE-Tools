// ==========================================
// BYAKUYA DASHBOARD CONTROLLER (app.js)
// FIXED DOM IDs to match index.html
// ==========================================

// 🚀 1. ウェルカム画面からダッシュボードへ切り替え
function enterDashboard(btnEl) {
  const welcome = document.getElementById('welcome-window');
  const dashboard = document.getElementById('dashboard-window');

  console.info('[BYAKUYA] START button clicked.');

  if (!welcome || !dashboard) return;

  if (dashboard.dataset.open === 'true') return;
  dashboard.dataset.open = 'true';

  dashboard.classList.remove('hidden');
  dashboard.style.display = 'block';
  dashboard.style.visibility = 'visible';
  dashboard.style.pointerEvents = 'auto';
  dashboard.style.opacity = '0';
  dashboard.style.transition = 'opacity 0.35s ease';
  dashboard.style.zIndex = '100';

  welcome.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
  welcome.style.opacity = '0';
  welcome.style.transform = 'scale(0.97)';
  welcome.style.pointerEvents = 'none';

  requestAnimationFrame(() => {
    dashboard.style.opacity = '1';
  });

  window.setTimeout(() => {
    welcome.style.display = 'none';
    console.info('[BYAKUYA] Dashboard displayed successfully.');
  }, 350);

  if (typeof refreshStatus === 'function') {
    refreshStatus();
  }
}
window.enterDashboard = enterDashboard;

// 🚀 2. モーダル制御
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  }
}
window.openModal = openModal;
window.closeModal = closeModal;

// 🚀 3. トースト通知
function showToast(title, message, type) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderColor = type === 'error' ? 'var(--accent-red)' : type === 'info' ? 'var(--cyan-neon)' : 'var(--main-neon)';
  toast.className = 'toast-card ' + (type || '');
  toast.style.cssText = "background:var(--panel-dark); border:1px solid var(--border-color); border-left:3px solid " + borderColor + "; padding:12px 14px; margin-bottom:8px; border-radius:2px; color:#fff; font-family:'JetBrains Mono',monospace; font-size:11px; box-shadow:0 0 20px rgba(0,0,0,0.9); transition: opacity 0.4s ease;";
  toast.innerHTML = '<div style="font-weight:bold; color:' + borderColor + '; margin-bottom:2px;">[' + title + ']</div><div style="color:#d0d0d0;">' + message + '</div>';

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}
window.showToast = showToast;

function formatDate(isoStr) {
  if (!isoStr) return 'N/A';
  try { return new Date(isoStr).toLocaleString('ja-JP'); } catch (e) { return isoStr; }
}

// 🚀 4. APIステータス更新
async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    if (!res.ok) return;
    const data = await res.json();

    const uptimeBadge = document.getElementById('stat-uptime');
    if (uptimeBadge && data.uptimeSeconds !== undefined) {
      const h = Math.floor(data.uptimeSeconds / 3600);
      const m = Math.floor((data.uptimeSeconds % 3600) / 60);
      const s = data.uptimeSeconds % 60;
      uptimeBadge.textContent = h + 'h ' + m + 'm ' + s + 's';
    }

    const statApi = document.getElementById('stat-api');
    if (statApi) statApi.textContent = data.status || 'ONLINE';

    const sessionCountBadge = document.getElementById('stat-sessions');
    if (sessionCountBadge && data.sessionCount !== undefined) {
      sessionCountBadge.textContent = String(data.sessionCount);
    }

    const modalCount = document.getElementById('modal-session-count');
    if (modalCount && data.sessionCount !== undefined) {
      modalCount.textContent = String(data.sessionCount);
    }

    const modalList = document.getElementById('modal-session-list');
    if (modalList) {
      if (Array.isArray(data.sessions) && data.sessions.length > 0) {
        modalList.innerHTML = data.sessions.map((s, idx) => 
          '<div style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); margin-bottom:6px; border-radius:2px;">' +
            '<div>' +
              '<div style="font-weight:700; color:var(--main-neon);">#' + (idx + 1) + ' - USER: ' + (s.userId || 'REGISTERED_ACCOUNT') + '</div>' +
              '<div style="font-size:9.5px; color:var(--text-sub); margin-top:3px;">LOGIN TIME: ' + formatDate(s.startedAt) + '</div>' +
            '</div>' +
            '<div style="text-align:right;">' +
              '<span style="font-size:9px; color:var(--main-neon); border:1px solid var(--main-neon); padding:2px 6px; border-radius:2px;">ONLINE</span>' +
            '</div>' +
          '</div>'
        ).join('');
      } else {
        modalList.innerHTML = '<div style="color:var(--text-sub); text-align:center; padding:20px;">現在アクティブな認証セッションはありません。</div>';
      }
    }
  } catch (err) {}
}

// 🚀 5. イベントリスナー一括登録 (index.html の ID に完全対応)
document.addEventListener('DOMContentLoaded', () => {
  console.info('[BYAKUYA] app.js matched with fixed index.html loaded.');
  refreshStatus();
  setInterval(refreshStatus, 5000);

  const btnStart = document.getElementById('btn-start-tools');
  if (btnStart) {
    btnStart.addEventListener('click', function(e) {
      enterDashboard(this);
    });
  }

  const btnReloadSessions = document.getElementById('btn-reload-sessions');
  if (btnReloadSessions) {
    btnReloadSessions.addEventListener('click', () => {
      refreshStatus();
      showToast("SESSION", "セッションリストを更新しました", "info");
    });
  }

  // 🔑 ホールド認証ボタン (ID: btn-sync-token / agree-terms-check)
  const holdBtn = document.getElementById('btn-sync-token');
  const tosCheck = document.getElementById('agree-terms-check');
  const progressBg = document.getElementById('btn-progress-bg');
  let holdTimer = null;
  let progressInterval = null;

  if (holdBtn) {
    const startHold = (e) => {
      e.preventDefault();
      if (tosCheck && !tosCheck.checked) {
        showToast("SECURITY", "利用規約および注意事項に同意してください", "error");
        return;
      }

      let progress = 0;
      if (progressBg) progressBg.style.width = '0%';

      progressInterval = setInterval(() => {
        progress += 5;
        if (progressBg) progressBg.style.width = progress + '%';
        if (progress >= 100) {
          clearInterval(progressInterval);
        }
      }, 50);

      holdTimer = setTimeout(async () => {
        if (progressBg) progressBg.style.width = '0%';
        await executeTokenSync();
      }, 1000);
    };

    const cancelHold = () => {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (progressInterval) { clearInterval(progressInterval); progressInterval = null; }
      if (progressBg) progressBg.style.width = '0%';
    };

    holdBtn.addEventListener('mousedown', startHold);
    holdBtn.addEventListener('mouseup', cancelHold);
    holdBtn.addEventListener('mouseleave', cancelHold);

    holdBtn.addEventListener('touchstart', startHold, { passive: false });
    holdBtn.addEventListener('touchend', cancelHold);
    holdBtn.addEventListener('touchcancel', cancelHold);
  }

  // Verify ボタン
  const verifyBtn = document.getElementById('btn-verify-token');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', executeTokenVerify);
  }

  // 📋 ワンクリックコピーボタン各種
  const btnCopyToken = document.getElementById('btn-copy-token');
  if (btnCopyToken) {
    btnCopyToken.addEventListener('click', () => {
      const el = document.getElementById('token-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(() => showToast("SUCCESS", "AuthTokenをコピーしました", "info"));
      } else {
        showToast("WARN", "コピー対象のトークンが存在しません", "error");
      }
    });
  }

  const btnCopyJwt = document.getElementById('btn-copy-jwt');
  if (btnCopyJwt) {
    btnCopyJwt.addEventListener('click', () => {
      const el = document.getElementById('jwt-token-output');
      if (el && el.value) {
        navigator.clipboard.writeText(el.value).then(() => showToast("SUCCESS", "JWT Tokenをコピーしました", "info"));
      } else {
        showToast("WARN", "コピー対象のトークンが存在しません", "error");
      }
    });
  }

  const btnCopyPin = document.getElementById('btn-copy-pin');
  if (btnCopyPin) {
    btnCopyPin.addEventListener('click', () => {
      const el = document.getElementById('pin-code-val');
      if (el && el.textContent) {
        navigator.clipboard.writeText(el.textContent.trim()).then(() => showToast("SUCCESS", "PINコードをコピーしました", "info"));
      }
    });
  }
});

// 🚀 トークン取得 API 実行関数 (index.html の ID に完全合わせ)
async function executeTokenSync() {
  const emailInput = document.getElementById('line-email');
  const passInput = document.getElementById('line-password');
  const resultBox = document.getElementById('result-box');
  const pinBox = document.getElementById('pin-display-area');
  const pinDisplay = document.getElementById('pin-code-val');
  const tokenArea = document.getElementById('token-display-area');
  const authTokenDisplay = document.getElementById('token-output');
  const jwtTokenDisplay = document.getElementById('jwt-token-output');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (!email || !password) {
    showToast("INPUT ERROR", "メールアドレスとパスワードを入力してください", "error");
    return;
  }

  showToast("PROCESS", "LINEJS ログイン処理を実行中...", "info");

  try {
    const res = await fetch('/api/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      showToast("SYNC FAILED", data.error || "認証に失敗しました", "error");
      return;
    }

    if (data.pincode) {
      if (pinDisplay) pinDisplay.textContent = data.pincode;
      if (resultBox) resultBox.classList.remove('hidden');
      if (pinBox) pinBox.classList.remove('hidden');
      if (tokenArea) tokenArea.classList.add('hidden');
      showToast("PIN REQUIRED", "LINEアプリでPINコードを入力してください", "info");
      return;
    }

    if (data.authToken) {
      if (authTokenDisplay) authTokenDisplay.value = data.authToken;
      if (jwtTokenDisplay) jwtTokenDisplay.value = data.jwtToken || 'N/A';
      if (resultBox) resultBox.classList.remove('hidden');
      if (pinBox) pinBox.classList.add('hidden');
      if (tokenArea) tokenArea.classList.remove('hidden');
      showToast("SUCCESS", "トークン同期に成功しました", "info");
      if (typeof refreshStatus === 'function') refreshStatus();
    }
  } catch (err) {
    console.error("Sync error:", err);
    showToast("SYSTEM ERROR", "サーバーとの通信に失敗しました", "error");
  }
}

// 🚀 トークン検証 API 実行関数 (index.html の ID に完全合わせ)
async function executeTokenVerify() {
  const authTokenInput = document.getElementById('token-output');
  const verifyResultBox = document.getElementById('verify-status-box');
  const verifyResultText = document.getElementById('verify-status-text');

  const token = authTokenInput ? authTokenInput.value.trim() : '';
  if (!token || token === '---') {
    showToast("VERIFY ERROR", "検証対象のAuthTokenが存在しません", "error");
    return;
  }

  showToast("VERIFY", "トークンの実効性を検証中...", "info");

  try {
    const res = await fetch('/api/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authToken: token })
    });

    const data = await res.json();

    if (verifyResultBox) {
      verifyResultBox.classList.remove('hidden');
      if (data.valid) {
        if (verifyResultText) verifyResultText.innerHTML = '<span style="color:var(--main-neon); font-weight:700;">✓ VALID TOKEN (' + (data.displayName || 'LINE User') + ')</span>';
        showToast("VERIFIED", "トークンは有効です: " + data.displayName, "info");
      } else {
        if (verifyResultText) verifyResultText.innerHTML = '<span style="color:var(--accent-red); font-weight:700;">✕ INVALID TOKEN: ' + (data.error || '無効') + '</span>';
        showToast("VERIFIED", "トークンが無効または期限切れです", "error");
      }
    }
  } catch (err) {
    showToast("SYSTEM ERROR", "検証APIとの通信に失敗しました", "error");
  }
}