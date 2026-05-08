// logic/pages/saved.js
// Ключі для localStorage (для резервного копіювання, якщо потрібно)
const STORAGE_KEYS = {
    MATCHES: 'saved_matches',
    TEAMS: 'saved_teams',
    TOURNAMENTS: 'saved_tournaments'
};

// Оновити лічильники
async function updateCounters() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        $('#savedMatchesCount').text('0');
        $('#savedTeamsCount').text('0');
        $('#savedTournamentsCount').text('0');
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        $('#savedMatchesCount').text(savedItems?.savedMatches?.length || 0);
        $('#savedTeamsCount').text(savedItems?.savedTeams?.length || 0);
        $('#savedTournamentsCount').text(savedItems?.savedTournaments?.length || 0);
    } catch (error) {
        console.error('Error updating counters:', error);
    }
}

async function loadSavedTournaments() {
    const container = document.getElementById('savedTournamentsList');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-lock fa-3x mb-3"></i>
                <p>Увійдіть в акаунт, щоб переглянути збережені турніри</p>
                <a href="/pages/login.html" class="btn btn-primary btn-sm">Увійти</a>
            </div>
        `;
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const savedTournamentIds = savedItems?.savedTournaments || [];

        if (savedTournamentIds.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-trophy fa-3x mb-3"></i>
                    <p>У вас немає збережених турнірів</p>
                    <a href="/pages/tournaments.html" class="btn btn-primary btn-sm">Перейти до турнірів</a>
                </div>
            `;
            return;
        }

        const allTournaments = await window.tournamentsApi.getAll();
        const savedTournaments = allTournaments.filter(t => savedTournamentIds.includes(t.id));

        displaySavedTournaments(savedTournaments);
    } catch (error) {
        console.error('Error loading saved tournaments:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger">Помилка завантаження</div>';
    }
}
function displaySavedMatches(matches) {
    const container = document.getElementById('savedMatchesList');

    if (!matches || matches.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-star fa-3x mb-3"></i>
                <p>Збережених матчів не знайдено</p>
            </div>
        `;
        return;
    }

    let html = '';
    for (const match of matches) {
        const homeTeamName = match.homeTeam?.teamName || match.homeTeamId?.substring(0, 8) || 'Команда 1';
        const awayTeamName = match.awayTeam?.teamName || match.awayTeamId?.substring(0, 8) || 'Команда 2';

        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card saved-card" data-match-id="${match.id}" style="cursor: pointer;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge ${getStatusClass(match.status)}">${getStatusText(match.status)}</span>
                            <button class="btn btn-sm btn-outline-danger remove-saved" data-type="match" data-id="${match.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <div class="text-center">
                            <div class="fw-bold">${escapeHtml(homeTeamName)}</div>
                            <div class="my-2">VS</div>
                            <div class="fw-bold">${escapeHtml(awayTeamName)}</div>
                        </div>
                        <div class="text-center mt-2">
                            <small class="text-muted">${formatDate(match.startTime)}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    // Додаємо обробники кліків
    document.querySelectorAll('.saved-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.remove-saved')) return;
            const matchId = card.dataset.matchId;
            if (matchId) {
                window.location.href = `match-details.html?matchId=${matchId}`;
            }
        });
    });

    // Додаємо обробники видалення
    document.querySelectorAll('.remove-saved').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            removeSavedItem(type, id);
        });
    });
}
async function loadSavedTeams() {
    const container = document.getElementById('savedTeamsList');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-lock fa-3x mb-3"></i>
                <p>Увійдіть в акаунт, щоб переглянути збережені команди</p>
                <a href="/pages/login.html" class="btn btn-primary btn-sm">Увійти</a>
            </div>
        `;
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const savedTeamIds = savedItems?.savedTeams || [];

        if (savedTeamIds.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-users fa-3x mb-3"></i>
                    <p>У вас немає збережених команд</p>
                    <a href="/pages/teams.html" class="btn btn-primary btn-sm">Перейти до команд</a>
                </div>
            `;
            return;
        }

        const allTeams = await window.teamsApi.getAll();
        const savedTeams = allTeams.filter(t => savedTeamIds.includes(t.id));

        displaySavedTeams(savedTeams);
    } catch (error) {
        console.error('Error loading saved teams:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger">Помилка завантаження</div>';
    }
}

function displaySavedTeams(teams) {
    const container = document.getElementById('savedTeamsList');

    if (!teams || teams.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>Збережених команд не знайдено</p>
            </div>
        `;
        return;
    }

    let html = '';
    for (const team of teams) {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card saved-card" data-id="${team.id}" style="cursor: pointer;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${escapeHtml(team.teamName || 'Без назви')}</h6>
                            <button class="btn btn-sm btn-outline-danger remove-saved" data-type="team" data-id="${team.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="card-text small text-muted">${escapeHtml((team.teamDescription || '').substring(0, 80))}</p>
                        <span class="badge bg-secondary">${team.sportName || 'Спорт'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}
// Завантажити збережені матчі
async function loadSavedMatches() {
    const container = document.getElementById('savedMatchesList');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-lock fa-3x mb-3"></i>
                <p>Увійдіть в акаунт, щоб переглянути збережені матчі</p>
                <a href="/pages/login.html" class="btn btn-primary btn-sm">Увійти</a>
            </div>
        `;
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const savedMatchIds = savedItems?.savedMatches || [];

        if (savedMatchIds.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-star fa-3x mb-3"></i>
                    <p>У вас немає збережених матчів</p>
                    <a href="/index.html" class="btn btn-primary btn-sm">Перейти до матчів</a>
                </div>
            `;
            return;
        }

        const allMatches = await window.matchesApi.getAll();
        const savedMatches = allMatches.filter(m => savedMatchIds.includes(m.id));

        displaySavedMatches(savedMatches);

    } catch (error) {
        console.error('Error loading saved matches:', error);
        container.innerHTML = '<div class="col-12 text-center text-danger">Помилка завантаження</div>';
    }
}

function displaySavedTournaments(tournaments) {
    const container = document.getElementById('savedTournamentsList');

    if (!tournaments || tournaments.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-trophy fa-3x mb-3"></i>
                <p>Збережених турнірів не знайдено</p>
            </div>
        `;
        return;
    }

    let html = '';
    for (const tournament of tournaments) {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card saved-card" data-id="${tournament.id}" style="cursor: pointer;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${escapeHtml(tournament.tournamentName || 'Без назви')}</h6>
                            <button class="btn btn-sm btn-outline-danger remove-saved" data-type="tournament" data-id="${tournament.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                        <p class="card-text small text-muted">${escapeHtml((tournament.tournamentDescription || '').substring(0, 80))}</p>
                        <div class="d-flex justify-content-between">
                            <span class="badge bg-secondary">${tournament.tournamentType || 'Турнір'}</span>
                            <small>${formatDate(new Date(tournament.startDate))}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;

    // Обробники кліків
    document.querySelectorAll('.saved-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.remove-saved')) return;
            const id = card.dataset.id;
            window.location.href = `tournament-details.html?id=${id}`;
        });
    });
}
async function removeSavedItem(type, id) {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        if (type === 'match') {
            await window.savedItemsApi.removeSavedMatch(id);
        } else if (type === 'tournament') {
            await window.savedItemsApi.removeSavedTournament(id);
        } else if (type === 'team') {
            // Переконайтеся, що цей метод існує в savedItemsApi
            if (window.savedItemsApi.removeSavedTeam) {
                await window.savedItemsApi.removeSavedTeam(id);
            } else {
                console.warn('removeSavedTeam not implemented in savedItemsApi');
            }
        }
        await loadSavedMatches();
        await loadSavedTournaments();
        await loadSavedTeams();
        await updateCounters();
    } catch (error) {
        console.error('Error removing saved item:', error);
        alert('Помилка видалення');
    }
}

function getStatusClass(status) {
    const classes = { upcoming: 'bg-secondary', live: 'bg-danger', finished: 'bg-success' };
    return classes[status] || 'bg-secondary';
}

function getStatusText(status) {
    const texts = { upcoming: 'Заплановано', live: 'LIVE', finished: 'Завершено' };
    return texts[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return 'Дата невідома';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
$('button[data-bs-target="#savedTournaments"]').on('shown.bs.tab', function() {
    loadSavedTournaments();
});

$('button[data-bs-target="#savedTeams"]').on('shown.bs.tab', function() {
    loadSavedTeams();
});
// Ініціалізація
$(document).ready(function() {
    updateCounters();
    loadSavedMatches();
    loadSavedTournaments();
    loadSavedTeams();
});