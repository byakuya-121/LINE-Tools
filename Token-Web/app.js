// ==========================================
// BYAKUYA DASHBOARD CONTROLLER (app.js)
// FIX VERSION: welcome-dashboard-switch-20261028
// ==========================================

// 🚀 1. ウェルカム画面からダッシュボードへ切り替え
function enterDashboard(btnEl) {
  const welcome = document.getElementById('welcome-window');
  const dashboard = document.getElementById('dashboard-window');

  console.info('[BYAKUYA] START button clicked.');

  if (!welcome) {
    console.error('[BYAKUYA] #welcome-window が見つかりません。');
    return;
  }

  if (!dashboard) {
    console.error('[BYAKUYA] #dashboard-window が見つかりません。');
    return;
  }

  // HTMLのonclickとイベントリスナーの二重実行を安全に処理
  if (dashboard.dataset.open === 'true') return;
  dashboard.dataset.open = 'true';

  // dashboard側の .hidden { display:none !important } を解除して表示
  dashboard.classList.remove('hidden');
  dashboard.style.display = 'block';
  dashboard.style.visibility = 'visible';
  dashboard.style.pointerEvents = 'auto';
  dashboard.style.opacity = '0';
  dashboard.style.transition = 'opacity 0.35s ease';
  dashboard.style.zIndex = '100';

  // ウェルカム画面をフェードアウト
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

  // セッション/API表示を切り替え後に更新
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
  toast.style.cssText = "background:rgba(10,15,25,0.95); border:1px solid var(--main-neon, #00ff88); padding:10px 16px; margin-bottom:8px; border-radius:3px; color:#fff; font-family:'JetBrains Mono',monospace; font-size:11px; box-shadow:0 0 10px rgba(0,255,136,0.2); transition: opacity 0.4s ease;";
  toast.innerHTML = '<div style="font-weight:bold; color:var(--main-neon, #00ff88); margin-bottom:2px;">[' + title + ']</div><div style="color:#d0d0d0;">' + message + '</div>';

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

    const uptimeBadge = document.getElementById('status-uptime');
    if (uptimeBadge && data.uptimeSeconds !== undefined) {
      const h = Math.floor(data.uptimeSeconds / 3600);
      const m = Math.floor((data.uptimeSeconds % 3600) / 60);
      const s = data.uptimeSeconds % 60;
      uptimeBadge.textContent = h + 'h ' + m + 'm ' + s + 's';
    }

    const sessionCountBadge = document.getElementById('status-sessions');
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

// 🚀 5. イベントリスナー一括登録
document.addEventListener('DOMContentLoaded', () => {
  console.info('[BYAKUYA] app.js FIX VERSION loaded.');
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

  const holdBtn = document.getElementById('btn-hold-sync');
  const tosCheck = document.getElementById('tos-agree-check');
  let holdTimer = null;

  if (holdBtn) {
    const startHold = (e) => {
      e.preventDefault();
      if (tosCheck && !tosCheck.checked) {
        showToast("SECURITY", "利用規約および注意事項に同意してください", "error");
        return;
      }

      holdBtn.classList.add('holding');
      holdTimer = setTimeout(async () => {
        holdBtn.classList.remove('holding');
        await executeTokenSync();
      }, 1500);
    };

    const cancelHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      holdBtn.classList.remove('holding');
    };

    holdBtn.addEventListener('mousedown', startHold);
    holdBtn.addEventListener('mouseup', cancelHold);
    holdBtn.addEventListener('mouseleave', cancelHold);

    holdBtn.addEventListener('touchstart', startHold, { passive: false });
    holdBtn.addEventListener('touchend', cancelHold);
    holdBtn.addEventListener('touchcancel', cancelHold);
  }

  const verifyBtn = document.getElementById('btn-verify-token');
  if (verifyBtn) {
    verifyBtn.addEventListener('click', executeTokenVerify);
  }

  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-copy-target');
      const targetEl = document.getElementById(targetId);
      if (targetEl && targetEl.textContent) {
        navigator.clipboard.writeText(targetEl.textContent.trim()).then(() => {
          showToast("SUCCESS", "クリップボードにコピーしました", "info");
        }).catch(() => {
          showToast("ERROR", "コピーに失敗しました", "error");
        });
      }
    });
  });
});

async function executeTokenSync() {
  const emailInput = document.getElementById('input-email');
  const passInput = document.getElementById('input-password');
  const resultBox = document.getElementById('sync-result-box');
  const pinBox = document.getElementById('pincode-box');
  const pinDisplay = document.getElementById('pincode-display');
  const authTokenDisplay = document.getElementById('auth-token-display');
  const jwtTokenDisplay = document.getElementById('jwt-token-display');

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
      if (pinBox) pinBox.classList.remove('hidden');
      showToast("PIN REQUIRED", "LINEアプリでPINコードを入力してください", "info");
      return;
    }

    if (data.authToken) {
      if (authTokenDisplay) authTokenDisplay.textContent = data.authToken;
      if (jwtTokenDisplay) jwtTokenDisplay.textContent = data.jwtToken || 'N/A';
      if (resultBox) resultBox.classList.remove('hidden');
      if (pinBox) pinBox.classList.add('hidden');
      showToast("SUCCESS", "トークン同期に成功しました", "info");
      refreshStatus();
    }
  } catch (err) {
    console.error("Sync error:", err);
    showToast("SYSTEM ERROR", "サーバーとの通信に失敗しました", "error");
  }
}

async function executeTokenVerify() {
  const authTokenDisplay = document.getElementById('auth-token-display');
  const verifyResult = document.getElementById('verify-result-status');
  
  const token = authTokenDisplay ? authTokenDisplay.textContent.trim() : '';
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

    if (verifyResult) {
      verifyResult.classList.remove('hidden');
      if (data.valid) {
        verifyResult.className = 'verify-status valid';
        verifyResult.textContent = '✓ VALID TOKEN (' + (data.displayName || 'LINE User') + ')';
        showToast("VERIFIED", "トークンは有効です: " + data.displayName, "info");
      } else {
        verifyResult.className = 'verify-status invalid';
        verifyResult.textContent = '✕ INVALID TOKEN: ' + (data.error || '無効');
        showToast("VERIFIED", "トークンが無効または期限切れです", "error");
      }
    }
  } catch (err) {
    showToast("SYSTEM ERROR", "検証APIとの通信に失敗しました", "error");
  }
}