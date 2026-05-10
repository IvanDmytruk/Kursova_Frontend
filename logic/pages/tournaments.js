// logic/pages/tournaments.js
let currentSport = localStorage.getItem('selectedSport') || 'all';
let allTournaments = [];

$(document).ready(function() {
    updateAuthUI();
    setupSportSelector();
    loadTournaments();
    bindEvents();

    if (window.SearchBar && $('#search-container').length) {
        new SearchBar('search-container');
    }
});

function updateAuthUI() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && (user.id || user.email)) {
        $('#guestButtons').hide();
        $('#userMenu').show();
        $('#userNameNav').text(`${user.surname || ''} ${user.name || ''}`.trim() || 'Профіль');
        $('#createTournamentBtn').show();
    } else {
        $('#guestButtons').show();
        $('#userMenu').hide();
        $('#createTournamentBtn').hide();
    }
}

function setupSportSelector() {
    const sportLinks = document.querySelectorAll('#sportDropdownMenu a[data-sport]');
    sportLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sport = this.getAttribute('data-sport');
            currentSport = sport;
            localStorage.setItem('selectedSport', sport);
            updateSportButtonText(sport);
            loadTournaments();
        });
    });
}

function updateSportButtonText(sport) {
    const sportNames = {
        'all': 'Всі види спорту',
        'Football': '⚽ Футбол',
        'Basketball': '🏀 Баскетбол',
        'Volleyball': '🏐 Волейбол',
        'Handball': '🤾 Гандбол',
        'Tennis': '🎾 Теніс',
        'Boxing': '🥊 Бокс',
        'Judo': '🥋 Дзюдо',
        'Karate': '🥋 Карате',
        'Chess': '♟️ Шахи',
        'Checkers': '⬛ Шашки',
        'Contr_Strike_2': '🎯 CS2',
        'Dota_2': '🗡️ Dota 2',
        'Mobile_Legends_Bang_Bang': '📱 MLBB',
        'Hearts_of_Iron_4': '🌍 Hearts of Iron IV',
        'Civilization_6': '🏛️ Civilization VI'
    };
    const btn = document.getElementById('selectedSportName');
    if (btn) btn.textContent = sportNames[sport] || sport;
}

async function loadTournaments() {
    const container = $('#tournamentsList');
    container.html('<div class="col-12 text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-3x mb-3"></i><p>Завантаження турнірів...</p></div>');

    try {
        let tournaments;
        if (currentSport === 'all') {
            tournaments = await window.tournamentsApi.getActive();
        } else {
            tournaments = await window.tournamentsApi.getActiveBySport(currentSport);
        }
        allTournaments = tournaments || [];
        displayTournaments(allTournaments);
    } catch (error) {
        console.error('Error loading tournaments:', error);
        container.html('<div class="col-12 text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-3x mb-3"></i><p>Помилка завантаження турнірів</p></div>');
    }
}

function displayTournaments(tournaments) {
    const container = $('#tournamentsList');

    if (!tournaments || tournaments.length === 0) {
        container.html('<div class="col-12 text-center text-muted py-5"><i class="fas fa-trophy fa-3x mb-3"></i><p>Турнірів не знайдено</p></div>');
        return;
    }

    let html = '';
    for (const tournament of tournaments) {
        const startDate = new Date(tournament.startDate);

        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card tournament-card h-100" data-id="${tournament.id}" style="cursor: pointer;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">${escapeHtml(tournament.tournamentName || 'Без назви')}</h5>
                            <button class="btn btn-sm btn-outline-warning save-tournament-btn" data-id="${tournament.id}">
                                <i class="far fa-bookmark"></i>
                            </button>
                        </div>
                        <p class="card-text small text-muted">${escapeHtml((tournament.tournamentDescription || '').substring(0, 80))}</p>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <span class="badge bg-secondary">${tournament.tournamentType || 'Турнір'}</span>
                            <span class="badge bg-info">${tournament.format === 'Command' ? '👥 Командний' : '👤 Індивідуальний'}</span>
                        </div>
                        <div class="d-flex justify-content-between mt-2">
                            <small class="text-muted"><i class="far fa-calendar-alt me-1"></i>${formatDate(startDate)}</small>
                            <small class="text-warning"><i class="fas fa-coins me-1"></i>${(tournament.prizeFund || 0).toLocaleString()} грн</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.html(html);

    $('.tournament-card').on('click', function(e) {
        if ($(e.target).closest('.save-tournament-btn').length) return;
        const id = $(this).data('id');
        window.location.href = `/pages/tournament-details.html?id=${id}`;
    });

    $('.save-tournament-btn').on('click', async function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        await toggleSaveTournament(id, $(this));
    });
}

async function toggleSaveTournament(id, btn) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        showNotification('Увійдіть, щоб зберігати турніри', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTournaments?.includes(id) || false;

        if (isSaved) {
            await window.savedItemsApi.removeSavedTournament(id);
            btn.html('<i class="far fa-bookmark"></i>');
            showNotification('Турнір видалено зі збережених', 'info');
        } else {
            await window.savedItemsApi.saveTournament(id);
            btn.html('<i class="fas fa-bookmark"></i>');
            showNotification('Турнір збережено!', 'success');
        }
    } catch (error) {
        console.error('Error toggling saved tournament:', error);
        showNotification('Помилка', 'error');
    }
}

function bindEvents() {
    $('#createTournamentBtn').click(() => {
        $('#createTournamentModal').modal('show');
    });

    $('#submitTournamentBtn').click(async () => {
        await createTournament();
    });

    $('#logoutBtn').click(async function(e) {
        e.preventDefault();
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken && window.authApi) {
            await window.authApi.logout(refreshToken);
        }
        localStorage.clear();
        window.location.href = '/index.html';
    });
}

async function createTournament() {
    const form = $('#createTournamentForm');
    let selectedSport = currentSport === 'all' ? $('#tournamentSportSelect').val() : currentSport;

    const formData = {
        tournamentName: form.find('[name="tournamentName"]').val(),
        tournamentDescription: form.find('[name="tournamentDescription"]').val(),
        tournamentType: form.find('[name="tournamentType"]').val(),
        format: form.find('[name="format"]').val(),
        prizeFund: parseInt(form.find('[name="prizeFund"]').val()) || 0,
        startDate: new Date(form.find('[name="startDate"]').val()).toISOString(),
        endDate: form.find('[name="endDate"]').val() ? new Date(form.find('[name="endDate"]').val()).toISOString() : null,
        sportName: selectedSport,
        maxParticipants: parseInt(form.find('[name="maxParticipants"]').val()) || 0,
        createdBy: JSON.parse(localStorage.getItem('user') || '{}').id || null
    };

    if (!formData.tournamentName) {
        alert('Введіть назву турніру');
        return;
    }

    try {
        $('#submitTournamentBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Створення...');
        await window.tournamentsApi.create(formData);
        alert('Турнір успішно створено!');
        $('#createTournamentModal').modal('hide');
        form[0].reset();
        await loadTournaments();
    } catch (error) {
        console.error('Error creating tournament:', error);
        alert('Не вдалося створити турнір: ' + error.message);
    } finally {
        $('#submitTournamentBtn').prop('disabled', false).html('Створити');
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
    return date.toLocaleDateString('uk-UA');
}

function showNotification(message, type) {
    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}