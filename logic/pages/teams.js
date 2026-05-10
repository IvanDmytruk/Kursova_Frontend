// logic/pages/teams.js
let currentSport = localStorage.getItem('selectedSport') || 'all';
let allTeams = [];

$(document).ready(function() {
    updateAuthUI();
    setupSportSelector();
    loadTeams();
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
        $('#createTeamBtn').show();
    } else {
        $('#guestButtons').show();
        $('#userMenu').hide();
        $('#createTeamBtn').hide();
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
            loadTeams();
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

async function loadTeams() {
    const container = $('#teamsList');
    container.html('<div class="col-12 text-center text-muted py-5"><i class="fas fa-spinner fa-spin fa-3x mb-3"></i><p>Завантаження команд...</p></div>');

    try {
        let teams;
        if (currentSport === 'all') {
            teams = await window.teamsApi.getAll();
        } else {
            teams = await window.teamsApi.getBySport(currentSport);
        }
        allTeams = teams || [];
        displayTeams(allTeams);
    } catch (error) {
        console.error('Error loading teams:', error);
        container.html('<div class="col-12 text-center text-danger py-5"><i class="fas fa-exclamation-triangle fa-3x mb-3"></i><p>Помилка завантаження команд</p></div>');
    }
}

function displayTeams(teams) {
    const container = $('#teamsList');

    if (!teams || teams.length === 0) {
        container.html('<div class="col-12 text-center text-muted py-5"><i class="fas fa-users fa-3x mb-3"></i><p>Команд не знайдено</p></div>');
        return;
    }

    let html = '';
    for (const team of teams) {
        html += `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card team-card h-100" data-id="${team.id}" style="cursor: pointer;">
                    <div class="card-body text-center">
                        <div class="team-logo rounded-circle bg-primary d-flex align-items-center justify-content-center mx-auto mb-3" style="width: 80px; height: 80px;">
                            <i class="fas fa-users fa-3x text-white"></i>
                        </div>
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">${escapeHtml(team.teamName || 'Без назви')}</h5>
                            <button class="btn btn-sm btn-outline-warning save-team-btn" data-id="${team.id}">
                                <i class="far fa-bookmark"></i>
                            </button>
                        </div>
                        <p class="card-text small text-muted">${escapeHtml((team.teamDescription || '').substring(0, 60))}</p>
                        <div class="d-flex justify-content-between mt-2">
                            <span class="badge bg-secondary">${team.sportName || 'Спорт'}</span>
                            <small class="text-warning"><i class="fas fa-star me-1"></i>${team.popularityScore || 0}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    container.html(html);

    $('.team-card').on('click', function(e) {
        if ($(e.target).closest('.save-team-btn').length) return;
        const id = $(this).data('id');
        window.location.href = `/pages/team-details.html?id=${id}`;
    });

    $('.save-team-btn').on('click', async function(e) {
        e.stopPropagation();
        const id = $(this).data('id');
        await toggleSaveTeam(id, $(this));
    });
}

async function toggleSaveTeam(id, btn) {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        showNotification('Увійдіть, щоб зберігати команди', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTeams?.includes(id) || false;

        if (isSaved) {
            await window.savedItemsApi.removeSavedTeam(id);
            btn.html('<i class="far fa-bookmark"></i>');
            showNotification('Команду видалено зі збережених', 'info');
        } else {
            await window.savedItemsApi.saveTeam(id);
            btn.html('<i class="fas fa-bookmark"></i>');
            showNotification('Команду збережено!', 'success');
        }
    } catch (error) {
        console.error('Error toggling saved team:', error);
        showNotification('Помилка', 'error');
    }
}

function bindEvents() {
    $('#createTeamBtn').click(() => {
        $('#createTeamModal').modal('show');
    });

    $('#submitTeamBtn').click(async () => {
        await createTeam();
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

async function createTeam() {
    const form = $('#createTeamForm');
    let selectedSport = currentSport === 'all' ? $('#teamSportSelect').val() : currentSport;

    const formData = {
        teamName: form.find('[name="teamName"]').val(),
        teamDescription: form.find('[name="teamDescription"]').val(),
        sportName: selectedSport
    };

    if (!formData.teamName) {
        alert('Введіть назву команди');
        return;
    }

    try {
        $('#submitTeamBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Створення...');
        await window.teamsApi.create(formData);
        alert('Команду успішно створено!');
        $('#createTeamModal').modal('hide');
        form[0].reset();
        await loadTeams();
    } catch (error) {
        console.error('Error creating team:', error);
        alert('Не вдалося створити команду: ' + error.message);
    } finally {
        $('#submitTeamBtn').prop('disabled', false).html('Створити');
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

function showNotification(message, type) {
    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}