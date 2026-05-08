// logic/pages/teams.js
let currentUser = null;

$(document).ready(function() {
    checkAuth();
    loadTeams();
    setupEventHandlers();
});

function checkAuth() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (token && user.id) {
        currentUser = user;
        $('#createTeamBtn').show();
    }
}

async function loadTeams() {
    try {
        const teams = await window.teamsApi.getAll();
        displayTeams(teams);
    } catch (error) {
        console.error('Error loading teams:', error);
        $('#teamsList').html('<div class="col-12 text-center text-danger">Помилка завантаження команд</div>');
    }
}

function displayTeams(teams) {
    const container = $('#teamsList');

    if (!teams || teams.length === 0) {
        container.html(`
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-users fa-3x mb-3"></i>
                <p>Команд поки немає</p>
                <button class="btn btn-primary" id="createFirstTeamBtn">Створити першу команду</button>
            </div>
        `);
        $('#createFirstTeamBtn').on('click', () => $('#createTeamModal').modal('show'));
        return;
    }

    let html = '';
    for (const team of teams) {
        html += `
            <div class="col-md-4 col-lg-3">
                <div class="card team-card h-100" data-id="${team.id}" style="cursor: pointer;">
                    <div class="card-body text-center">
                        <div class="team-logo mx-auto mb-3 bg-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 80px; height: 80px;">
                            <i class="fas fa-users fa-3x text-white"></i>
                        </div>
                        <h5 class="card-title">${escapeHtml(team.teamName)}</h5>
                        <p class="card-text small text-muted">${escapeHtml((team.teamDescription || '').substring(0, 60))}</p>
                        <span class="badge bg-secondary">${team.sportName || 'Спорт'}</span>
                    </div>
                </div>
            </div>
        `;
    }
    container.html(html);

    $('.team-card').on('click', function() {
        const id = $(this).data('id');
        window.location.href = `team-details.html?id=${id}`;
    });
}

function setupEventHandlers() {
    $('#createTeamBtn').click(() => {
        $('#createTeamModal').modal('show');
    });

    $('#submitTeamBtn').click(async () => {
        await createTeam();
    });
}

async function createTeam() {
    const form = $('#createTeamForm');
    const formData = {
        teamName: form.find('[name="teamName"]').val(),
        teamDescription: form.find('[name="teamDescription"]').val(),
        sportName: form.find('[name="sportName"]').val()
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