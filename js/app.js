// ============================================================
// Trading Journal Pro - app.js (simplifie pour Render)
// ============================================================

const API_URL = '/api';
let trades = [];
let settings = { initialCapital: 10000, currency: 'USD' };
let editingTradeId = null;
let charts = {};
let currentUser = null;
let otpEmail = '';
let resendInterval = null;
let currentTheme = localStorage.getItem('theme') || 'dark';

// Liste des pages (IDs des div dans index.html)
const AUTH_PAGES = ['loginPage', 'signupPage', 'forgotPage', 'otpPage', 'resetPasswordPage', 'appPage'];

// ============================================================
// UTILITAIRES D'AFFICHAGE
// ============================================================

/** Affiche une seule page et cache les autres (avec verification de securite) */
function showPage(pageId) {
  AUTH_PAGES.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = (id === pageId) ? 'block' : 'none';
    }
  });
}

/** Affiche la page login */
function showLogin() {
  showPage('loginPage');
}

/** Affiche la page inscription */
function showSignup() {
  showPage('signupPage');
}

/** Affiche le forgot password */
function showForgot() {
  showPage('forgotPage');
}

/** Affiche la page OTP */
function showOtp() {
  showPage('otpPage');
}

/** Affiche le reset password */
function showResetPassword() {
  showPage('resetPasswordPage');
}

/** Affiche l'application principale */
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

// ============================================================
// GESTION DU THEME
// ============================================================

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.classList.toggle('light', theme === 'light');
}

// ============================================================
// UTILITAIRES AUTH
// ============================================================

function getToken() {
  return localStorage.getItem('token');
}

function setToken(token) {
  localStorage.setItem('token', token);
}

function clearToken() {
  localStorage.removeItem('token');
}

/** Appel API standard avec gestion d'erreur */
async function apiCall(endpoint, method, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(API_URL + endpoint, options);
  let data;
  try { data = await res.json(); } catch (e) { data = {}; }

  if (!res.ok) {
    if (res.status === 503 && data.code === 'DB_UNAVAILABLE') {
      throw new Error('Mode hors-ligne: pas de base de donnees. Passez en mode hors-ligne ou configurez MONGODB_URI.');
    }
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
}

// ============================================================
// NOTIFICATIONS (Toast)
// ============================================================

function showToast(message, type) {
  type = type || 'info';
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || icons.info) + '</span><span>' + message + '</span>';
  container.appendChild(toast);

  setTimeout(function() {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    setTimeout(function() { toast.remove(); }, 300);
  }, 4000);
}

// ============================================================
// UI UTILISATEUR
// ============================================================

function updateUserUI() {
  if (!currentUser) return;
  const name = currentUser.name || '';
  const initials = name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2) || 'U';

  const avatar = document.getElementById('userAvatar');
  const nameEl = document.getElementById('dropdownUserName');
  const emailEl = document.getElementById('dropdownUserEmail');

  if (avatar) avatar.textContent = initials;
  if (nameEl) nameEl.textContent = currentUser.name || '';
  if (emailEl) emailEl.textContent = currentUser.email || '';
}

// ============================================================
// AUTORISATION - AUTO-AUTHENTIFICATION AU CHARGEMENT
// ============================================================

async function checkAuth() {
  applyTheme(currentTheme);
  const token = getToken();

  if (!token) {
    showLogin();
    return;
  }

  try {
    const data = await apiCall('/auth/me', 'GET');
    currentUser = data.user;
    showApp();
  } catch (err) {
    console.warn('Session invalide:', err.message);
    clearToken();
    showLogin();
  }
}

// ============================================================
// FORMULAIRES D'AUTHENTIFICATION
// ============================================================

// --- Connexion ---
document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    setToken(data.token);
    currentUser = data.user;
    showToast('Connexion reussie !', 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// --- Inscription ---
document.getElementById('signupForm').addEventListener('submit', async function(e) {
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
    showToast('Compte cree avec succes !', 'success');
    showApp();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// --- Mot de passe oublie ---
document.getElementById('forgotForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value;
  otpEmail = email;

  try {
    await apiCall('/auth/forgot-password', 'POST', { email });
    showToast('Code OTP envoye a votre email', 'success');
    document.getElementById('otpEmailDisplay').textContent = email;
    showPage('otpPage');
    startResendTimer();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// --- Saisie OTP ---
document.querySelectorAll('.otp-input').forEach(function(input, index, inputs) {
  input.addEventListener('input', function(e) {
    const value = e.target.value;
    if (value.length === 1 && index < inputs.length - 1) {
      inputs[index + 1].focus();
    }
    input.classList.toggle('filled', value.length === 1);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' && !input.value && index > 0) {
      inputs[index - 1].focus();
    }
  });

  input.addEventListener('paste', function(e) {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, 6);
    paste.split('').forEach(function(char, i) {
      if (inputs[i]) {
        inputs[i].value = char;
        inputs[i].classList.add('filled');
      }
    });
    if (inputs[paste.length - 1]) inputs[paste.length - 1].focus();
  });
});

// --- Verification OTP ---
document.getElementById('otpForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const code = Array.from(document.querySelectorAll('.otp-input')).map(function(i) { return i.value; }).join('');

  if (code.length < 6) {
    showToast('Veuillez entrer le code complet', 'error');
    return;
  }

  try {
    await apiCall('/auth/verify-otp', 'POST', { email: otpEmail, code });
    showToast('Code verifie ! Creez votre nouveau mot de passe', 'success');
    showPage('resetPasswordPage');
    if (resendInterval) clearInterval(resendInterval);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// --- Renvoyer le code OTP ---
document.getElementById('resendOtpBtn').addEventListener('click', async function() {
  try {
    await apiCall('/auth/forgot-password', 'POST', { email: otpEmail });
    showToast('Nouveau code envoye', 'success');
    startResendTimer();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// --- Reinitialisation du mot de passe ---
document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const password = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (password !== confirmPassword) {
    showToast('Les mots de passe ne correspondent pas', 'error');
    return;
  }

  try {
    await apiCall('/auth/reset-password', 'POST', { email: otpEmail, password });
    showToast('Mot de passe reinitialise ! Connectez-vous', 'success');
    showLogin();
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
  resendInterval = setInterval(function() {
    seconds--;
    document.getElementById('resendCountdown').textContent = seconds;
    if (seconds <= 0) {
      clearInterval(resendInterval);
      document.getElementById('resendTimer').style.display = 'none';
      document.getElementById('resendLink').style.display = '';
    }
  }, 1000);
}

// ============================================================
// LIENS DE NAVIGATION ENTRE PAGES AUTH (FIX PRINCIPAL)
// ============================================================

/** Attache les gestionnaires de clic sur les liens de navigation entre pages */
function setupAuthNavLinks() {
  // Login -> Signup
  document.getElementById('goToSignup').addEventListener('click', function(e) {
    e.preventDefault();
    showSignup();
  });

  // Signup -> Login
  document.getElementById('goToLogin').addEventListener('click', function(e) {
    e.preventDefault();
    showLogin();
  });

  // Login -> Forgot Password
  document.getElementById('forgotPasswordLink').addEventListener('click', function(e) {
    e.preventDefault();
    showForgot();
  });

  // Forgot -> Login
  document.getElementById('backToLoginFromForgot').addEventListener('click', function(e) {
    e.preventDefault();
    showLogin();
  });

  // OTP -> Login
  document.getElementById('backToLoginFromOtp').addEventListener('click', function(e) {
    e.preventDefault();
    if (resendInterval) clearInterval(resendInterval);
    showLogin();
  });
}

// ============================================================
// DROPDOWN UTILISATEUR ET LOGOUT
// ============================================================

function openProfileModal() {
  if (!currentUser) return;
  var name = currentUser.name || '';
  var initials = name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().slice(0, 2) || 'U';

  document.getElementById('profileAvatarLg').textContent = initials;
  document.getElementById('profileName').textContent = currentUser.name || 'Utilisateur';
  document.getElementById('profileEmail').textContent = currentUser.email || '';
  document.getElementById('profileEditName').value = currentUser.name || '';
  document.getElementById('profileEditEmail').value = currentUser.email || '';
  document.getElementById('profileEditPassword').value = '';
  document.getElementById('profileTradeCount').textContent = trades.length;
  document.getElementById('profileMemberSince').textContent = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  document.getElementById('profileModal').classList.add('active');
}

function setupUserActions() {
  // Avatar click -> dropdown
  document.getElementById('userAvatar').addEventListener('click', function(e) {
    e.stopPropagation();
    document.getElementById('userDropdown').classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function() {
    document.getElementById('userDropdown').classList.remove('show');
  });

  // Profile button
  document.getElementById('profileBtn').addEventListener('click', function() {
    document.getElementById('userDropdown').classList.remove('show');
    openProfileModal();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', function() {
    clearToken();
    currentUser = null;
    trades = [];
    showLogin();
    showToast('Deconnexion reussie', 'info');
  });

  // Profile form
  document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    var name = document.getElementById('profileEditName').value;
    var email = document.getElementById('profileEditEmail').value;
    var password = document.getElementById('profileEditPassword').value || undefined;

    try {
      var data = await apiCall('/auth/update-profile', 'PUT', { name, email, password });
      currentUser = data.user;
      updateUserUI();
      closeModals();
      showToast('Profil mis a jour', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // Delete account
  document.getElementById('deleteAccountBtn').addEventListener('click', async function() {
    if (!confirm('Voulez-vous vraiment supprimer votre compte ? Toutes vos donnees seront perdues.')) return;
    if (!confirm('Cette action est irreversible. Continuer ?')) return;

    try {
      await apiCall('/auth/delete-account', 'DELETE');
      clearToken();
      currentUser = null;
      trades = [];
      showLogin();
      showToast('Compte supprime', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ============================================================
// GESTION DES DONNEES (LOAD / SAVE)
// ============================================================

async function loadData() {
  try {
    const data = await apiCall('/trades', 'GET');
    trades = data.trades || [];
    const settingsData = await apiCall('/settings', 'GET');
    settings = settingsData.settings || { initialCapital: 10000, currency: 'USD' };
  } catch (err) {
    // Mode hors-ligne: charger depuis le localStorage
    const savedTrades = localStorage.getItem('trades');
    const savedSettings = localStorage.getItem('tradingSettings');
    trades = savedTrades ? JSON.parse(savedTrades) : [];
    settings = savedSettings ? JSON.parse(savedSettings) : { initialCapital: 10000, currency: 'USD' };
  }
}

async function saveData() {
  try {
    await apiCall('/trades', 'PUT', { trades });
    await apiCall('/settings', 'PUT', settings);
  } catch (err) {
    localStorage.setItem('trades', JSON.stringify(trades));
    localStorage.setItem('tradingSettings', JSON.stringify(settings));
  }
}

// ============================================================
// DASHBOARD
// ============================================================

function updateDashboard() {
  const totalPnL = trades.reduce(function(sum, t) { return sum + (t.pnl || 0); }, 0);
  const capital = settings.initialCapital + totalPnL;
  const winningTrades = trades.filter(function(t) { return (t.pnl || 0) > 0; });
  const winrate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

  const dashCapital = document.getElementById('dashCapital');
  const dashPnl = document.getElementById('dashPnl');

  if (dashCapital) {
    dashCapital.textContent = '$' + capital.toFixed(2);
    dashCapital.className = 'dashboard-value ' + (totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral');
  }
  if (dashPnl) {
    dashPnl.textContent = (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2);
    dashPnl.className = 'dashboard-value ' + (totalPnL > 0 ? 'positive' : totalPnL < 0 ? 'negative' : 'neutral');
  }

  const dashWinrate = document.getElementById('dashWinrate');
  const dashTrades = document.getElementById('dashTrades');
  if (dashWinrate) dashWinrate.textContent = winrate.toFixed(1) + '%';
  if (dashTrades) dashTrades.textContent = trades.length;
}

// ============================================================
// CONFIGURATION DE L'UI
// ============================================================

function setupUI() {
  // Navigation tabs
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchTab(btn.dataset.tab);
    });
  });

  // Boutons Close et Cancel
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(function(btn) {
    var newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(function(btn) {
    btn.addEventListener('click', closeModals);
  });

  // Fermer les modals en cliquant en dehors
  document.querySelectorAll('.modal').forEach(function(modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModals();
    });
  });

  // Boutons principaux
  document.getElementById('addTradeBtn').addEventListener('click', function() { openAddTradeModal(); });
  document.getElementById('tradeForm').addEventListener('submit', handleTradeSubmit);

  // Filtres
  document.getElementById('filterStrategy').addEventListener('change', renderTrades);
  document.getElementById('filterTimeframe').addEventListener('change', renderTrades);
  document.getElementById('filterMonth').addEventListener('change', renderTrades);
  document.getElementById('analysisMonth').addEventListener('change', renderAnalysis);

  // Parametres
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

  // Export
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('exportPdfBtn').addEventListener('click', exportPDF);

  // Date par defaut
  var now = new Date();
  var localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('entryDate').value = localNow;
  document.getElementById('exitDate').value = localNow;

  // Edition et suppression
  document.getElementById('editTradeBtn').addEventListener('click', editCurrentTrade);
  document.getElementById('deleteTradeBtn').addEventListener('click', deleteCurrentTrade);
}

function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.querySelector('.nav-btn[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
  var tabEl = document.getElementById(tab + 'Tab');
  if (tabEl) tabEl.classList.add('active');

  if (tab === 'analysis') renderAnalysis();
  if (tab === 'stats') { renderStats(); updateCharts(); }
}

function closeModals() {
  document.querySelectorAll('.modal').forEach(function(m) { m.classList.remove('active'); });
  editingTradeId = null;
  document.getElementById('tradeForm').reset();
}

// ============================================================
// GESTION DES TRADES
// ============================================================

function openAddTradeModal() {
  editingTradeId = null;
  document.getElementById('tradeForm').reset();
  document.querySelector('#addTradeModal h2').textContent = 'Nouveau Trade';

  var now = new Date();
  var localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('entryDate').value = localNow;
  document.getElementById('exitDate').value = localNow;
  document.getElementById('addTradeModal').classList.add('active');
}

function handleTradeSubmit(e) {
  e.preventDefault();

  const pair = document.getElementById('pair').value;
  const direction = document.getElementById('direction').value;
  const entryPrice = parseFloat(document.getElementById('entryPrice').value) || 0;
  const exitPrice = parseFloat(document.getElementById('exitPrice').value) || 0;
  const positionSize = parseFloat(document.getElementById('positionSize').value) || 0;
  const positionUnit = document.getElementById('positionUnit').value;
  const pnl = parseFloat(document.getElementById('pnl').value) || 0;
  const pnlPercent = parseFloat(document.getElementById('pnlPercent').value) || 0;
  const entryDate = document.getElementById('entryDate').value;
  const exitDate = document.getElementById('exitDate').value;
  const strategy = document.getElementById('strategy').value;
  const timeframe = document.getElementById('timeframe').value;
  const notes = document.getElementById('notes').value;

  var finalPnl = pnl;
  var finalPnlPercent = pnlPercent;
  if (!finalPnl && !finalPnlPercent && entryPrice && exitPrice && positionSize) {
    var diff = direction === 'long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
    finalPnl = diff * positionSize;
    finalPnlPercent = (diff / entryPrice) * 100;
  }

  if (editingTradeId) {
    var index = trades.findIndex(function(t) { return t.id === editingTradeId; });
    if (index !== -1) {
      trades[index] = {
        ...trades[index],
        pair, direction, entryPrice, exitPrice,
        positionSize, positionUnit, pnl: finalPnl, pnlPercent: finalPnlPercent,
        entryDate, exitDate, strategy, timeframe, notes
      };
    }
  } else {
    var trade = {
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
  showToast(editingTradeId ? 'Trade modifie' : 'Trade ajoute', 'success');
}

function renderTrades() {
  var container = document.getElementById('tradesList');
  if (!container) return;

  var filterStrategy = document.getElementById('filterStrategy').value;
  var filterTimeframe = document.getElementById('filterTimeframe').value;
  var filterMonth = document.getElementById('filterMonth').value;

  var filtered = trades.slice();

  if (filterStrategy) filtered = filtered.filter(function(t) { return t.strategy === filterStrategy; });
  if (filterTimeframe) filtered = filtered.filter(function(t) { return t.timeframe === filterTimeframe; });
  if (filterMonth) filtered = filtered.filter(function(t) { return t.entryDate && t.entryDate.startsWith(filterMonth); });

  if (filtered.length === 0) {
    container.innerHTML = '\n      <div class="empty-state">\n        <p>Aucun trade trouve</p>' +
      (trades.length === 0 ? '\n        <p>Commencez par ajouter votre premier trade !</p>' : '') +
      '\n      </div>\n    ';
    return;
  }

  container.innerHTML = filtered.map(function(trade) {
    var pnlClass = (trade.pnl || 0) >= 0 ? 'positive' : 'negative';
    var borderClass = (trade.pnl || 0) >= 0 ? 'winning' : 'losing';
    var date = new Date(trade.entryDate).toLocaleDateString('fr-FR');

    return '\n      <div class="trade-card ' + borderClass + '" onclick="viewTrade(&#39;' + trade.id + '&#39;)">\n        <div class="trade-header">\n          <span class="trade-pair">' + trade.pair + '</span>\n          <span class="trade-direction ' + trade.direction + '">' + (trade.direction === 'long' ? 'LONG' : 'SHORT') + '</span>\n        </div>\n        <div class="trade-info">\n          <div class="trade-info-item">\n            <span class="trade-info-label">Date</span>\n            <span>' + date + '</span>\n          </div>\n          <div class="trade-info-item">\n            <span class="trade-info-label">Entree / Sortie</span>\n            <span>' + trade.entryPrice + ' --> ' + trade.exitPrice + '</span>\n          </div>\n          <div class="trade-info-item">\n            <span class="trade-info-label">Taille</span>\n            <span>' + trade.positionSize + ' ' + trade.positionUnit + '</span>\n          </div>\n          <div class="trade-info-item">\n            <span class="trade-info-label">Strategie</span>\n            <span>' + trade.strategy + '</span>\n          </div>\n          <div class="trade-info-item">\n            <span class="trade-pnl ' + pnlClass + '">' +
            ((trade.pnl || 0) >= 0 ? '+' : '') + '$' + (trade.pnl || 0).toFixed(2) +
            ' (' + ((trade.pnlPercent || 0) >= 0 ? '+' : '') + (trade.pnlPercent || 0).toFixed(2) + '%)' +
            '</span>\n          </div>\n        </div>\n      </div>\n    ';
  }).join('');
}

function updateFilters() {
  var strategySelect = document.getElementById('filterStrategy');
  var monthSelect = document.getElementById('filterMonth');

  var strategies = Array.from(new Set(trades.map(function(t) { return t.strategy; })));
  var currentStrategy = strategySelect.value;
  strategySelect.innerHTML = '<option value="">Toutes les strategies</option>';
  strategies.forEach(function(s) {
    strategySelect.innerHTML += '<option value="' + s + '" ' + (s === currentStrategy ? 'selected' : '') + '>' + s + '</option>';
  });

  var months = Array.from(new Set(trades.map(function(t) { return t.entryDate ? t.entryDate.slice(0, 7) : ''; }))).filter(function(m) { return m; }).sort().reverse();
  var currentMonth = monthSelect.value;
  monthSelect.innerHTML = '<option value="">Tous les mois</option>';
  months.forEach(function(m) {
    var parts = m.split('-');
    var label = new Date(parts[0], parts[1] - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    monthSelect.innerHTML += '<option value="' + m + '" ' + (m === currentMonth ? 'selected' : '') + '>' + label + '</option>';
  });

  var analysisMonthSelect = document.getElementById('analysisMonth');
  var currentAnalysisMonth = analysisMonthSelect.value || (months[0] || '');
  analysisMonthSelect.innerHTML = '';
  months.forEach(function(m) {
    var parts = m.split('-');
    var label = new Date(parts[0], parts[1] - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    analysisMonthSelect.innerHTML += '<option value="' + m + '" ' + (m === currentAnalysisMonth ? 'selected' : '') + '>' + label + '</option>';
  });
}

function viewTrade(id) {
  var trade = trades.find(function(t) { return t.id === id; });
  if (!trade) return;

  var dateEntry = new Date(trade.entryDate).toLocaleDateString('fr-FR');
  var dateExit = new Date(trade.exitDate).toLocaleDateString('fr-FR');
  var pnlClass = (trade.pnl || 0) >= 0 ? 'positive' : 'negative';
  var directionLabel = trade.direction === 'long' ? 'Long (Achat)' : 'Short (Vente)';

  var html = '';

  if (trade.notes) {
    html += '<div class="trade-detail-item"><span class="trade-detail-label">Notes</span><span class="trade-detail-value">' + trade.notes + '</span></div>';
  }
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Paire</span><span class="trade-detail-value">' + trade.pair + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Direction</span><span class="trade-detail-value">' + directionLabel + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Prix Entree</span><span class="trade-detail-value">$' + trade.entryPrice + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Prix Sortie</span><span class="trade-detail-value">$' + trade.exitPrice + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Taille</span><span class="trade-detail-value">' + trade.positionSize + ' ' + trade.positionUnit + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Date Entree</span><span class="trade-detail-value">' + dateEntry + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Date Sortie</span><span class="trade-detail-value">' + dateExit + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Gain/Perte ($)</span><span class="trade-detail-value ' + pnlClass + '">' + ((trade.pnl || 0) >= 0 ? '+' : '') + '$' + (trade.pnl || 0).toFixed(2) + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Gain/Perte (%)</span><span class="trade-detail-value ' + pnlClass + '">' + ((trade.pnlPercent || 0) >= 0 ? '+' : '') + (trade.pnlPercent || 0).toFixed(2) + '%</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Strategie</span><span class="trade-detail-value">' + trade.strategy + '</span></div>';
  html += '<div class="trade-detail-item"><span class="trade-detail-label">Timeframe</span><span class="trade-detail-value">' + (trade.timeframe || '-') + '</span></div>';

  document.getElementById('tradeDetails').innerHTML = html;
  document.getElementById('viewTradeModal').classList.add('active');
  window._currentTradeId = id;
}

function editCurrentTrade() {
  var id = window._currentTradeId;
  var trade = trades.find(function(t) { return t.id === id; });
  if (!trade) return;

  document.getElementById('viewTradeModal').classList.remove('active');
  editingTradeId = id;

  document.querySelector('#addTradeModal h2').textContent = 'Modifier le Trade';
  document.querySelector('#addTradeModal .btn-primary').textContent = 'Mettre a jour';

  document.getElementById('pair').value = trade.pair || '';
  document.getElementById('direction').value = trade.direction || 'long';
  document.getElementById('entryPrice').value = trade.entryPrice || '';
  document.getElementById('exitPrice').value = trade.exitPrice || '';
  document.getElementById('positionSize').value = trade.positionSize || '';
  document.getElementById('positionUnit').value = trade.positionUnit || 'units';
  document.getElementById('pnl').value = trade.pnl || '';
  document.getElementById('pnlPercent').value = trade.pnlPercent || '';
  document.getElementById('entryDate').value = trade.entryDate ? trade.entryDate.slice(0, 16) : '';
  document.getElementById('exitDate').value = trade.exitDate ? trade.exitDate.slice(0, 16) : '';
  document.getElementById('strategy').value = trade.strategy || '';
  document.getElementById('timeframe').value = trade.timeframe || 'M1';
  document.getElementById('notes').value = trade.notes || '';

  document.getElementById('addTradeModal').classList.add('active');
}

function deleteCurrentTrade() {
  var id = window._currentTradeId;
  if (!confirm('Voulez-vous vraiment supprimer ce trade ?')) return;

  trades = trades.filter(function(t) { return t.id !== id; });
  saveData();
  closeModals();
  renderTrades();
  updateFilters();
  renderAnalysis();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast('Trade supprime', 'info');
}

// ============================================================
// ANALYSE MENSUELLE
// ============================================================

function renderAnalysis() {
  var month = document.getElementById('analysisMonth').value;
  if (!month || trades.length === 0) {
    resetAnalysisCards();
    return;
  }

  var monthTrades = trades.filter(function(t) { return t.entryDate && t.entryDate.startsWith(month); });
  if (monthTrades.length === 0) {
    resetAnalysisCards();
    return;
  }

  var totalPnL = monthTrades.reduce(function(sum, t) { return sum + (t.pnl || 0); }, 0);
  var winningTrades = monthTrades.filter(function(t) { return (t.pnl || 0) > 0; });
  var losingTrades = monthTrades.filter(function(t) { return (t.pnl || 0) < 0; });
  var winrate = (winningTrades.length / monthTrades.length) * 100;

  var avgWin = winningTrades.length > 0 ? winningTrades.reduce(function(s, t) { return s + (t.pnl || 0); }, 0) / winningTrades.length : 0;
  var avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce(function(s, t) { return s + (t.pnl || 0); }, 0) / losingTrades.length) : 1;
  var avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

  var totalPnLEl = document.getElementById('totalPnL');
  if (totalPnLEl) {
    totalPnLEl.textContent = (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2);
    totalPnLEl.className = 'value ' + (totalPnL >= 0 ? 'positive' : 'negative');
  }

  var winrateEl = document.getElementById('winrate');
  if (winrateEl) winrateEl.textContent = winrate.toFixed(1) + '%';

  var totalTradesEl = document.getElementById('totalTrades');
  if (totalTradesEl) totalTradesEl.textContent = monthTrades.length;

  var avgRREl = document.getElementById('avgRR');
  if (avgRREl) avgRREl.textContent = avgRR.toFixed(2);

  var strategyStats = {};
  monthTrades.forEach(function(t) {
    if (!strategyStats[t.strategy]) strategyStats[t.strategy] = { trades: 0, wins: 0, pnl: 0 };
    strategyStats[t.strategy].trades++;
    strategyStats[t.strategy].pnl += (t.pnl || 0);
    if ((t.pnl || 0) > 0) strategyStats[t.strategy].wins++;
  });

  var stratHtml = Object.entries(strategyStats).map(function(entry) {
    var name = entry[0], stats = entry[1];
    var wr = (stats.wins / stats.trades) * 100;
    return '\n      <div class="strategy-item">\n        <span class="strategy-name">' + name + '</span>\n        <span class="strategy-stats">\n          <span>Trades: ' + stats.trades + '</span>\n          <span>Winrate: ' + wr.toFixed(1) + '%</span>\n          <span class="' + (stats.pnl >= 0 ? 'positive' : 'negative') + '">\n            ' + (stats.pnl >= 0 ? '+' : '') + '$' + stats.pnl.toFixed(2) + '\n          </span>\n        </span>\n      </div>\n    ';
  }).join('');

  document.getElementById('strategyPerformance').innerHTML = stratHtml;

  var sorted = monthTrades.slice().sort(function(a, b) { return (b.pnl || 0) - (a.pnl || 0); });
  var best = sorted[0];
  var worst = sorted[sorted.length - 1];

  var bestEl = document.getElementById('bestTrade');
  var worstEl = document.getElementById('worstTrade');

  if (bestEl) {
    bestEl.innerHTML = (best.pnl || 0) > 0
      ? '<p><strong>' + best.pair + '</strong> -- <span class="positive">+$' + (best.pnl || 0).toFixed(2) + '</span> (' + best.strategy + ' -- ' + new Date(best.entryDate).toLocaleDateString('fr-FR') + ')</p>'
      : '<p style="color:var(--text-muted)">Aucun trade gagnant ce mois-ci</p>';
  }

  if (worstEl) {
    worstEl.innerHTML = (worst.pnl || 0) < 0
      ? '<p><strong>' + worst.pair + '</strong> -- <span class="negative">-$' + Math.abs(worst.pnl || 0).toFixed(2) + '</span> (' + worst.strategy + ' -- ' + new Date(worst.entryDate).toLocaleDateString('fr-FR') + ')</p>'
      : '<p style="color:var(--text-muted)">Aucun trade perdant ce mois-ci</p>';
  }
}

function resetAnalysisCards() {
  var totalPnL = document.getElementById('totalPnL');
  var winrate = document.getElementById('winrate');
  var totalTrades = document.getElementById('totalTrades');
  var avgRR = document.getElementById('avgRR');

  if (totalPnL) { totalPnL.textContent = '$0.00'; totalPnL.className = 'value'; }
  if (winrate) winrate.textContent = '0%';
  if (totalTrades) totalTrades.textContent = '0';
  if (avgRR) avgRR.textContent = '0.00';

  var strategyPerformance = document.getElementById('strategyPerformance');
  if (strategyPerformance) strategyPerformance.innerHTML = '<p style="color:var(--text-muted)">Aucune donnee</p>';

  var bestTrade = document.getElementById('bestTrade');
  var worstTrade = document.getElementById('worstTrade');
  if (bestTrade) bestTrade.innerHTML = '<p style="color:var(--text-muted)">Aucune donnee</p>';
  if (worstTrade) worstTrade.innerHTML = '<p style="color:var(--text-muted)">Aucune donnee</p>';
}

// ============================================================
// STATISTIQUES GLOBALES
// ============================================================

function renderStats() {
  var totalCapitalEl = document.getElementById('totalCapital');

  if (trades.length === 0) {
    if (totalCapitalEl) {
      totalCapitalEl.textContent = '$' + (settings.initialCapital || 10000).toFixed(2);
      totalCapitalEl.className = 'value';
    }
    document.getElementById('winningTrades').textContent = '0';
    document.getElementById('losingTrades').textContent = '0';
    document.getElementById('avgWin').textContent = '$0.00';
    document.getElementById('avgLoss').textContent = '$0.00';
    document.getElementById('longestWinStreak').textContent = '0';
    return;
  }

  var totalPnL = trades.reduce(function(sum, t) { return sum + (t.pnl || 0); }, 0);
  var winningTrades = trades.filter(function(t) { return (t.pnl || 0) > 0; });
  var losingTrades = trades.filter(function(t) { return (t.pnl || 0) < 0; });
  var avgWin = winningTrades.length > 0 ? winningTrades.reduce(function(s, t) { return s + (t.pnl || 0); }, 0) / winningTrades.length : 0;
  var avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce(function(s, t) { return s + (t.pnl || 0); }, 0) / losingTrades.length) : 0;

  var sortedByDate = trades.slice().sort(function(a, b) { return new Date(a.entryDate) - new Date(b.entryDate); });
  var longestStreak = 0, currentStreak = 0;
  sortedByDate.forEach(function(t) {
    if ((t.pnl || 0) > 0) { currentStreak++; longestStreak = Math.max(longestStreak, currentStreak); }
    else { currentStreak = 0; }
  });

  if (totalCapitalEl) {
    totalCapitalEl.textContent = '$' + ((settings.initialCapital || 10000) + totalPnL).toFixed(2);
    totalCapitalEl.className = 'value ' + (totalPnL >= 0 ? 'positive' : 'negative');
  }
  document.getElementById('winningTrades').textContent = winningTrades.length;
  document.getElementById('losingTrades').textContent = losingTrades.length;
  document.getElementById('avgWin').textContent = '$' + avgWin.toFixed(2);
  document.getElementById('avgLoss').textContent = '$' + avgLoss.toFixed(2);
  document.getElementById('longestWinStreak').textContent = longestStreak;
}

// ============================================================
// GRAPHIQUES (Chart.js)
// ============================================================

function updateCharts() {
  updateCapitalChart();
  updatePnLChart();
}

function updateCapitalChart() {
  var ctx = document.getElementById('capitalChart');
  if (!ctx) return;
  ctx = ctx.getContext('2d');

  if (charts.capital) charts.capital.destroy();

  var gridColor = currentTheme === 'light' ? 'rgba(15,23,42,0.06)' : 'rgba(148,163,184,0.05)';
  var tickColor = currentTheme === 'light' ? '#64748b' : '#64748b';

  if (trades.length === 0) {
    charts.capital = new Chart(ctx, {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Capital', data: [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: tickColor }, grid: { color: gridColor } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
    });
    return;
  }

  var sorted = trades.slice().sort(function(a, b) { return new Date(a.entryDate) - new Date(b.entryDate); });
  var capital = settings.initialCapital || 10000;
  var labels = [];
  var data = [];

  sorted.forEach(function(t) {
    capital += (t.pnl || 0);
    labels.push(new Date(t.entryDate).toLocaleDateString('fr-FR'));
    data.push(capital);
  });

  charts.capital = new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Capital', data: data, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', fill: true, tension: 0.4, borderWidth: 2, pointBackgroundColor: '#3b82f6', pointBorderColor: '#3b82f6', pointRadius: 3, pointHoverRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { ticks: { color: tickColor, maxTicksLimit: 10 }, grid: { color: gridColor } }, y: { ticks: { color: tickColor }, grid: { color: gridColor } } } }
  });
}

function updatePnLChart() {
  var ctx = document.getElementById('pnlChart');
  if (!ctx) return;
  ctx = ctx.getContext('2d');

  if (charts.pnl) charts.pnl.destroy();

  var winning = trades.filter(function(t) { return (t.pnl || 0) > 0; }).length;
  var losing = trades.filter(function(t) { return (t.pnl || 0) < 0; }).length;
  var neutral = trades.filter(function(t) { return (t.pnl || 0) === 0; }).length;

  var labelColor = currentTheme === 'light' ? '#475569' : '#94a3b8';

  charts.pnl = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: ['Gagnants', 'Perdants', 'Neutres'], datasets: [{ data: [winning, losing, neutral], backgroundColor: ['#10b981', '#ef4444', '#64748b'], borderWidth: 0, hoverOffset: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: labelColor, padding: 20, usePointStyle: true, pointStyleWidth: 10 } } } }
  });
}

// ============================================================
// PARAMETRES
// ============================================================

function openSettings() {
  document.getElementById('initialCapital').value = settings.initialCapital || 10000;
  document.getElementById('currency').value = settings.currency || 'USD';
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
  showToast('Parametres enregistres', 'success');
}

function clearAllData() {
  if (!confirm('Voulez-vous vraiment supprimer toutes les donnees ? Cette action est irreversible.')) return;
  if (!confirm('Etes-vous sur ? Tous vos trades seront perdus !')) return;
  trades = [];
  saveData();
  closeModals();
  renderTrades();
  updateFilters();
  renderAnalysis();
  renderStats();
  updateCharts();
  updateDashboard();
  showToast('Donnees supprimees', 'info');
}

// ============================================================
// EXPORT CSV
// ============================================================

function exportCSV() {
  if (trades.length === 0) {
    showToast('Aucun trade a exporter', 'warning');
    return;
  }

  var headers = ['Paire', 'Direction', 'Prix Entree', 'Prix Sortie', 'Taille', 'Unite', 'Gain/Perte ($)', 'Gain/Perte (%)', 'Date Entree', 'Date Sortie', 'Strategie', 'Timeframe', 'Notes'];
  var csvContent = headers.join(',') + '\n' + trades.map(function(t) {
    return [t.pair, t.direction, t.entryPrice, t.exitPrice, t.positionSize, t.positionUnit,
      (t.pnl || 0).toFixed(2), (t.pnlPercent || 0).toFixed(2), t.entryDate, t.exitDate, t.strategy, t.timeframe,
      '"' + (t.notes || '').replace(/"/g, '""') + '"'
    ].join(',');
  }).join('\n');

  var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'trading-journal-' + new Date().toISOString().slice(0, 10) + '.csv';
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Export CSV telecharge', 'success');
}

// ============================================================
// EXPORT PDF
// ============================================================

function exportPDF() {
  if (trades.length === 0) {
    showToast('Aucun trade a exporter', 'warning');
    return;
  }

  var totalPnL = trades.reduce(function(sum, t) { return sum + (t.pnl || 0); }, 0);
  var capital = (settings.initialCapital || 10000) + totalPnL;
  var winningTrades = trades.filter(function(t) { return (t.pnl || 0) > 0; });
  var losingTrades = trades.filter(function(t) { return (t.pnl || 0) < 0; });
  var winrate = trades.length > 0 ? ((winningTrades.length / trades.length) * 100).toFixed(1) : 0;

  var sortedByDate = trades.slice().sort(function(a, b) { return new Date(b.entryDate) - new Date(a.entryDate); });

  var html = '<div style="font-family:Inter,-apple-system,sans-serif;color:#1a1a2e;padding:30px;max-width:800px;margin:0 auto;">\n' +
    '<div style="text-align:center;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #3b82f6;">\n' +
    '  <h1 style="font-size:24px;margin:0 0 4px;color:#3b82f6;">Trading Journal Pro</h1>\n' +
    '  <p style="color:#64748b;font-size:12px;margin:0;">Rapport du ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) + '</p>\n' +
    '</div>\n' +
    '<div style="display:flex;justify-content:space-between;margin-bottom:24px;gap:12px;">\n' +
    '  <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">\n' +
    '    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Capital</div>\n' +
    '    <div style="font-size:20px;font-weight:700;color:#3b82f6;">$' + capital.toFixed(2) + '</div>\n' +
    '  </div>\n' +
    '  <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">\n' +
    '    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">P&L Total</div>\n' +
    '    <div style="font-size:20px;font-weight:700;color:' + (totalPnL >= 0 ? '#10b981' : '#ef4444') + ';">' + (totalPnL >= 0 ? '+' : '') + '$' + totalPnL.toFixed(2) + '</div>\n' +
    '  </div>\n' +
    '  <div style="flex:1;text-align:center;padding:14px;background:#f0f4f8;border-radius:8px;">\n' +
    '    <div style="font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Winrate</div>\n' +
    '    <div style="font-size:20px;font-weight:700;color:#d4a853;">' + winrate + '%</div>\n' +
    '  </div>\n' +
    '</div>\n' +
    '<table style="width:100%;border-collapse:collapse;font-size:11px;">\n' +
    '  <thead>\n' +
    '    <tr style="background:#3b82f6;color:white;">\n' +
    '      <th style="padding:10px 8px;text-align:left;">Date</th>\n' +
    '      <th style="padding:10px 8px;text-align:left;">Paire</th>\n' +
    '      <th style="padding:10px 8px;text-align:center;">Direction</th>\n' +
    '      <th style="padding:10px 8px;text-align:right;">Entree</th>\n' +
    '      <th style="padding:10px 8px;text-align:right;">Sortie</th>\n' +
    '      <th style="padding:10px 8px;text-align:right;">P&L</th>\n' +
    '      <th style="padding:10px 8px;text-align:left;">Strategie</th>\n' +
    '    </tr>\n' +
    '  </thead>\n' +
    '  <tbody>\n' + sortedByDate.map(function(t, i) {
      return '    <tr style="background:' + (i % 2 === 0 ? '#fff' : '#f8fafc') + ';border-bottom:1px solid #e2e8f0;">\n' +
        '      <td style="padding:8px;">' + new Date(t.entryDate).toLocaleDateString('fr-FR') + '</td>\n' +
        '      <td style="padding:8px;font-weight:600;">' + t.pair + '</td>\n' +
        '      <td style="padding:8px;text-align:center;color:' + (t.direction === 'long' ? '#10b981' : '#ef4444') + ';font-weight:600;">' + t.direction.toUpperCase() + '</td>\n' +
        '      <td style="padding:8px;text-align:right;">$' + t.entryPrice + '</td>\n' +
        '      <td style="padding:8px;text-align:right;">$' + t.exitPrice + '</td>\n' +
        '      <td style="padding:8px;text-align:right;font-weight:700;color:' + ((t.pnl || 0) >= 0 ? '#10b981' : '#ef4444') + ';">' + ((t.pnl || 0) >= 0 ? '+' : '') + '$' + (t.pnl || 0).toFixed(2) + '</td>\n' +
        '      <td style="padding:8px;">' + t.strategy + '</td>\n' +
        '    </tr>';
    }).join('\n') + '\n' +
    '  </tbody>\n' +
    '</table>\n' +
    '<div style="text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:10px;">\n' +
    '  Genere par Trading Journal Pro -- ' + new Date().toLocaleDateString('fr-FR') + '\n' +
    '</div>\n' +
    '</div>';

  var element = document.createElement('div');
  element.innerHTML = html;
  document.body.appendChild(element);

  var opt = {
    margin: [10, 10, 10, 10],
    filename: 'trading-journal-' + new Date().toISOString().slice(0, 10) + '.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(element).save().then(function() {
    element.remove();
    showToast('Export PDF telecharge', 'success');
  });
}

// ============================================================
// DEMARRAGE DE L'APPLICATION
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Etape 1: attacher les liens de navigation entre pages d'authentification
  setupAuthNavLinks();

  // Etape 2: attacher les actions utilisateur (logout, etc.)
  setupUserActions();

  // Etape 3: verifier si l'utilisateur est connecte
  checkAuth();

  // Etape 4: setup du theme toggle
  document.getElementById('themeToggle').addEventListener('click', function() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  });

  // Etape 5: mobile menu hamburger
  var mobileMenuBtn = document.getElementById('mobileMenuBtn');
  var mobileMenu = document.getElementById('mobileMenu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('open');
    });
    document.addEventListener('click', function() {
      mobileMenu.classList.remove('open');
    });
    mobileMenu.addEventListener('click', function(e) {
      e.stopPropagation();
    });
  }

  // Etape 6: liens du menu mobile
  document.getElementById('mobileExportPdfBtn')?.addEventListener('click', function() {
    exportPDF();
    mobileMenu.classList.remove('open');
  });
  document.getElementById('mobileExportBtn')?.addEventListener('click', function() {
    exportCSV();
    mobileMenu.classList.remove('open');
  });
  document.getElementById('mobileSettingsBtn')?.addEventListener('click', function() {
    openSettings();
    mobileMenu.classList.remove('open');
  });
});
