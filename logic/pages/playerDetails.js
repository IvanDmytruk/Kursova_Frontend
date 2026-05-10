// logic/pages/playerDetails.js
let currentPlayer = null;

function getPlayerId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadPlayerDetails() {
    const playerId = getPlayerId();
    if (!playerId) {
        document.getElementById('loadingSpinner').innerHTML = '<div class="alert alert-danger">ID гравця не вказано</div>';
        return;
    }

    try {
        currentPlayer = await window.usersApi.getById(playerId);
        displayPlayerInfo();
        loadPlayerStatistics();
        loadPlayerTournaments();
        loadPlayerMatches();
        checkIfSaved();

        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('playerContent').style.display = 'block';
    } catch (error) {
        console.error('Error loading player:', error);
        document.getElementById('loadingSpinner').innerHTML = `<div class="alert alert-danger">Помилка завантаження: ${error.message}</div>`;
    }
}

function displayPlayerInfo() {
    const fullName = `${currentPlayer.surname || ''} ${currentPlayer.name || ''}`.trim();
    document.getElementById('playerFullName').textContent = fullName || 'Гравець';
    document.getElementById('playerRole').textContent = currentPlayer.role || 'Користувач';
    document.getElementById('playerAge').textContent = currentPlayer.age || '-';
    document.getElementById('playerEmail').textContent = currentPlayer.contactInfo?.email || '-';
    document.getElementById('playerPhone').textContent = currentPlayer.contactInfo?.phone || '-';

    const jerseyNumber = currentPlayer.playerProfile?.jerseyNumber;
    document.getElementById('playerJerseyNumber').textContent = jerseyNumber || '-';
    document.getElementById('playerPopularity').textContent = currentPlayer.playerProfile?.popularityScore || 0;

    if (currentPlayer.playerProfile?.teamId) {
        loadPlayerTeam(currentPlayer.playerProfile.teamId);
    }
}

async function loadPlayerTeam(teamId) {
    try {
        const team = await window.teamsApi.getById(teamId);
        if (team) {
            const teamLink = `<a href="/pages/team-details.html?id=${team.id}" class="text-decoration-none">${escapeHtml(team.teamName)}</a>`;
            document.getElementById('playerTeam').innerHTML = teamLink;
        }
    } catch (error) {
        console.error('Error loading team:', error);
        document.getElementById('playerTeam').textContent = 'Не вказано';
    }
}

async function loadPlayerStatistics() {
    const container = $('#statsContainer');
    const messageDiv = $('#statsMessage');

    try {
        const stats = await window.statisticsApi?.getUserStats(currentPlayer.id) || [];

        if (!stats || stats.length === 0) {
            container.empty();
            messageDiv.show();
            return;
        }

        messageDiv.hide();

        const seasons = [...new Set(stats.map(s => s.season).filter(s => s))];
        let html = '';

        for (const season of seasons) {
            const seasonStats = stats.filter(s => s.season === season);
            const totals = seasonStats.reduce((acc, s) => {
                acc.wins += s.wins || 0;
                acc.losses += s.losses || 0;
                acc.draws += s.draws || 0;
                acc.points += s.points || 0;
                acc.matchesPlayed += s.matchesPlayed || 0;
                return acc;
            }, { wins: 0, losses: 0, draws: 0, points: 0, matchesPlayed: 0 });

            html += `
                <div class="card mb-3">
                    <div class="card-header bg-light">
                        <h6 class="mb-0">Сезон ${escapeHtml(season)}</h6>
                    </div>
                    <div class="card-body">
                        <div class="row text-center">
                            <div class="col-3">
                                <h5>${totals.matchesPlayed}</h5>
                                <small class="text-muted">Матчів</small>
                            </div>
                            <div class="col-3">
                                <h5 class="text-success">${totals.wins}</h5>
                                <small class="text-muted">Перемог</small>
                            </div>
                            <div class="col-3">
                                <h5 class="text-danger">${totals.losses}</h5>
                                <small class="text-muted">Поразок</small>
                            </div>
                            <div class="col-3">
                                <h5 class="text-warning">${totals.points}</h5>
                                <small class="text-muted">Очок</small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        container.html(html);
    } catch (error) {
        console.error('Error loading player statistics:', error);
        container.empty();
        messageDiv.show();
    }
}

async function loadPlayerTournaments() {
    const container = $('#tournamentsList');
    try {
        const allTournaments = await window.tournamentsApi.getAll() || [];
        const playerTournaments = allTournaments.filter(t =>
            t.tournamentParticipants?.some(p => p.id === currentPlayer.id)
        );

        if (!playerTournaments || playerTournaments.length === 0) {
            container.html('<div class="col-12 text-center text-muted py-4"><i class="fas fa-trophy fa-2x mb-2"></i><p>Гравець не бере участі в турнірах</p></div>');
            return;
        }

        let html = '<div class="row">';
        for (const tournament of playerTournaments) {
            html += `
                <div class="col-md-6 mb-3">
                    <div class="card tournament-card" data-id="${tournament.id}" style="cursor: pointer;">
                        <div class="card-body">
                            <h6 class="card-title">${escapeHtml(tournament.tournamentName || 'Без назви')}</h6>
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
        html += '</div>';
        container.html(html);

        $('.tournament-card').on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/pages/tournament-details.html?id=${id}`;
        });
    } catch (error) {
        console.error('Error loading tournaments:', error);
        container.html('<div class="col-12 text-center text-danger">Помилка завантаження</div>');
    }
}

async function loadPlayerMatches() {
    const container = $('#matchesList');
    try {
        const allMatches = await window.matchesApi.getAll() || [];
        const playerMatches = allMatches.filter(m =>
            m.homeTeamId === currentPlayer.id || m.awayTeamId === currentPlayer.id
        ) || [];

        if (!playerMatches || playerMatches.length === 0) {
            container.html('<div class="text-center text-muted py-4"><i class="fas fa-calendar-times fa-2x mb-2"></i><p>Матчів не знайдено</p></div>');
            return;
        }

        const sortedMatches = playerMatches.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        let html = '';
        for (const match of sortedMatches.slice(0, 20)) {
            const isParticipant = match.homeTeamId === currentPlayer.id || match.awayTeamId === currentPlayer.id;
            const opponent = match.homeTeamId === currentPlayer.id ? match.awayTeam?.teamName || 'Суперник' : match.homeTeam?.teamName || 'Суперник';
            const matchDate = new Date(match.startTime);
            const isFinished = match.status === 'finished' || matchDate < new Date();

            html += `
                <div class="list-group-item match-item" data-id="${match.id}" style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(opponent)}</strong>
                            ${isFinished ? `<span class="badge bg-secondary ms-2">Завершено</span>` : `<span class="badge bg-success ms-2">Заплановано</span>`}
                            <div class="small text-muted">${formatDate(matchDate)}</div>
                        </div>
                        <div class="text-end">
                            <span class="fw-bold">${match.score?.home || 0} : ${match.score?.away || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        container.html(html);

        $('.match-item').on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/pages/match-details.html?matchId=${id}`;
        });
    } catch (error) {
        console.error('Error loading matches:', error);
        container.html('<div class="text-center text-danger">Помилка завантаження</div>');
    }
}

async function checkIfSaved() {
    const playerId = getPlayerId();
    const saveBtn = $('#savePlayerBtn');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        saveBtn.hide();
        return;
    }

    saveBtn.show();

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedPlayers?.includes(playerId) || false;

        if (isSaved) {
            saveBtn.html('<i class="fas fa-bookmark"></i> Збережено');
            saveBtn.removeClass('btn-outline-warning').addClass('btn-warning');
        } else {
            saveBtn.html('<i class="far fa-bookmark"></i> Зберегти гравця');
            saveBtn.removeClass('btn-warning').addClass('btn-outline-warning');
        }
        saveBtn.prop('disabled', false);
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}

async function toggleSavePlayer() {
    const playerId = getPlayerId();
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showNotification('Увійдіть, щоб зберігати гравців', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    const saveBtn = $('#savePlayerBtn');

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedPlayers?.includes(playerId) || false;

        saveBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        if (isSaved) {
            await window.savedItemsApi.removeSavedPlayer(playerId);
            showNotification('Гравця видалено зі збережених', 'info');
            saveBtn.html('<i class="far fa-bookmark"></i> Зберегти гравця');
            saveBtn.removeClass('btn-warning').addClass('btn-outline-warning');
        } else {
            await window.savedItemsApi.savePlayer(playerId);
            showNotification('Гравця збережено!', 'success');
            saveBtn.html('<i class="fas fa-bookmark"></i> Збережено');
            saveBtn.removeClass('btn-outline-warning').addClass('btn-warning');
        }
    } catch (error) {
        console.error('Error toggling saved player:', error);
        showNotification('Помилка: ' + error.message, 'error');
    } finally {
        saveBtn.prop('disabled', false);
    }
}

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Дата невідома';
    return date.toLocaleDateString('uk-UA');
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

function showNotification(message, type) {
    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}

$(document).ready(function() {
    loadPlayerDetails();
    $('#savePlayerBtn').on('click', toggleSavePlayer);

    if (window.SearchBar && $('#search-container').length) {
        new SearchBar('search-container');
    }
});