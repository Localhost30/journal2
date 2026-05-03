// === État de l'application ===
let trades = [];
let settings = { initialCapital: 10000, currency: 'USD' };
let editingTradeId = null;
let charts = {};

// === Initialisation ===
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupUI();
    renderTrades();
    updateFilters();
    renderAnalysis();
    renderStats();
    updateCharts();
});

// === Gestion des données ===
function loadData() {
    const savedTrades = localStorage.getItem('trades');
    const savedSettings = localStorage.getItem('tradingSettings');
    trades = savedTrades ? JSON.parse(savedTrades) : [];
    settings = savedSettings ? JSON.parse(savedSettings) : { initialCapital: 10000, currency: 'USD' };
}

function saveData() {
    localStorage.setItem('trades', JSON.stringify(trades));
    localStorage.setItem('tradingSettings', JSON.stringify(settings));
}

// === Configuration de l'UI ===
function setupUI() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Modals
    document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModals();
        });
    });

    // Add trade
    document.getElementById('addTradeBtn').addEventListener('click', () => openAddTradeModal());
    document.getElementById('tradeForm').addEventListener('submit', handleTradeSubmit);

    // Filters
    document.getElementById('filterStrategy').addEventListener('change', renderTrades);
    document.getElementById('filterTimeframe').addEventListener('change', renderTrades);
    document.getElementById('filterMonth').addEventListener('change', renderTrades);
    document.getElementById('analysisMonth').addEventListener('change', renderAnalysis);

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
    document.getElementById('clearDataBtn').addEventListener('click', clearAllData);

    // Export
    document.getElementById('exportBtn').addEventListener('click', exportData);

    // Set default dates
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('entryDate').value = localNow;
    document.getElementById('exitDate').value = localNow;

    // Edit/Delete trade
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

    // Auto-calculate PnL if not provided
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
}

function renderTrades() {
    const container = document.getElementById('tradesList');
    const filterStrategy = document.getElementById('filterStrategy').value;
    const filterTimeframe = document.getElementById('filterTimeframe').value;
    const filterMonth = document.getElementById('filterMonth').value;

    let filtered = [...trades];

    if (filterStrategy) {
        filtered = filtered.filter(t => t.strategy === filterStrategy);
    }
    if (filterTimeframe) {
        filtered = filtered.filter(t => t.timeframe === filterTimeframe);
    }
    if (filterMonth) {
        filtered = filtered.filter(t => t.entryDate.startsWith(filterMonth));
    }

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
                    <span class="trade-direction ${trade.direction}">${trade.direction === 'long' ? 'Long' : 'Short'}</span>
                </div>
                <div class="trade-info">
                    <div class="trade-info-item">
                        <span class="trade-info-label">Date</span>
                        <span>${date}</span>
                    </div>
                    <div class="trade-info-item">
                        <span class="trade-info-label">Entrée / Sortie</span>
                        <span>$${trade.entryPrice} → $${trade.exitPrice}</span>
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

    // Stratégies
    const strategies = [...new Set(trades.map(t => t.strategy))];
    const currentStrategy = strategySelect.value;
    strategySelect.innerHTML = '<option value="">Toutes les stratégies</option>';
    strategies.forEach(s => {
        strategySelect.innerHTML += `<option value="${s}" ${s === currentStrategy ? 'selected' : ''}>${s}</option>`;
    });

    // Mois
    const months = [...new Set(trades.map(t => t.entryDate.slice(0, 7)))].sort().reverse();
    const currentMonth = monthSelect.value;
    monthSelect.innerHTML = '<option value="">Tous les mois</option>';
    months.forEach(m => {
        const [year, month] = m.split('-');
        const label = new Date(year, month - 1).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
        monthSelect.innerHTML += `<option value="${m}" ${m === currentMonth ? 'selected' : ''}>${label}</option>`;
    });

    // Analysis month
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

    // Ratio R/R moyen
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((s, t) => s + t.pnl, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((s, t) => s + t.pnl, 0) / losingTrades.length) : 1;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : 0;

    // Mise à jour des cartes
    document.getElementById('totalPnL').textContent = `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(2)}`;
    document.getElementById('totalPnL').className = `value ${totalPnL >= 0 ? 'positive' : 'negative'}`;
    document.getElementById('winrate').textContent = `${winrate.toFixed(1)}%`;
    document.getElementById('totalTrades').textContent = monthTrades.length;
    document.getElementById('avgRR').textContent = avgRR.toFixed(2);

    // Performance par stratégie
    const strategyStats = {};
    monthTrades.forEach(t => {
        if (!strategyStats[t.strategy]) {
            strategyStats[t.strategy] = { trades: 0, wins: 0, pnl: 0 };
        }
        strategyStats[t.strategy].trades++;
        strategyStats[t.strategy].pnl += t.pnl;
        if (t.pnl > 0) strategyStats[t.strategy].wins++;
    });

    const strategyContainer = document.getElementById('strategyPerformance');
    strategyContainer.innerHTML = Object.entries(strategyStats).map(([name, stats]) => {
        const winrate = (stats.wins / stats.trades) * 100;
        return `
            <div class="strategy-item">
                <span class="strategy-name">${name}</span>
                <span class="strategy-stats">
                    <span>Trades: ${stats.trades}</span>
                    <span>Winrate: ${winrate.toFixed(1)}%</span>
                    <span class="${stats.pnl >= 0 ? 'positive' : 'negative'}">
                        ${stats.pnl >= 0 ? '+' : ''}$${stats.pnl.toFixed(2)}
                    </span>
                </span>
            </div>
        `;
    }).join('');

    // Meilleur et pire trade
    const sorted = [...monthTrades].sort((a, b) => b.pnl - a.pnl);
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    document.getElementById('bestTrade').innerHTML = best.pnl > 0
        ? `<p><strong>${best.pair}</strong> — <span class="positive">+$${best.pnl.toFixed(2)}</span> (${best.strategy} — ${new Date(best.entryDate).toLocaleDateString('fr-FR')})</p>`
        : '<p>Aucun trade gagnant ce mois-ci</p>';

    document.getElementById('worstTrade').innerHTML = worst.pnl < 0
        ? `<p><strong>${worst.pair}</strong> — <span class="negative">-$${Math.abs(worst.pnl).toFixed(2)}</span> (${worst.strategy} — ${new Date(worst.entryDate).toLocaleDateString('fr-FR')})</p>`
        : '<p>Aucun trade perdant ce mois-ci</p>';
}

function resetAnalysisCards() {
    document.getElementById('totalPnL').textContent = '$0.00';
    document.getElementById('totalPnL').className = 'value';
    document.getElementById('winrate').textContent = '0%';
    document.getElementById('totalTrades').textContent = '0';
    document.getElementById('avgRR').textContent = '0.00';
    document.getElementById('strategyPerformance').innerHTML = '<p>Aucune donnée</p>';
    document.getElementById('bestTrade').innerHTML = '<p>Aucune donnée</p>';
    document.getElementById('worstTrade').innerHTML = '<p>Aucune donnée</p>';
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

    // Plus longue série gagnante
    const sortedByDate = [...trades].sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    let longestStreak = 0, currentStreak = 0;
    sortedByDate.forEach(t => {
        if (t.pnl > 0) {
            currentStreak++;
            longestStreak = Math.max(longestStreak, currentStreak);
        } else {
            currentStreak = 0;
        }
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

    if (trades.length === 0) {
        charts.capital = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{
                label: 'Capital',
                data: [],
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true
            }]},
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
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
                label: 'Capital',
                data,
                borderColor: '#4a90e2',
                backgroundColor: 'rgba(74, 144, 226, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    ticks: { color: '#aaa', maxTicksLimit: 10 },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                y: {
                    ticks: { color: '#aaa' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                }
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

    charts.pnl = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Gagnants', 'Perdants', 'Neutres'],
            datasets: [{
                data: [winning, losing, neutral],
                backgroundColor: ['#2ecc71', '#e74c3c', '#95a5a6'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#aaa', padding: 20 }
                }
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
}

// === Export CSV ===
function exportData() {
    if (trades.length === 0) {
        alert('Aucun trade à exporter');
        return;
    }

    const headers = ['Paire', 'Direction', 'Prix Entrée', 'Prix Sortie', 'Taille', 'Unité', 'Gain/Perte ($)', 'Gain/Perte (%)', 'Date Entrée', 'Date Sortie', 'Stratégie', 'Timeframe', 'Notes'];
    const csvContent = [
        headers.join(','),
        ...trades.map(t => [
            t.pair,
            t.direction,
            t.entryPrice,
            t.exitPrice,
            t.positionSize,
            t.positionUnit,
            t.pnl.toFixed(2),
            t.pnlPercent.toFixed(2),
            t.entryDate,
            t.exitDate,
            t.strategy,
            t.timeframe,
            `"${(t.notes || '').replace(/"/g, '""')}"`
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}