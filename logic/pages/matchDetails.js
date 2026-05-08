// Frontend/logic/pages/matchDetails.js

// Перевірка прав адміністратора
function isAdmin() {
    try {
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return user.role === 'admin';
    } catch {
        return false;
    }
}

// Отримати ID матчу з URL
function getMatchId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('matchId');
}

// Глобальні змінні
let currentMatch = null;
let homeTeam = null;
let awayTeam = null;
let homeTeamPlayers = [];
let awayTeamPlayers = [];
let currentLineup = {
    home: { starters: [], bench: [] },
    away: { starters: [], bench: [] }
};

// Функція для отримання фото гравця (заглушка)
function getPlayerAvatar(name) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D6EFD&color=fff&rounded=true&size=40&bold=true`;
}

// Завантаження даних матчу
async function loadMatchData() {
    const matchId = getMatchId();
    if (!matchId) {
        showNotification('ID матчу не вказано', 'error');
        window.location.href = 'saved.html';
        return;
    }

    try {
        // 1. Завантажуємо дані матчу
        currentMatch = await matchesApi.getById(matchId);
        console.log('Завантажено матч:', currentMatch);

        // 2. Завантажуємо команди за ID
        if (currentMatch.homeTeamId && currentMatch.awayTeamId) {
            [homeTeam, awayTeam] = await Promise.all([
                teamsApi.getById(currentMatch.homeTeamId).catch(() => null),
                teamsApi.getById(currentMatch.awayTeamId).catch(() => null)
            ]);
            console.log('Команди:', homeTeam, awayTeam);
        }

        // 3. Завантажуємо гравців команд (якщо команди знайдені)
        if (homeTeam && awayTeam) {
            [homeTeamPlayers, awayTeamPlayers] = await Promise.all([
                teamsApi.getPlayers(homeTeam.id || homeTeam._id).catch(() => []),
                teamsApi.getPlayers(awayTeam.id || awayTeam._id).catch(() => [])
            ]);
        }

        // 4. Ініціалізуємо склади (перші 11 гравців - основні)
        if (homeTeamPlayers.length > 0) {
            currentLineup.home = {
                starters: homeTeamPlayers.slice(0, Math.min(11, homeTeamPlayers.length)),
                bench: homeTeamPlayers.slice(11)
            };
        }
        if (awayTeamPlayers.length > 0) {
            currentLineup.away = {
                starters: awayTeamPlayers.slice(0, Math.min(11, awayTeamPlayers.length)),
                bench: awayTeamPlayers.slice(11)
            };
        }

        // Відображаємо дані
        displayMatchInfo();
        displayLineups();
        displayStatistics();
        displayEvents();

        // Показуємо кнопки адміна
        if (isAdmin()) {
            document.getElementById('adminActions').style.display = 'block';
        }

        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('matchContent').style.display = 'block';
        checkIfSaved();

    } catch (error) {
        console.error('Помилка завантаження:', error);
        document.getElementById('loadingSpinner').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> 
                Помилка завантаження матчу: ${error.message}
            </div>
        `;
    }
}

// Відображення загальної інформації про матч
function displayMatchInfo() {
    document.getElementById('tournamentName').textContent = currentMatch.tournament?.name || 'Турнір не вказано';
    document.getElementById('matchStatus').textContent = getMatchStatusText(currentMatch.status);
    document.getElementById('matchStatus').className = `badge ${getMatchStatusClass(currentMatch.status)} ms-2`;

    // Використовуємо завантажені об'єкти команд
    document.getElementById('homeTeamName').textContent = homeTeam?.teamName || homeTeam?.name || 'Команда господарів';
    document.getElementById('awayTeamName').textContent = awayTeam?.teamName || awayTeam?.name || 'Команда гостей';
    document.getElementById('homeScore').textContent = currentMatch.score?.home || 0;
    document.getElementById('awayScore').textContent = currentMatch.score?.away || 0;

    document.getElementById('homeFormation').textContent = currentMatch.homeFormation || 'Схема не задана';
    document.getElementById('awayFormation').textContent = currentMatch.awayFormation || 'Схема не задана';

    const date = new Date(currentMatch.startTime);
    document.getElementById('matchDateTime').textContent = formatDateTime(date);
    document.getElementById('matchVenue').textContent = currentMatch.venue || 'Місце не вказано';
}

// Відображення складів команд
function displayLineups() {
    // Господарі
    document.getElementById('homeTeamLineupName').textContent = homeTeam?.teamName || homeTeam?.name || 'Команда господарів';
    document.getElementById('homeTeamCoach').innerHTML = `<i class="fas fa-chalkboard-user"></i> Тренер: ${homeTeam?.coach || 'Не вказано'}`;

    displayPlayerList('homeStarters', currentLineup.home.starters, true);
    displayPlayerList('homeBench', currentLineup.home.bench, false);

    // Гості
    document.getElementById('awayTeamLineupName').textContent = awayTeam?.teamName || awayTeam?.name || 'Команда гостей';
    document.getElementById('awayTeamCoach').innerHTML = `<i class="fas fa-chalkboard-user"></i> Тренер: ${awayTeam?.coach || 'Не вказано'}`;

    displayPlayerList('awayStarters', currentLineup.away.starters, true);
    displayPlayerList('awayBench', currentLineup.away.bench, false);
}

// Відображення списку гравців
function displayPlayerList(containerId, players, isStarter) {
    const container = document.getElementById(containerId);
    if (!players || players.length === 0) {
        container.innerHTML = '<div class="text-muted">Немає даних</div>';
        return;
    }

    container.innerHTML = players.map(player => `
        <div class="list-group-item player-card ${isStarter ? 'starter' : 'bench'}">
            <div class="d-flex align-items-center">
                <img src="${getPlayerAvatar(player.name)}" class="rounded-circle me-3" style="width: 40px; height: 40px;">
                <div>
                    <strong>${player.number ? `#${player.number}` : ''} ${player.name}</strong>
                    <div class="small text-muted">${player.position || 'Гравець'}</div>
                </div>
            </div>
        </div>
    `).join('');
}

// Відображення статистики
function displayStatistics() {
    const stats = currentMatch.statistics || {};
    const container = document.getElementById('matchStats');

    container.innerHTML = `
        <div class="row">
            <div class="col-5 text-end">
                <strong>${stats.homePossession || 0}%</strong>
            </div>
            <div class="col-2 text-center text-muted">Володіння</div>
            <div class="col-5">
                <strong>${stats.awayPossession || 0}%</strong>
            </div>
            <div class="col-12">
                <div class="stat-bar mt-1 mb-3">
                    <div class="stat-bar-fill" style="width: ${stats.homePossession || 0}%; background: #0d6efd;"></div>
                </div>
            </div>
        </div>
        ${createStatRow('Удари', stats.homeShots, stats.awayShots)}
        ${createStatRow('Удари в площину', stats.homeShotsOnTarget, stats.awayShotsOnTarget)}
        ${createStatRow('Кутові', stats.homeCorners, stats.awayCorners)}
        ${createStatRow('Фоли', stats.homeFouls, stats.awayFouls)}
        ${createStatRow('Жовті картки', stats.homeYellowCards, stats.awayYellowCards)}
    `;
}

function createStatRow(label, homeVal, awayVal) {
    return `
        <div class="row mb-3">
            <div class="col-5 text-end"><strong>${homeVal || 0}</strong></div>
            <div class="col-2 text-center text-muted">${label}</div>
            <div class="col-5"><strong>${awayVal || 0}</strong></div>
        </div>
    `;
}

// Відображення подій
function displayEvents() {
    const events = currentMatch.events || [];
    const container = document.getElementById('matchEvents');

    if (events.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">Немає подій</div>';
        return;
    }

    container.innerHTML = events.map(event => `
        <div class="event-item">
            <div class="event-time">${event.time}'</div>
            <div>
                <i class="fas ${getEventIcon(event.type)} me-2"></i>
                <strong>${event.team === 'home' ? (homeTeam?.teamName || 'Господарі') : (awayTeam?.teamName || 'Гості')}</strong>
                : ${event.description}
            </div>
        </div>
    `).join('');
}

function getEventIcon(type) {
    switch(type) {
        case 'goal': return 'fa-futbol text-success';
        case 'yellow-card': return 'fa-square text-warning';
        case 'red-card': return 'fa-square text-danger';
        case 'substitution': return 'fa-arrows-spin';
        default: return 'fa-info-circle';
    }
}

function getMatchStatusText(status) {
    const statusMap = {
        'upcoming': 'Майбутній',
        'live': 'LIVE',
        'finished': 'Завершено',
        'postponed': 'Відкладено'
    };
    return statusMap[status] || 'Заплановано';
}

function getMatchStatusClass(status) {
    const classMap = {
        'upcoming': 'bg-secondary',
        'live': 'bg-danger',
        'finished': 'bg-success',
        'postponed': 'bg-warning'
    };
    return classMap[status] || 'bg-secondary';
}

function formatDateTime(date) {
    if (!date || isNaN(date.getTime())) return 'Дата невідома';
    return date.toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Редагування складу
async function editLineup() {
    if (!homeTeam || !awayTeam) {
        showNotification('Дані команд не завантажено', 'error');
        return;
    }

    try {
        document.getElementById('modalHomeTeam').textContent = homeTeam.teamName || homeTeam.name;
        document.getElementById('modalAwayTeam').textContent = awayTeam.teamName || awayTeam.name;

        const homeContainer = document.getElementById('modalHomePlayers');
        const awayContainer = document.getElementById('modalAwayPlayers');

        const homeStarterIds = new Set(currentLineup.home.starters.map(p => p._id || p.id));
        const awayStarterIds = new Set(currentLineup.away.starters.map(p => p._id || p.id));

        homeContainer.innerHTML = `
            <h6>Основний склад (виберіть до 11)</h6>
            ${homeTeamPlayers.map(player => `
                <div class="form-check">
                    <input class="form-check-input home-starter" type="checkbox" value="${player._id || player.id}" 
                        ${homeStarterIds.has(player._id || player.id) ? 'checked' : ''}>
                    <label class="form-check-label">
                        #${player.number || '?'} ${player.name} - ${player.position || 'Гравець'}
                    </label>
                </div>
            `).join('')}
        `;

        awayContainer.innerHTML = `
            <h6>Основний склад (виберіть до 11)</h6>
            ${awayTeamPlayers.map(player => `
                <div class="form-check">
                    <input class="form-check-input away-starter" type="checkbox" value="${player._id || player.id}"
                        ${awayStarterIds.has(player._id || player.id) ? 'checked' : ''}>
                    <label class="form-check-label">
                        #${player.number || '?'} ${player.name} - ${player.position || 'Гравець'}
                    </label>
                </div>
            `).join('')}
        `;

        const modal = new bootstrap.Modal(document.getElementById('lineupModal'));
        modal.show();

        document.getElementById('saveLineupBtn').onclick = async () => {
            const homeStarters = Array.from(document.querySelectorAll('.home-starter:checked')).map(cb => {
                return homeTeamPlayers.find(p => (p._id || p.id) === cb.value);
            });
            const awayStarters = Array.from(document.querySelectorAll('.away-starter:checked')).map(cb => {
                return awayTeamPlayers.find(p => (p._id || p.id) === cb.value);
            });

            if (homeStarters.length > 11) {
                showNotification('Можна вибрати не більше 11 гравців для команди господарів!', 'warning');
                return;
            }
            if (awayStarters.length > 11) {
                showNotification('Можна вибрати не більше 11 гравців для команди гостей!', 'warning');
                return;
            }

            const homeBench = homeTeamPlayers.filter(p => !homeStarters.includes(p));
            const awayBench = awayTeamPlayers.filter(p => !awayStarters.includes(p));

            currentLineup = {
                home: { starters: homeStarters, bench: homeBench },
                away: { starters: awayStarters, bench: awayBench }
            };

            displayLineups();
            modal.hide();
            showNotification('Склади збережено!', 'success');
        };

    } catch (error) {
        console.error('Помилка редагування складу:', error);
        showNotification('Помилка при редагуванні складу', 'error');
    }
}

// Редагування статистики
function editStatistics() {
    const stats = currentMatch.statistics || {};
    document.getElementById('statsHomeTeam').textContent = homeTeam?.teamName || homeTeam?.name || 'Господарі';
    document.getElementById('statsAwayTeam').textContent = awayTeam?.teamName || awayTeam?.name || 'Гості';
    document.getElementById('homePossession').value = stats.homePossession || 0;
    document.getElementById('awayPossession').value = stats.awayPossession || 0;
    document.getElementById('homeShots').value = stats.homeShots || 0;
    document.getElementById('awayShots').value = stats.awayShots || 0;
    document.getElementById('homeShotsOnTarget').value = stats.homeShotsOnTarget || 0;
    document.getElementById('awayShotsOnTarget').value = stats.awayShotsOnTarget || 0;
    document.getElementById('homeCorners').value = stats.homeCorners || 0;
    document.getElementById('awayCorners').value = stats.awayCorners || 0;
    document.getElementById('homeFouls').value = stats.homeFouls || 0;
    document.getElementById('awayFouls').value = stats.awayFouls || 0;
    document.getElementById('homeYellowCards').value = stats.homeYellowCards || 0;
    document.getElementById('awayYellowCards').value = stats.awayYellowCards || 0;
    document.getElementById('modalHomeScore').value = currentMatch.score?.home || 0;
    document.getElementById('modalAwayScore').value = currentMatch.score?.away || 0;

    const modal = new bootstrap.Modal(document.getElementById('statsModal'));
    modal.show();
}

// Збереження статистики
async function saveStatistics() {
    const statsData = {
        homePossession: parseInt(document.getElementById('homePossession').value) || 0,
        awayPossession: parseInt(document.getElementById('awayPossession').value) || 0,
        homeShots: parseInt(document.getElementById('homeShots').value) || 0,
        awayShots: parseInt(document.getElementById('awayShots').value) || 0,
        homeShotsOnTarget: parseInt(document.getElementById('homeShotsOnTarget').value) || 0,
        awayShotsOnTarget: parseInt(document.getElementById('awayShotsOnTarget').value) || 0,
        homeCorners: parseInt(document.getElementById('homeCorners').value) || 0,
        awayCorners: parseInt(document.getElementById('awayCorners').value) || 0,
        homeFouls: parseInt(document.getElementById('homeFouls').value) || 0,
        awayFouls: parseInt(document.getElementById('awayFouls').value) || 0,
        homeYellowCards: parseInt(document.getElementById('homeYellowCards').value) || 0,
        awayYellowCards: parseInt(document.getElementById('awayYellowCards').value) || 0
    };

    const homeScore = parseInt(document.getElementById('modalHomeScore').value) || 0;
    const awayScore = parseInt(document.getElementById('modalAwayScore').value) || 0;

    try {
        await matchesApi.updateStats(getMatchId(), statsData);
        await matchesApi.updateScore(getMatchId(), homeScore, awayScore);

        currentMatch.statistics = statsData;
        currentMatch.score = { home: homeScore, away: awayScore };

        displayStatistics();
        document.getElementById('homeScore').textContent = homeScore;
        document.getElementById('awayScore').textContent = awayScore;

        bootstrap.Modal.getInstance(document.getElementById('statsModal')).hide();
        showNotification('Статистику збережено!', 'success');
    } catch (error) {
        console.error('Помилка збереження статистики:', error);
        showNotification('Помилка при збереженні статистики', 'error');
    }
}

// Редагування тактичних схем
function editTactics() {
    document.getElementById('tacticsHomeTeam').textContent = homeTeam?.teamName || homeTeam?.name || 'Господарі';
    document.getElementById('tacticsAwayTeam').textContent = awayTeam?.teamName || awayTeam?.name || 'Гості';
    document.getElementById('homeFormationInput').value = currentMatch.homeFormation || '';
    document.getElementById('awayFormationInput').value = currentMatch.awayFormation || '';

    const modal = new bootstrap.Modal(document.getElementById('tacticsModal'));
    modal.show();
}

async function saveTactics() {
    const homeFormation = document.getElementById('homeFormationInput').value;
    const awayFormation = document.getElementById('awayFormationInput').value;

    try {
        await matchesApi.update(getMatchId(), {
            homeFormation,
            awayFormation
        });

        currentMatch.homeFormation = homeFormation;
        currentMatch.awayFormation = awayFormation;

        document.getElementById('homeFormation').textContent = homeFormation || 'Схема не задана';
        document.getElementById('awayFormation').textContent = awayFormation || 'Схема не задана';

        bootstrap.Modal.getInstance(document.getElementById('tacticsModal')).hide();
        showNotification('Тактичні схеми збережено!', 'success');
    } catch (error) {
        console.error('Помилка збереження тактики:', error);
        showNotification('Помилка при збереженні тактичних схем', 'error');
    }
}

async function checkIfSaved() {
    const matchId = getMatchId();
    if (!matchId) return;

    const saveBtn = document.getElementById('saveMatchBtn');
    if (!saveBtn) return;

    // Перевіряємо чи є токен (користувач авторизований)
    const token = localStorage.getItem('accessToken');
    if (!token) {
        // Якщо не авторизований - показуємо кнопку з повідомленням
        saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Увійдіть, щоб зберегти';
        saveBtn.classList.add('btn-outline-secondary');
        saveBtn.classList.remove('btn-outline-warning');
        saveBtn.disabled = true;
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedMatches?.includes(matchId) || false;

        if (isSaved) {
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Збережено';
            saveBtn.classList.remove('btn-outline-warning');
            saveBtn.classList.add('btn-warning');
        } else {
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Зберегти матч';
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-outline-warning');
        }
        saveBtn.disabled = false;
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}
async function toggleSaveMatch() {
    const matchId = getMatchId();
    if (!matchId) return;

    const saveBtn = document.getElementById('saveMatchBtn');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showNotification('Увійдіть, щоб зберігати матчі', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedMatches?.includes(matchId) || false;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await window.savedItemsApi.toggleSaveMatch(matchId, isSaved);

        if (isSaved) {
            showNotification('Матч видалено зі збережених', 'info');
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Зберегти матч';
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-outline-warning');
        } else {
            showNotification('Матч збережено!', 'success');
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Збережено';
            saveBtn.classList.remove('btn-outline-warning');
            saveBtn.classList.add('btn-warning');
        }
    } catch (error) {
        console.error('Error toggling saved match:', error);
        showNotification('Помилка: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}
function setupSaveMatchButton() {
    const saveBtn = document.getElementById('saveMatchBtn');
    if (!saveBtn) return;

    // Видаляємо старі обробники
    const newBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newBtn, saveBtn);

    newBtn.addEventListener('click', toggleSaveMatch);
}

// Ініціалізація
$(document).ready(function() {
    loadMatchData();

    document.getElementById('editLineupBtn')?.addEventListener('click', editLineup);
    document.getElementById('editStatsBtn')?.addEventListener('click', editStatistics);
    document.getElementById('editTacticsBtn')?.addEventListener('click', editTactics);
    document.getElementById('saveStatsBtn')?.addEventListener('click', saveStatistics);
    document.getElementById('saveTacticsBtn')?.addEventListener('click', saveTactics);

    setupSaveMatchButton();
});

function showNotification(message, type) {
    // Перевіряємо, чи це не виклик від самого себе
    if (window._showingNotification) {
        return;
    }

    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        window._showingNotification = true;
        alert(message);
        window._showingNotification = false;
    }
}