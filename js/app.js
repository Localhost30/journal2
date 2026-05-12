// === Configuration ===
const API_URL = '/api';

// === État de l'application ===
let trades = [];
let settings = { initialCapital: 10000, currency: 'USD' };
let editingTradeId = null;
let charts = {};
let currentUser = null;
let otpEmail = '';
let resendInterval = null;
let currentTheme = localStorage.getItem('theme') || 'dark';

// === Toast Notifications ===
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// === Theme ===
function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.classList.toggle('light', theme === 'light');
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

// === Auth Helpers ===
function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, opts);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
}

// === Page Navigation ===
function showPage(pageId) {
  const pages = ['loginPage', 'signupPage', 'forgotPage', 'otpPage', 'resetPasswordPage', 'appPage'];
  pages.forEach(id => {
    document.getElementById(id).style.display = id === pageId ? '' : 'none';
  });
}

function showApp() {
  showPage('appPage');
  applyTheme(currentTheme);
  updateUserUI();
  loadData().then(() => {
    setupUI();
    renderTrades();
    updateFilters();
    renderAnalysis();
    renderStats();
    updateCharts();
    updateDashboard();
  });
}

function showLogin() {
  showPage('loginPage');
}

function updateUserUI() {
  if (!currentUser) return;
  const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  document.getElementById('userAvatar').textContent = initials;
  document.getElementById('dropdownUserName').textContent = currentUser.name;
  document.getElementById('dropdownUserEmail').textContent = currentUser.email;
}

// === Auth: Login ===
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    setToken(data.token);
    currentUser = data.user;
    showToast('Connexion réussie !', 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auth: Signup ===
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  if (password !== confirmPassword) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }

  try {
    const data = await apiCall('/auth/register', 'POST', { name, email, password });
    setToken(data.token);
    currentUser = data.user;
    showToast('Compte créé avec succès !', 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auth: Forgot Password ===
document.getElementById('forgotForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  otpEmail = email;

  try {
    await apiCall('/auth/forgot-password', 'POST', { email });
    showToast('Code OTP envoyé à votre email', 'success');
    document.getElementById('otpEmailDisplay').textContent = email;
    showPage('otpPage');
    startResendTimer();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auth: OTP Input ===
document.querySelectorAll('.otp-input').forEach((input, index, inputs) => {
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    if (value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }
    input.classList.toggle('filled', value.length === 1);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1].focus();
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, 6);
    paste.split('').forEach((char, i) => {
      if (inputs[i]) {
        inputs[i].value = char;
        inputs[i].classList.add('filled');
      }
    });
    if (inputs[paste.length - 1]) inputs[paste.length - 1].focus();
  });
});

// === Auth: OTP Verification ===
document.getElementById('otpForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = Array.from(document.querySelectorAll('.otp-input')).map(i => i.value).join('');

  if (code.length < 6) {
    showToast('Veuillez entrer le code complet', 'error');
    return;
  }

  try {
    await apiCall('/auth/verify-otp', 'POST', { email: otpEmail, code });
    showToast('Code vérifié ! Créez votre nouveau mot de passe', 'success');
    showPage('resetPasswordPage');
    if (resendInterval) clearInterval(resendInterval);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

function startResendTimer() {
  let seconds = 60;
  document.getElementById('resendTimer').style.display = '';
  document.getElementById('resendLink').style.display = 'none';
  document.getElementById('resendCountdown').textContent = seconds;

  if (resendInterval) clearInterval(resendInterval);
  resendInterval = setInterval(() => {
    seconds--;
    document.getElementById('resendCountdown').textContent = seconds;
    if (seconds <= 0) {
      clearInterval(resendInterval);
      document.getElementById('resendTimer').style.display = 'none';
      document.getElementById('resendLink').style.display = '';
    }
  }, 1000);
}

document.getElementById('resendOtpBtn').addEventListener('click', async () => {
  try {
    await apiCall('/auth/forgot-password', 'POST', { email: otpEmail });
    showToast('Nouveau code envoyé', 'success');
    startResendTimer();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auth: Reset Password ===
document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (password !== confirmPassword) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }

  try {
    await apiCall('/auth/reset-password', 'POST', { email: otpEmail, password });
    showToast('Mot de passe réinitialisé ! Connectez-vous', 'success');
    showLogin();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auth: Navigation Links ===
document.getElementById('goToSignup').addEventListener('click', (e) => {
  e.preventDefault();
  showPage('signupPage');
});

document.getElementById('goToLogin').addEventListener('click', (e) => {
  e.preventDefault();
  showLogin();
});

document.getElementById('forgotPasswordLink').addEventListener('click', (e) => {
  e.preventDefault();
  showPage('forgotPage');
});

document.getElementById('backToLoginFromForgot').addEventListener('click', (e) => {
  e.preventDefault();
  showLogin();
});

document.getElementById('backToLoginFromOtp').addEventListener('click', (e) => {
  e.preventDefault();
  if (resendInterval) clearInterval(resendInterval);
  showLogin();
});

// === User Dropdown ===
document.getElementById('userAvatar').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('show');
});

document.addEventListener('click', () => {
  document.getElementById('userDropdown').classList.remove('show');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  clearToken();
  currentUser = null;
  trades = [];
  showLogin();
  showToast('Déconnexion réussie', 'info');
});

document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
  if (!confirm('Voulez-vous vraiment supprimer votre compte ? Toutes vos données seront perdues.')) return;
  if (!confirm('Cette action est irréversible. Continuer ?')) return;

  try {
    await apiCall('/auth/delete-account', 'DELETE');
    clearToken();
    currentUser = null;
    trades = [];
    showLogin();
    showToast('Compte supprimé', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Profile Modal ===
document.getElementById('profileBtn').addEventListener('click', () => {
  document.getElementById('userDropdown').classList.remove('show');
  openProfileModal();
});

function openProfileModal() {
  if (!currentUser) return;
  const initials = currentUser.name ? currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';
  document.getElementById('profileAvatarLg').textContent = initials;
  document.getElementById('profileName').textContent = currentUser.name;
  document.getElementById('profileEmail').textContent = currentUser.email;
  document.getElementById('profileEditName').value = currentUser.name;
  document.getElementById('profileEditEmail').value = currentUser.email;
  document.getElementById('profileEditPassword').value = '';
  document.getElementById('profileTradeCount').textContent = trades.length;
  document.getElementById('profileMemberSince').textContent = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('profileModal').classList.add('active');
}

document.getElementById('profileForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('profileEditName').value;
  const email = document.getElementById('profileEditEmail').value;
  const password = document.getElementById('profileEditPassword').value || undefined;

  try {
    const data = await apiCall('/auth/update-profile', 'PUT', { name, email, password });
    currentUser = data.user;
    updateUserUI();
    closeModals();
    showToast('Profil mis à jour', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// === Auto-login on page load ===
async function checkAuth() {
  applyTheme(currentTheme);
  const token = getToken();
  if (!token) {
    showLogin();
    return;
  }

  try {
    const data = await apiCall('/auth/me');
    currentUser = data.user;
    showApp();
  } catch (err) {
    clearToken();
    showLogin();
  }
}

// === Gestion des données ===
async function loadData() {
  try {
    const data = await apiCall('/trades');
    trades = data.trades || [];
    const settingsData = await apiCall('/settings');
    settings = settingsData.settings || { initialCapital: 10000, currency: 'USD' };
  } catch (err) {
    const savedTrades = localStorage.getItem('trades');
    const savedSettings = localStorage.getItem('tradingSettings');
    trades = savedTrades ? JSON.parse(savedTrades) : [];
    settings = savedSettings ? JSON.parse(savedSettings) : { initialCapital: 10000, currency: 'USD' };
  }
}

async function saveData() {
  try {
    await apiCall('/trades', 'PUT', { trades });
    await apiCall('/settings', 'PUT', settings });
  } catch (err) {
    localStorage.setItem('trades', JSON.stringify(trades));
    localStorage.setItem('tradingSettings', JSON.stringify(settings));
  }
}

// === Dashboard Overview ===
function updateDashboard() {
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const capital = settings.initialCapital + totalPnL;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const winrate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const dashCapital = document.getElementById('dashCapital');
  dashCapital.textContent = `$${capital.toFixed(2)}`;
  dashCapital.className = `dashboard-value ${totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral'}`;

  const dashPnl = document.getElementById('dashPnl');
  dashPnl.textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
  dashPnl.className = `dashboard-value ${totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral'}`;

  document.getElementById('dashWinrate').textContent = `${winrate.toFixed(1)}%`;
  document.getElementById('dashTrades').textContent = trades.length;
}

// === Configuration de l'UI ===
function setupUI() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true));
  });
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', closeModals);
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModals();
    });
  });

  document.getElementById('addTradeBtn').addEventListener('click', () => openAddTradeModal());
  document.getElementById('tradeForm').addEventListener('submit', handleTradeSubmit);

  document.getElementById('filterStrategy').addEventListener('change', renderTrades);
  document.getElementById('filterTimeframe').addEventListener('change', renderTrades);
  document.getElementById('filterMonth').addEventListener('change', renderTrades);
  document.getElementById('analysisMonth').addEventListener('change', renderAnalysis);

  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportPDF);

  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('entryDate').value = localNow;
  document.getElementById('exitDate').value = localNow;

  document.getElementById('editTradeBtn').addEventListener('click', editCurrentTrade);
  document.getElementById('deleteTradeBtn').addEventListener('click', deleteCurrentTrade);
}

function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-tab="${tab}"]`).classList.add('active');
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.getElementById(`${tab}Tab`).classList.add('active');

  if (tab === 'analysis') renderAnalysis();
  if (tab === 'stats') { renderStats(); updateCharts(); }
}

function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
  editingTradeId = null;
  document.getElementById('tradeForm').reset();
}

// === Gestion des Trades ===
function openAddTradeModal() {
  editingTradeId = null;
  document.getElementById('tradeForm').reset();
  document.querySelector('#addTradeModal h2').textContent = 'Nouveau Trade';
  document.querySelector('#addTradeModal .btn-primary').textContent = 'Enregistrer';
  const now = new Date();
  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('entryDate').value = localNow;
  document.getElementById('exitDate').value = localNow;
  document.getElementById('addTradeModal').classList.add('active');
}

function handleTradeSubmit(e) {
  e.preventDefault();

  const pair = document.getElementById('pair').value;
  const direction = document.getElementById('direction').value;
  const entryPrice = parseFloat(document.getElementById('entryPrice').value);
  const exitPrice = parseFloat(document.getElementById('exitPrice').value);
  const positionSize = parseFloat(document.getElementById('positionSize').value);
  const positionUnit = document.getElementById('positionUnit').value;
  const pnl = parseFloat(document.getElementById('pnl').value) || 0;
  const pnlPercent = parseFloat(document.getElementById('pnlPercent').value) || 0;
  const entryDate = document.getElementById('entryDate').value;
  const exitDate = document.getElementById('exitDate').value;
  const strategy = document.getElementById('strategy').value;
  const timeframe = document.getElementById('timeframe').value;
  const notes = document.getElementById('notes').value;

  let finalPnl = pnl;
  let finalPnlPercent = pnlPercent;
  if (!finalPnl && !finalPnlPercent && entryPrice && exitPrice && positionSize) {
    const diff = direction === 'long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
    finalPnl = diff * positionSize;
    finalPnlPercent = (diff / entryPrice) * 100;
  }

  if (editingTradeId) {
    const index = trades.findIndex(t => t.id === editingTradeId);
    if (index !== -1) {
      trades[index] = {
        ...trades[index],
        pair, direction, entryPrice, exitPrice,
        positionSize, positionUnit, pnl: finalPnl, pnlPercent: finalPnlPercent,
        entryDate, exitDate, strategy, timeframe, notes
      };
    }
  } else {
    const trade = {
      id: Date.now().toString(),
      pair, direction, entryPrice, exitPrice,
      positionSize, positionUnit, pnl: finalPnl, pnlPercent: finalPnlPercent,
      entryDate, exitDate, strategy, timeframe, notes,
      createdAt: new Date().toISOString()
    };
    trades.unshift(trade);
  }

  saveData();
  closeModals();
  renderTrades();
  updateFilters();
  renderAnalysis();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast(editingTradeId ? 'Trade modifié' : 'Trade ajouté', 'success');
}

function renderTrades() {
  const container = document.getElementById('tradesList');
  const filterStrategy = document.getElementById('filterStrategy').value;
  const filterTimeframe = document.getElementById('filterTimeframe').value;
  const filterMonth = document.getElementById('filterMonth').value;

  let filtered = [...trades];

  if (filterStrategy) filtered = filtered.filter(t => t.strategy === filterStrategy);
  if (filterTimeframe) filtered = filtered.filter(t => t.timeframe === filterTimeframe);
  if (filterMonth) filtered = filtered.filter(t => t.entryDate.startsWith(filterMonth));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucun trade trouvé</p>
        ${trades.length === 0 ? '<p>Commencez par ajouter votre premier trade !</p>' : ''}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(trade => {
    const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
    const borderClass = trade.pnl >= 0 ? 'winning' : 'losing';
    const date = new Date(trade.entryDate).toLocaleDateString('fr-FR');

    return `
      <div class="trade-card ${borderClass}" onclick="viewTrade('${trade.id}')">
        <div class="trade-header">
          <span class="trade-pair">${trade.pair}</span>
          <span class="trade-direction ${trade.direction}">${trade.direction === 'long' ? 'LONG' : 'SHORT'}</span>
        </div>
        <div class="trade-info">
          <div class="trade-info-item">
            <span class="trade-info-label">Date</span>
            <span>${date}</span>
          </div>
          <div class="trade-info-item">
            <span class="trade-info-label">Entrée / Sortie</span>
            <span>${trade.entryPrice} → ${trade.exitPrice}</span>
          </div>
          <div class="trade-info-item">
            <span class="trade-info-label">Taille</span>
            <span>${trade.positionSize} ${trade.positionUnit}</span>
          </div>
          <div class="trade-info-item">
            <span class="trade-info-label">Stratégie</span>
            <span>${trade.strategy}</span>
          </div>
          <div class="trade-info-item">
            <span class="trade-pnl ${pnlClass}">
              ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}
              (${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function updateFilters() {
  const strategySelect = document.getElementById('filterStrategy');
  const monthSelect = document.getElementById('filterMonth');

  const strategies = [...new Set(trades.map(t => t.strategy))];
  const currentStrategy = strategySelect.value;
  strategySelect.innerHTML = '<option value="">Toutes les stratégies</option>';
  strategies.forEach(s => {
    strategySelect.innerHTML += `<option value="${s}" ${s === currentStrategy ? 'selected' : ''}>${s}</option>`;
  });

  const months = [...new Set(trades.map(t => t.entryDate.slice(0, 7)))].sort().reverse();
  const currentMonth = monthSelect.value;
  monthSelect.innerHTML = '<option value="">Tous les mois</option>';
  months.forEach(m => {
    const [year, month] = m.split('-');
    const label = new Date(year, month - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    monthSelect.innerHTML += `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${label}</option>`;
  });

  const analysisMonthSelect = document.getElementById('analysisMonth');
  const currentAnalysisMonth = analysisMonthSelect.value || months[0] || '';
  analysisMonthSelect.innerHTML = '';
  months.forEach(m => {
    const [year, month] = m.split('-');
    const label = new Date(year, month - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    analysisMonthSelect.innerHTML += `<option value="${m}" ${m === currentAnalysisMonth ? 'selected' : ''}>${label}</option>`;
  });
}

function viewTrade(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;
  window._currentTradeId = id;

  const dateEntry = new Date(trade.entryDate).toLocaleDateString('fr-FR');
  const dateExit = new Date(trade.exitDate).toLocaleDateString('fr-FR');
  const pnlClass = trade.pnl >= 0 ? 'positive' : 'negative';
  const directionLabel = trade.direction === 'long' ? 'Long (Achat)' : 'Short (Vente)';

  document.getElementById('tradeDetails').innerHTML = `
    ${trade.notes ? `<div class="trade-detail-item"><span class="trade-detail-label">Notes</span><span class="trade-detail-value">${trade.notes}</span></div>` : ''}
    <div class="trade-detail-item"><span class="trade-detail-label">Paire</span><span class="trade-detail-value">${trade.pair}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Direction</span><span class="trade-detail-value">${directionLabel}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Prix Entrée</span><span class="trade-detail-value">$${trade.entryPrice}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Prix Sortie</span><span class="trade-detail-value">$${trade.exitPrice}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Taille</span><span class="trade-detail-value">${trade.positionSize} ${trade.positionUnit}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Date Entrée</span><span class="trade-detail-value">${dateEntry}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Date Sortie</span><span class="trade-detail-value">${dateExit}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Gain/Perte ($)</span><span class="trade-detail-value ${pnlClass}">${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Gain/Perte (%)</span><span class="trade-detail-value ${pnlClass}">${trade.pnlPercent >= 0 ? '+' : ''}${trade.pnlPercent.toFixed(2)}%</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Stratégie</span><span class="trade-detail-value">${trade.strategy}</span></div>
    <div class="trade-detail-item"><span class="trade-detail-label">Timeframe</span><span class="trade-detail-value">${trade.timeframe || '-'}</span></div>
  `;

  document.getElementById('viewTradeModal').classList.add('active');
  window._currentTradeId = id;
}

function editCurrentTrade() {
  const id = window._currentTradeId;
  const trade = trades.find(t => t.id === id);
  if (!trade) return;

  document.getElementById('viewTradeModal').classList.remove('active');
  editingTradeId = id;

  document.querySelector('#addTradeModal h2').textContent = 'Modifier le Trade';
  document.querySelector('#addTradeModal .btn-primary').textContent = 'Mettre à jour';

  document.getElementById('pair').value = trade.pair;
  document.getElementById('direction').value = trade.direction;
  document.getElementById('entryPrice').value = trade.entryPrice;
  document.getElementById('exitPrice').value = trade.exitPrice;
  document.getElementById('positionSize').value = trade.positionSize;
  document.getElementById('positionUnit').value = trade.positionUnit;
  document.getElementById('pnl').value = trade.pnl;
  document.getElementById('pnlPercent').value = trade.pnlPercent;
  document.getElementById('entryDate').value = trade.entryDate.slice(0, 16);
  document.getElementById('exitDate').value = trade.exitDate.slice(0, 16);
  document.getElementById('strategy').value = trade.strategy;
  document.getElementById('timeframe').value = trade.timeframe;
  document.getElementById('notes').value = trade.notes || '';

  document.getElementById('addTradeModal').classList.add('active');
}

function deleteCurrentTrade() {
  const id = window._currentTradeId;
  if (!confirm('Voulez-vous vraiment supprimer ce trade ?')) return;

  trades = trades.filter(t => t.id !== id);
  saveData();
  closeModals();
  renderTrades();
  updateFilters();
  renderAnalysis();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast('Trade supprimé', 'info');
}

// === Analyse Mensuelle ===
function renderAnalysis() {
  const month = document.getElementById('analysisMonth').value;
  if (!month || trades.length === 0) {
    resetAnalysisCards();
    return;
  }

  const monthTrades = trades.filter(t => t.entryDate.startsWith(month));
  if (monthTrades.length === 0) {
    resetAnalysisCards();
    return;
  }

  const totalPnL = monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = monthTrades.filter(t => t.pnl > 0);
  const losingTrades = monthTrades.filter(t => t.pnl < 0);
  const winrate = (winningTrades.length / monthTrades.length) * 100;

  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 1;
  const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  document.getElementById('totalPnL').textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
  document.getElementById('totalPnL').className = `value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
  document.getElementById('winrate').textContent = `${winrate.toFixed(1)}%`;
  document.getElementById('totalTrades').textContent = monthTrades.length;
  document.getElementById('avgRR').textContent = avgRR.toFixed(2);

  const strategyStats = {};
  monthTrades.forEach(t => {
    if (!strategyStats[t.strategy]) strategyStats[t.strategy] = { trades: 0, wins: 0, pnl: 0 };
    strategyStats[t.strategy].trades++;
    strategyStats[t.strategy].pnl += t.pnl;
    if (t.pnl > 0) strategyStats[t.strategy].wins++;
  });

  document.getElementById('strategyPerformance').innerHTML = Object.entries(strategyStats).map(([name, stats]) => {
    const wr = (stats.wins / stats.trades) * 100;
    return `
      <div class="strategy-item">
        <span class="strategy-name">${name}</span>
        <span class="strategy-stats">
          <span>Trades: ${stats.trades}</span>
          <span>Winrate: ${wr.toFixed(1)}%</span>
          <span class="${stats.pnl >= 0 ? 'positive' : 'negative'}">
            ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}
          </span>
        </span>
      </div>
    `;
  }).join('');

  const sorted = [...monthTrades].sort((a, b) => b.pnl - a.pnl);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  document.getElementById('bestTrade').innerHTML = best.pnl > 0
    ? `<p><strong>${best.pair}</strong> — <span class="positive">+$${best.pnl.toFixed(2)}</span> (${best.strategy} — ${new Date(best.entryDate).toLocaleDateString('fr-FR')})</p>`
    : '<p style="color:var(--text-muted)">Aucun trade gagnant ce mois-ci</p>';

  document.getElementById('worstTrade').innerHTML = worst.pnl < 0
    ? `<p><strong>${worst.pair}</strong> — <span class="negative">-$${Math.abs(worst.pnl).toFixed(2)}</span> (${worst.strategy} — ${new Date(worst.entryDate).toLocaleDateString('fr-FR')})</p>`
    : '<p style="color:var(--text-muted)">Aucun trade perdant ce mois-ci</p>';
}

function resetAnalysisCards() {
  document.getElementById('totalPnL').textContent = '$0.00';
  document.getElementById('totalPnL').className = 'value';
  document.getElementById('winrate').textContent = '0%';
  document.getElementById('totalTrades').textContent = '0';
  document.getElementById('avgRR').textContent = '0.00';
  document.getElementById('strategyPerformance').innerHTML = '<p style="color:var(--text-muted)">Aucune donnée</p>';
  document.getElementById('bestTrade').innerHTML = '<p style="color:var(--text-muted)">Aucune donnée</p>';
  document.getElementById('worstTrade').innerHTML = '<p style="color:var(--text-muted)">Aucune donnée</p>';
}

// === Statistiques Globales ===
function renderStats() {
  if (trades.length === 0) {
    document.getElementById('totalCapital').textContent = `$${settings.initialCapital.toFixed(2)}`;
    document.getElementById('winningTrades').textContent = '0';
    document.getElementById('losingTrades').textContent = '0';
    document.getElementById('avgWin').textContent = '$0.00';
    document.getElementById('avgLoss').textContent = '$0.00';
    document.getElementById('longestWinStreak').textContent = '0';
    return;
  }

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 0;

  const sortedByDate = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  let longestStreak = 0, currentStreak = 0;
  sortedByDate.forEach(t => {
    if (t.pnl > 0) { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); }
    else { currentStreak = 0; }
  });

  document.getElementById('totalCapital').textContent = `$${(settings.initialCapital + totalPnL).toFixed(2)}`;
  document.getElementById('totalCapital').className = `value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
  document.getElementById('winningTrades').textContent = winningTrades.length;
  document.getElementById('losingTrades').textContent = losingTrades.length;
  document.getElementById('avgWin').textContent = `$${avgWin.toFixed(2)}`;
  document.getElementById('avgLoss').textContent = `$${avgLoss.toFixed(2)}`;
  document.getElementById('longestWinStreak').textContent = longestStreak;
}

// === Graphiques ===
function updateCharts() {
  updateCapitalChart();
  updatePnLChart();
}

function updateCapitalChart() {
  const ctx = document.getElementById('capitalChart').getContext('2d');
  if (charts.capital) charts.capital.destroy();

  const gridColor = currentTheme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.05)';
  const tickColor = currentTheme === 'light' ? '#64748b' : '#64748b';

  if (trades.length === 0) {
    charts.capital = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Capital', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', fill: true }]},
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: tickColor }, grid: { color: gridColor } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
    });
    return;
  }

  const sorted = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
  let capital = settings.initialCapital;
  const labels = [];
  const data = [];

  sorted.forEach(t => {
    capital += t.pnl;
    labels.push(new Date(t.entryDate).toLocaleDateString('fr-FR'));
    data.push(capital);
  });

  charts.capital = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Capital', data, borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.05)', fill: true, tension: 0.4,
        borderWidth: 2, pointBackgroundColor: '#3b82f6', pointBorderColor: '#3b82f6',
        pointRadius: 3, pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tickColor, maxTicksLimit: 10 }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor }, grid: { color: gridColor } }
      }
    }
  });
}

function updatePnLChart() {
  const ctx = document.getElementById('pnlChart').getContext('2d');
  if (charts.pnl) charts.pnl.destroy();

  const winning = trades.filter(t => t.pnl > 0).length;
  const losing = trades.filter(t => t.pnl < 0).length;
  const neutral = trades.filter(t => t.pnl === 0).length;

  const labelColor = currentTheme === 'light' ? '#475569' : '#94a3b8';

  charts.pnl = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Gagnants', 'Perdants', 'Neutres'],
      datasets: [{ data: [winning, losing, neutral], backgroundColor: ['#10b981', '#ef4444', '#64748b'], borderWidth: 0, hoverOffset: 8 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: labelColor, padding: 20, usePointStyle: true, pointStyleWidth: 10 } }
      }
    }
  });
}

// === Paramètres ===
function openSettings() {
  document.getElementById('initialCapital').value = settings.initialCapital;
  document.getElementById('currency').value = settings.currency;
  document.getElementById('settingsModal').classList.add('active');
}

function saveSettings() {
  settings.initialCapital = parseFloat(document.getElementById('initialCapital').value) || 10000;
  settings.currency = document.getElementById('currency').value;
  saveData();
  closeModals();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast('Paramètres enregistrés', 'success');
}

function clearAllData() {
  if (!confirm('Voulez-vous vraiment supprimer toutes les données ? Cette action est irréversible.')) return;
  if (!confirm('Êtes-vous sûr ? Tous vos trades seront perdus !')) return;
  trades = [];
  saveData();
  closeModals();
  renderTrades();
  updateFilters();
  renderAnalysis();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast('Données supprimées', 'info');
}

// === Export CSV ===
function exportCSV() {
  if (trades.length === 0) {
    showToast('Aucun trade à exporter', 'warning');
    return;
  }

  const headers = ['Paire', 'Direction', 'Prix Entrée', 'Prix Sortie', 'Taille', 'Unité', 'Gain/Perte ($)', 'Gain/Perte (%)', 'Date Entrée', 'Date Sortie', 'Stratégie', 'Timeframe', 'Notes'];
  const csvContent = [
    headers.join(','),
    ...trades.map(t => [
      t.pair, t.direction, t.entryPrice, t.exitPrice, t.positionSize, t.positionUnit,
      t.pnl.toFixed(2), t.pnlPercent.toFixed(2), t.entryDate, t.exitDate, t.strategy, t.timeframe,
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Export CSV téléchargé', 'success');
}

// === Export PDF ===
function exportPDF() {
  if (trades.length === 0) {
    showToast('Aucun trade à exporter', 'warning');
    return;
  }

  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const capital = settings.initialCapital + totalPnL;
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  const winrate = trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : 0;

  const sortedByDate = [...trades].sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate));

  const html = `
    <div style="font-family:'Inter',-apple-system,sans-serif;color:#1a1a2e;padding:30px;max-width:800px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #3b82f6;">
        <h1 style="font-size:24px;margin:0 0 4px;color:#3b82f6;">Trading Journal Pro</h1>
        <p style="color:#64748b;font-size:12px;margin:0;">Rapport du ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:24px;gap:12px;">
        <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Capital</div>
          <div style="font-size:20px;font-weight:700;color:#3b82f6;">$${capital.toFixed(2)}</div>
        </div>
        <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">P&L Total</div>
          <div style="font-size:20px;font-weight:700;color:${totalPnL >= 0 ? '#10b981' : '#ef4444'};">${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}</div>
        </div>
        <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">
          <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Winrate</div>
          <div style="font-size:20px;font-weight:700;color:#d4a853;">${winrate}%</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#3b82f6;color:white;">
            <th style="padding:10px 8px;text-align:left;">Date</th>
            <th style="padding:10px 8px;text-align:left;">Paire</th>
            <th style="padding:10px 8px;text-align:center;">Direction</th>
            <th style="padding:10px 8px;text-align:right;">Entrée</th>
            <th style="padding:10px 8px;text-align:right;">Sortie</th>
            <th style="padding:10px 8px;text-align:right;">P&L</th>
            <th style="padding:10px 8px;text-align:left;">Stratégie</th>
          </tr>
        </thead>
        <tbody>
          ${sortedByDate.map((t, i) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};border-bottom:1px solid #e2e8f0;">
              <td style="padding:8px;">${new Date(t.entryDate).toLocaleDateString('fr-FR')}</td>
              <td style="padding:8px;font-weight:600;">${t.pair}</td>
              <td style="padding:8px;text-align:center;color:${t.direction === 'long' ? '#10b981' : '#ef4444'};font-weight:600;">${t.direction.toUpperCase()}</td>
              <td style="padding:8px;text-align:right;">$${t.entryPrice}</td>
              <td style="padding:8px;text-align:right;">$${t.exitPrice}</td>
              <td style="padding:8px;text-align:right;font-weight:700;color:${t.pnl >= 0 ? '#10b981' : '#ef4444'};">${t.pnl >= 0 ? '+' : ''}$${t.pnl.toFixed(2)}</td>
              <td style="padding:8px;">${t.strategy}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:10px;">
        Généré par Trading Journal Pro — ${new Date().toLocaleDateString('fr-FR')}
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;
  document.body.appendChild(element);

  const opt = {
    margin: [10, 10, 10, 10],
    filename: `trading-journal-${new Date().toISOString().slice(0, 10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    element.remove();
    showToast('Export PDF téléchargé', 'success');
  });
}

// === Démarrage ===
document.addEventListener('DOMContentLoaded', checkAuth);
