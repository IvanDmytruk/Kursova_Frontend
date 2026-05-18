// logic/pages/tournamentDetails.js

let currentTournament = null;
let tournamentTeams = [];
let allTeams = [];
let teamToDelete = null;

$(document).ready(function() {
    updateAuthUI();
    bindEvents();
    loadTournamentDetails();
});

// Оновлення UI авторизації
function updateAuthUI() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'Admin' || user.isAdmin === true;

    if (token && user.id) {
        $('#guestButtons').hide();
        $('#userMenu').show();
        $('#userNameNav').text(`${user.surname || ''} ${user.name || ''}`.trim() || 'Профіль');

        if (isAdmin) {
            $('#editTournamentBtn').show();
            $('#addTeamBtn').show();
        }
    } else {
        $('#guestButtons').show();
        $('#userMenu').hide();
        $('#editTournamentBtn').hide();
        $('#addTeamBtn').hide();
    }
}

// Отримання ID турніру з URL
function getTournamentId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Завантаження деталей турніру
async function loadTournamentDetails() {
    const tournamentId = getTournamentId();
    if (!tournamentId) {
        showError('ID турніру не вказано');
        window.location.href = '/pages/tournaments.html';
        return;
    }

    try {
        const tournament = await window.tournamentsApi.getById(tournamentId);
        if (!tournament) {
            showError('Турнір не знайдено');
            window.location.href = '/pages/tournaments.html';
            return;
        }

        currentTournament = tournament;
        displayTournamentInfo(tournament);

        tournamentTeams = tournament.tournamentParticipants || [];
        displayParticipants(tournamentTeams);

        $('#loadingSpinner').hide();
        $('#tournamentContent').show();

    } catch (error) {
        console.error('Помилка завантаження турніру:', error);
        showError('Не вдалося завантажити дані турніру');
        $('#loadingSpinner').hide();
    }
}

// Відображення інформації про турнір
function displayTournamentInfo(tournament) {
    $('#tournamentName').text(tournament.tournamentName || 'Без назви');
    $('#tournamentDescription').text(tournament.tournamentDescription || 'Опис відсутній');
    $('#tournamentType').text(getTournamentTypeText(tournament.tournamentType));
    $('#tournamentFormat').text(tournament.format === 'Command' ? 'Командний' : 'Індивідуальний');
    $('#prizeFund').text((tournament.prizeFund || 0).toLocaleString());
    $('#startDate').text(formatDate(tournament.startDate));
    $('#endDate').text(tournament.endDate ? formatDate(tournament.endDate) : 'Не вказано');
    $('#maxParticipants').text(tournament.maxParticipants === 0 ? 'Без обмежень' : tournament.maxParticipants);

    const status = getTournamentStatus(tournament);
    const statusBadge = $('#tournamentStatus');
    statusBadge.text(status.text);
    statusBadge.removeClass('bg-success bg-warning bg-secondary bg-primary');
    statusBadge.addClass(status.class);
}

// Відображення списку учасників
function displayParticipants(teams) {
    const isAdmin = isUserAdmin();

    if (!teams || teams.length === 0) {
        $('#participantsList').html(`
            <div class="col-12 text-center text-muted py-4">
                <i class="fas fa-users fa-2x mb-2"></i>
                <p>Учасників поки немає</p>
                ${isAdmin ? '<button class="btn btn-sm btn-primary mt-2" onclick="$(\'#addTeamBtn\').click()"><i class="fas fa-plus"></i> Додати першу команду</button>' : ''}
            </div>
        `);
        return;
    }

    let html = '';
    teams.forEach(team => {
        html += `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="team-card" data-team-id="${team.id}">
                    <div class="team-card-logo">
                        <i class="fas fa-users"></i>
                    </div>
                    <h6 class="team-card-name">${escapeHtml(team.teamName || 'Без назви')}</h6>
                    <div class="team-card-stats">
                        <small>Капітан: ${escapeHtml(team.captainName || 'Не вказано')}</small>
                    </div>
                    ${isAdmin ? `
                        <button class="btn btn-sm btn-danger mt-2 remove-team-btn" data-team-id="${team.id}" data-team-name="${escapeHtml(team.teamName || team.name)}">
                            <i class="fas fa-trash"></i> Видалити
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });

    $('#participantsList').html(html);

    if (isAdmin) {
        $('.remove-team-btn').click(function(e) {
            e.stopPropagation();
            const teamId = $(this).data('team-id');
            const teamName = $(this).data('team-name');
            showDeleteConfirmation(teamId, teamName);
        });
    }

    $('.team-card').click(function(e) {
        if (!$(e.target).hasClass('remove-team-btn') && !$(e.target).parent().hasClass('remove-team-btn')) {
            const teamId = $(this).data('team-id');
            if (teamId) {
                window.location.href = `/pages/team-details.html?id=${teamId}`;
            }
        }
    });
}

// Завантаження всіх команд для додавання
async function loadAllTeamsForAdding() {
    try {
        const allTeamsResponse = await window.teamsApi.getAll();
        allTeams = allTeamsResponse || [];

        const existingTeamIds = new Set(tournamentTeams.map(t => t.id));
        const availableTeams = allTeams.filter(team => !existingTeamIds.has(team.id));

        displayAvailableTeams(availableTeams);

    } catch (error) {
        console.error('Помилка завантаження команд:', error);
        $('#teamsListContainer').html(`
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Помилка завантаження команд. Спробуйте пізніше.
            </div>
        `);
    }
}

// Відображення доступних команд
function displayAvailableTeams(teams) {
    if (!teams || teams.length === 0) {
        $('#teamsListContainer').html(`
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Всі доступні команди вже зареєстровані в турнірі.
            </div>
        `);
        return;
    }

    let html = '<div class="row">';
    teams.forEach(team => {
        html += `
            <div class="col-md-6 mb-2">
                <div class="d-flex justify-content-between align-items-center p-2 border rounded team-item" data-team-id="${team.id}">
                    <div>
                        <strong>${escapeHtml(team.teamName)}</strong>
                        <br>
                        <small class="text-muted">Капітан: ${escapeHtml(team.captainName || 'Не вказано')}</small>
                    </div>
                    <button class="btn btn-sm btn-success add-team-to-tournament-btn" data-team-id="${team.id}" data-team-name="${escapeHtml(team.teamName)}">
                        <i class="fas fa-plus"></i> Додати
                    </button>
                </div>
            </div>
        `;
    });
    html += '</div>';

    $('#teamsListContainer').html(html);

    $('.add-team-to-tournament-btn').click(async function(e) {
        e.stopPropagation();
        const teamId = $(this).data('team-id');
        const teamName = $(this).data('team-name');
        await addTeamToTournament(teamId, teamName);
    });
}

// Додавання команди до турніру
async function addTeamToTournament(teamId, teamName) {
    const tournamentId = getTournamentId();

    try {
        $('#addTeamModal').find('.modal-body').append(`
            <div class="loading-overlay position-fixed" style="background:rgba(0,0,0,0.5); top:0; left:0; right:0; bottom:0; z-index:9999; display:flex; align-items:center; justify-content:center">
                <div class="spinner-border text-light"></div>
            </div>
        `);

        // Використовуємо оновлений метод addTeam
        await window.tournamentsApi.addTeam(tournamentId, teamId);

        // Перезавантажуємо дані
        await loadTournamentDetails();

        showSuccess(`Команду "${teamName}" успішно додано до турніру!`);
        $('#addTeamModal').modal('hide');

    } catch (error) {
        console.error('Помилка додавання команди:', error);
        showError(error.message || 'Не вдалося додати команду до турніру');
    } finally {
        $('.loading-overlay').remove();
    }
}

// Видалення команди з турніру
async function deleteTeamFromTournament() {
    if (!teamToDelete) return;

    const tournamentId = getTournamentId();

    try {
        await window.tournamentsApi.removeTeam(tournamentId, teamToDelete.id);

        showSuccess(`Команду "${teamToDelete.name}" видалено з турніру`);
        await loadTournamentDetails();

        $('#confirmDeleteModal').modal('hide');
        teamToDelete = null;

    } catch (error) {
        console.error('Помилка видалення команди:', error);
        showError('Не вдалося видалити команду з турніру');
    }
}

// Підтвердження видалення команди
function showDeleteConfirmation(teamId, teamName) {
    teamToDelete = { id: teamId, name: teamName };
    $('#deleteTeamName').text(teamName);
    $('#confirmDeleteModal').modal('show');
}
// Редагування турніру
async function editTournament() {
    if (!currentTournament) return;

    $('#editTournamentName').val(currentTournament.tournamentName || '');
    $('#editTournamentDescription').val(currentTournament.tournamentDescription || '');
    $('#editTournamentType').val(currentTournament.tournamentType || 'OlympicSystem');
    $('#editTournamentFormat').val(currentTournament.format || 'Command');
    $('#editPrizeFund').val(currentTournament.prizeFund || 0);
    $('#editMaxParticipants').val(currentTournament.maxParticipants || 0);
    $('#editSportName').val(currentTournament.sportName || 'Football');

    if (currentTournament.startDate) {
        $('#editStartDate').val(formatDateTimeLocal(currentTournament.startDate));
    }
    if (currentTournament.endDate) {
        $('#editEndDate').val(formatDateTimeLocal(currentTournament.endDate));
    }

    $('#editTournamentModal').modal('show');
}

// Збереження змін турніру
async function saveTournamentChanges() {
    const tournamentId = getTournamentId();

    const updatedData = {
        tournamentName: $('#editTournamentName').val(),
        tournamentDescription: $('#editTournamentDescription').val(),
        tournamentType: $('#editTournamentType').val(),
        format: $('#editTournamentFormat').val(),
        prizeFund: parseInt($('#editPrizeFund').val()) || 0,
        maxParticipants: parseInt($('#editMaxParticipants').val()) || 0,
        sportName: $('#editSportName').val(),
        startDate: new Date($('#editStartDate').val()).toISOString(),
        endDate: $('#editEndDate').val() ? new Date($('#editEndDate').val()).toISOString() : null
    };

    if (!updatedData.tournamentName) {
        showError('Введіть назву турніру');
        return;
    }

    if (!updatedData.startDate) {
        showError('Введіть дату початку');
        return;
    }

    try {
        $('#saveTournamentChangesBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Збереження...');

        await window.tournamentsApi.update(tournamentId, updatedData);

        showSuccess('Зміни успішно збережено!');
        $('#editTournamentModal').modal('hide');
        await loadTournamentDetails();

    } catch (error) {
        console.error('Помилка збереження:', error);
        showError(error.message || 'Не вдалося зберегти зміни');
    } finally {
        $('#saveTournamentChangesBtn').prop('disabled', false).html('Зберегти зміни');
    }
}

async function saveTournament() {
    const tournamentId = getTournamentId();
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showError('Увійдіть в акаунт, щоб зберігати турніри');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        // Перевіряємо чи існує savedItemsApi
        if (window.savedItemsApi && window.savedItemsApi.saveTournament) {
            await window.savedItemsApi.saveTournament(tournamentId);
        } else {
            // Якщо API немає, показуємо повідомлення
            showSuccess('Турнір збережено в обране! (демо-режим)');
            return;
        }
        showSuccess('Турнір збережено в обране!');
    } catch (error) {
        console.error('Помилка збереження:', error);
        showError('Не вдалося зберегти турнір');
    }
}

// Реєстрація на турнір
async function registerForTournament() {
    const tournamentId = getTournamentId();
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showError('Увійдіть в акаунт, щоб зареєструватися');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        if (currentTournament.format === 'Command') {
            await showTeamSelectionModal();
        } else {
            await window.tournamentsApi.registerPlayer(tournamentId);
            showSuccess('Ви успішно зареєструвалися на турнір!');
            await loadTournamentDetails();
        }
    } catch (error) {
        console.error('Помилка реєстрації:', error);
        showError(error.message || 'Не вдалося зареєструватися');
    }
}

// Показати модальне вікно вибору команди
async function showTeamSelectionModal() {
    // Тут можна реалізувати вибір команди користувача
    showInfo('Для командних турнірів виберіть команду в профілі');
}

// Допоміжні функції
function getTournamentTypeText(type) {
    const types = {
        'OlympicSystem': 'Олімпійська система',
        'RoundRobin': 'Коловий турнір',
        'SwissSystem': 'Швейцарська система',
        'DoubleElimination': 'Дві поразки'
    };
    return types[type] || type;
}

function getTournamentStatus(tournament) {
    const now = new Date();
    const start = new Date(tournament.startDate);
    const end = tournament.endDate ? new Date(tournament.endDate) : null;

    if (now < start) {
        return { text: 'Заплановано', class: 'bg-secondary' };
    } else if (end && now > end) {
        return { text: 'Завершено', class: 'bg-success' };
    } else {
        return { text: 'Активний', class: 'bg-primary' };
    }
}

function formatDate(dateStr) {
    if (!dateStr) return 'Не вказано';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTimeLocal(dateStr) {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
}

function isUserAdmin() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role === 'Admin' || user.isAdmin === true;
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

function showError(message) {
    const alert = $(`
        <div class="alert alert-danger alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index: 9999; background: #dc3545; color: white;" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append(alert);
    setTimeout(() => alert.alert('close'), 5000);
}

function showSuccess(message) {
    const alert = $(`
        <div class="alert alert-success alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index: 9999; background: #28a745; color: white;" role="alert">
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append(alert);
    setTimeout(() => alert.alert('close'), 3000);
}

function showInfo(message) {
    const alert = $(`
        <div class="alert alert-info alert-dismissible fade show position-fixed top-0 end-0 m-3" style="z-index: 9999;" role="alert">
            <i class="fas fa-info-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('body').append(alert);
    setTimeout(() => alert.alert('close'), 3000);
}

// Пошук команд
$(document).on('input', '#teamSearchInput', function() {
    const searchTerm = $(this).val().toLowerCase();
    const filteredTeams = allTeams.filter(team =>
        (team.teamName || '').toLowerCase().includes(searchTerm)
    );
    displayAvailableTeams(filteredTeams);
});

// Зв'язування подій
function bindEvents() {
    $('#saveTournamentBtn').click(saveTournament);
    $('#editTournamentBtn').click(editTournament);
    $('#registerForTournament').click(registerForTournament);
    $('#addTeamBtn').click(async function() {
        await loadAllTeamsForAdding();
        $('#addTeamModal').modal('show');
    });
    $('#saveTournamentChangesBtn').click(saveTournamentChanges);
    $('#confirmDeleteBtn').click(deleteTeamFromTournament);
    $('#logoutBtn').click(async function(e) {
        e.preventDefault();
        localStorage.clear();
        window.location.href = '/index.html';
    });
}