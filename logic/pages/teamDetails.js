// logic/pages/teamDetails.js
let currentTeam = null;
let currentUser = null;

function getTeamId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadTeamDetails() {
    const teamId = getTeamId();
    if (!teamId) {
        document.getElementById('loadingSpinner').innerHTML = '<div class="alert alert-danger">ID команди не вказано</div>';
        return;
    }

    try {
        currentTeam = await window.teamsApi.getById(teamId);
        displayTeamInfo(currentTeam);
        loadPlayers();
        loadMatches();
        loadStatistics();
        loadTournaments();
        checkIfSaved();
        checkEditPermissions();

        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('teamContent').style.display = 'block';
    } catch (error) {
        console.error('Error loading team:', error);
        document.getElementById('loadingSpinner').innerHTML = `<div class="alert alert-danger">Помилка завантаження: ${error.message}</div>`;
    }
}

function displayTeamInfo(team) {
    document.getElementById('teamName').textContent = team.teamName || 'Без назви';
    document.getElementById('teamDescription').textContent = team.teamDescription || 'Опис відсутній';
    document.getElementById('teamSport').textContent = team.sportName || 'Невідомо';
    document.getElementById('teamPopularity').textContent = team.popularityScore || 0;
}

async function checkEditPermissions() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    currentUser = user;

    const hasEditRights = token && (user.role === 'Admin');

    if (hasEditRights) {
        $('#editTeamBtnContainer').show();
        $('#editTeamBtn').on('click', openEditModal);
    }
}

function openEditModal() {
    $('#editTeamName').val(currentTeam.teamName || '');
    $('#editTeamDescription').val(currentTeam.teamDescription || '');
    $('#editTeamSport').val(currentTeam.sportName || 'Football');
    $('#editTeamModal').modal('show');
}

async function saveTeamEdit() {
    const updateData = {
        teamName: $('#editTeamName').val(),
        teamDescription: $('#editTeamDescription').val(),
        sportName: $('#editTeamSport').val()
    };

    try {
        $('#saveTeamEditBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Збереження...');
        await window.teamsApi.update(currentTeam.id, updateData);
        showNotification('Дані команди оновлено!', 'success');
        $('#editTeamModal').modal('hide');
        await loadTeamDetails();
    } catch (error) {
        console.error('Error updating team:', error);
        showNotification('Помилка оновлення', 'error');
    } finally {
        $('#saveTeamEditBtn').prop('disabled', false).html('Зберегти');
    }
}

async function loadPlayers() {
    const container = $('#playersList');
    try {
        const players = await window.teamsApi.getPlayers(currentTeam.id);

        if (!players || players.length === 0) {
            container.html('<div class="col-12 text-center text-muted py-4"><i class="fas fa-user-slash fa-2x mb-2"></i><p>Гравців не додано</p></div>');
            return;
        }

        let html = '<div class="row">';
        for (const player of players) {
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card player-card h-100" data-id="${player.id}" style="cursor: pointer;">
                        <div class="card-body text-center">
                            <div class="player-avatar rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 70px; height: 70px;">
                                <i class="fas fa-user fa-2x text-white"></i>
                            </div>
                            <h6 class="card-title">${escapeHtml(player.name || '')} ${escapeHtml(player.surname || '')}</h6>
                            <p class="card-text small text-muted">${player.playerProfile?.jerseyNumber ? `#${player.playerProfile.jerseyNumber}` : 'Номер не вказано'}</p>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.html(html);

        $('.player-card').on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/pages/player-details.html?id=${id}`;
        });
    } catch (error) {
        console.error('Error loading players:', error);
        container.html('<div class="col-12 text-center text-danger">Помилка завантаження гравців</div>');
    }
}

async function loadMatches() {
    const container = $('#matchesList');
    try {
        const matches = await window.matchesApi.getByTeam(currentTeam.id);

        if (!matches || matches.length === 0) {
            container.html('<div class="text-center text-muted py-4"><i class="fas fa-calendar-times fa-2x mb-2"></i><p>Матчів не знайдено</p></div>');
            return;
        }

        const now = new Date();
        const upcomingMatches = matches.filter(m => new Date(m.startTime) > now).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const pastMatches = matches.filter(m => new Date(m.startTime) <= now).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

        let html = '';

        if (upcomingMatches.length > 0) {
            html += '<h6 class="mb-3 text-success"><i class="fas fa-calendar-week me-2"></i>Наступні матчі</h6>';
            for (const match of upcomingMatches.slice(0, 5)) {
                html += renderMatchItem(match);
            }
        }

        if (pastMatches.length > 0) {
            html += '<h6 class="mb-3 mt-4 text-secondary"><i class="fas fa-history me-2"></i>Останні матчі</h6>';
            for (const match of pastMatches.slice(0, 10)) {
                html += renderMatchItem(match);
            }
        }

        container.html(html);

        $('.match-item').on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/pages/match-details.html?matchId=${id}`;
        });
    } catch (error) {
        console.error('Error loading matches:', error);
        container.html('<div class="text-center text-danger">Помилка завантаження матчів</div>');
    }
}

function renderMatchItem(match) {
    const isHome = match.homeTeamId === currentTeam.id;
    const opponentName = isHome ? match.awayTeam?.teamName || 'Невідома' : match.homeTeam?.teamName || 'Невідома';
    const homeScore = match.score?.home || 0;
    const awayScore = match.score?.away || 0;
    const result = isHome ? `${homeScore} : ${awayScore}` : `${awayScore} : ${homeScore}`;
    const matchDate = new Date(match.startTime);
    const isLive = match.status === 'live';
    const isFinished = match.status === 'finished' || matchDate < new Date();

    let statusBadge = '';
    if (isLive) statusBadge = '<span class="badge bg-danger ms-2">LIVE</span>';
    else if (isFinished) statusBadge = '<span class="badge bg-secondary ms-2">Завершено</span>';
    else statusBadge = '<span class="badge bg-success ms-2">Заплановано</span>';

    return `
        <div class="list-group-item match-item" data-id="${match.id}" style="cursor: pointer;">
            <div class="d-flex justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <strong>${escapeHtml(opponentName)}</strong>
                    ${statusBadge}
                    <div class="small text-muted">${formatDate(matchDate)}</div>
                </div>
                <div class="text-end">
                    <span class="fw-bold fs-5">${result}</span>
                </div>
            </div>
        </div>
    `;
}

async function loadStatistics() {
    const container = $('#seasonStatsContainer');
    const messageDiv = $('#statsMessage');

    try {
        const stats = await window.statisticsApi?.getTeamStats(currentTeam.id) || [];

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
        console.error('Error loading statistics:', error);
        container.empty();
        messageDiv.show();
    }
}

async function loadTournaments() {
    const container = $('#tournamentsList');
    try {
        const allTournaments = await window.tournamentsApi.getAll() || [];
        const teamTournaments = allTournaments.filter(t =>
            t.tournamentParticipants?.some(p => p.id === currentTeam.id)
        );

        if (!teamTournaments || teamTournaments.length === 0) {
            container.html('<div class="col-12 text-center text-muted py-4"><i class="fas fa-trophy fa-2x mb-2"></i><p>Команда не бере участі в турнірах</p></div>');
            return;
        }

        let html = '<div class="row">';
        for (const tournament of teamTournaments) {
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
        container.html('<div class="col-12 text-center text-danger">Помилка завантаження турнірів</div>');
    }
}

async function checkIfSaved() {
    const teamId = getTeamId();
    const saveBtn = $('#saveTeamBtn');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        saveBtn.html('<i class="far fa-bookmark"></i> Увійдіть, щоб зберегти');
        saveBtn.prop('disabled', true);
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTeams?.includes(teamId) || false;

        if (isSaved) {
            saveBtn.html('<i class="fas fa-bookmark"></i> Збережено');
            saveBtn.removeClass('btn-outline-warning').addClass('btn-warning');
        } else {
            saveBtn.html('<i class="far fa-bookmark"></i> Зберегти команду');
            saveBtn.removeClass('btn-warning').addClass('btn-outline-warning');
        }
        saveBtn.prop('disabled', false);
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}

async function toggleSaveTeam() {
    const teamId = getTeamId();
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showNotification('Увійдіть, щоб зберігати команди', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    const saveBtn = $('#saveTeamBtn');

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTeams?.includes(teamId) || false;

        saveBtn.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i>');

        if (isSaved) {
            await window.savedItemsApi.removeSavedTeam(teamId);
            showNotification('Команду видалено зі збережених', 'info');
            saveBtn.html('<i class="far fa-bookmark"></i> Зберегти команду');
            saveBtn.removeClass('btn-warning').addClass('btn-outline-warning');
        } else {
            await window.savedItemsApi.saveTeam(teamId);
            showNotification('Команду збережено!', 'success');
            saveBtn.html('<i class="fas fa-bookmark"></i> Збережено');
            saveBtn.removeClass('btn-outline-warning').addClass('btn-warning');
        }
    } catch (error) {
        console.error('Error toggling saved team:', error);
        showNotification('Помилка: ' + error.message, 'error');
    } finally {
        saveBtn.prop('disabled', false);
    }
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

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Дата невідома';
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showNotification(message, type) {
    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}

$(document).ready(function() {
    loadTeamDetails();
    $('#saveTeamBtn').on('click', toggleSaveTeam);
    $('#saveTeamEditBtn').on('click', saveTeamEdit);
});