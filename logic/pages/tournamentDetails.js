// logic/pages/tournamentDetails.js
let currentTournament = null;

function getTournamentId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadTournamentDetails() {
    const tournamentId = getTournamentId();
    if (!tournamentId) {
        document.getElementById('loadingSpinner').innerHTML = '<div class="alert alert-danger">ID турніру не вказано</div>';
        return;
    }

    try {
        currentTournament = await window.tournamentsApi.getById(tournamentId);
        displayTournamentInfo(currentTournament);
        displayParticipants(currentTournament.tournamentParticipants || []);
        checkIfSaved();

        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('tournamentContent').style.display = 'block';
    } catch (error) {
        console.error('Error loading tournament:', error);
        document.getElementById('loadingSpinner').innerHTML = `<div class="alert alert-danger">Помилка завантаження: ${error.message}</div>`;
    }
}
function displayTournamentInfo(tournament) {
    document.getElementById('tournamentName').textContent = tournament.tournamentName || 'Без назви';
    document.getElementById('tournamentDescription').textContent = tournament.tournamentDescription || 'Опис відсутній';
    document.getElementById('tournamentType').textContent = tournament.tournamentType || 'Невідомо';
    document.getElementById('tournamentFormat').textContent = tournament.format || 'Невідомо';
    document.getElementById('prizeFund').textContent = (tournament.prizeFund || 0).toLocaleString();
    document.getElementById('startDate').textContent = new Date(tournament.startDate).toLocaleDateString('uk-UA');

    const maxParticipants = tournament.maxParticipants || 0;
    const currentParticipants = tournament.tournamentParticipants?.length || 0;

    let participantsInfo = '';
    if (maxParticipants > 0) {
        participantsInfo = `${currentParticipants} / ${maxParticipants} учасників`;
        if (currentParticipants >= maxParticipants) {
            participantsInfo += ' ❌ Реєстрацію закрито';
        }
    } else {
        participantsInfo = `${currentParticipants} учасників (без обмежень)`;
    }

    // Додати на сторінку елемент з інформацією
    if ($('#participantsInfo').length === 0) {
        $('#participantsList').before(`<div class="alert alert-info mb-3" id="participantsInfo"><i class="fas fa-users me-2"></i>${participantsInfo}</div>`);
    } else {
        $('#participantsInfo').html(`<i class="fas fa-users me-2"></i>${participantsInfo}`);
    }
    updateRegistrationButton(tournament);
}

function updateRegistrationButton(tournament) {
    const registerBtn = $('#registerForTournament');
    const token = localStorage.getItem('accessToken');

    // Якщо кнопки немає на сторінці – виходимо
    if (!registerBtn.length) return;

    const maxParticipants = tournament.maxParticipants || 0;
    const currentParticipants = tournament.tournamentParticipants?.length || 0;
    const startDate = new Date(tournament.startDate);
    const now = new Date();

    let canRegister = true;
    let reason = '';

    if (!token) {
        canRegister = false;
        reason = 'Увійдіть, щоб зареєструватися';
    } else if (startDate < now) {
        canRegister = false;
        reason = 'Турнір вже розпочався, реєстрацію закрито';
    } else if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
        canRegister = false;
        reason = `Досягнуто ліміт учасників (${maxParticipants})`;
    }

    if (canRegister) {
        registerBtn.show();
        registerBtn.prop('disabled', false);
        registerBtn.html('<i class="fas fa-user-plus me-1"></i> Зареєструватися');
    } else {
        registerBtn.show();
        registerBtn.prop('disabled', true);
        registerBtn.html(`<i class="fas fa-ban me-1"></i> ${reason}`);
    }
}

async function registerForTournament() {
    const tournamentId = getTournamentId();
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showNotification('Увійдіть, щоб зареєструватися', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    // Отримуємо актуальну інформацію про турнір
    const tournament = currentTournament;
    const startDate = new Date(tournament.startDate);
    const now = new Date();

    // Додаткова перевірка на фронті
    if (startDate < now) {
        showNotification('Турнір вже розпочався, реєстрацію закрито', 'error');
        updateRegistrationButton(tournament);
        return;
    }

    if (tournament.maxParticipants > 0 && tournament.tournamentParticipants?.length >= tournament.maxParticipants) {
        showNotification(`Досягнуто ліміт учасників (${tournament.maxParticipants})`, 'error');
        updateRegistrationButton(tournament);
        return;
    }

    let body = {};
    if (tournament.format === 'Command') {
        const teamId = prompt('Введіть ID вашої команди:');
        if (!teamId) {
            showNotification('ID команди обов\'язковий', 'warning');
            return;
        }
        body = { teamId: teamId };
    } else {
        body = { teamId: null };
    }

    try {
        $('#registerForTournament').prop('disabled', true).text('⏳ Реєстрація...');
        const response = await fetch(`/api/Tournaments/${tournamentId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            showNotification('Ви успішно зареєструвалися на турнір!', 'success');
            // Перезавантажуємо сторінку, щоб оновити список учасників
            setTimeout(() => location.reload(), 1500);
        } else {
            const error = await response.json();
            showNotification(error.message || 'Помилка реєстрації', 'error');
            updateRegistrationButton(currentTournament);
        }
    } catch (error) {
        console.error('Error registering for tournament:', error);
        showNotification('Помилка реєстрації', 'error');
        updateRegistrationButton(currentTournament);
    } finally {
        $('#registerForTournament').prop('disabled', false);
    }
}
function displayParticipants(participants) {
    const container = document.getElementById('participantsList');
    if (!participants || participants.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-4"><i class="fas fa-users fa-2x mb-2"></i><p>Учасників поки немає</p></div>';
        return;
    }

    let html = '';
    for (const team of participants) {
        html += `
            <div class="col-md-4 mb-3">
                <div class="card team-card" data-id="${team.id}" style="cursor: pointer;">
                    <div class="card-body">
                        <h6 class="card-title">${escapeHtml(team.teamName || 'Без назви')}</h6>
                        <p class="card-text small text-muted">${escapeHtml(team.teamDescription || '')}</p>
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function checkIfSaved() {
    const tournamentId = getTournamentId();
    const saveBtn = document.getElementById('saveTournamentBtn');
    if (!saveBtn || !tournamentId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
        saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Увійдіть, щоб зберегти';
        saveBtn.disabled = true;
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTournaments?.includes(tournamentId) || false;

        if (isSaved) {
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Збережено';
            saveBtn.classList.add('btn-warning');
            saveBtn.classList.remove('btn-outline-warning');
        } else {
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Зберегти турнір';
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-outline-warning');
        }
        saveBtn.disabled = false;
    } catch (error) {
        console.error('Error checking saved status:', error);
    }
}

async function toggleSaveTournament() {
    const tournamentId = getTournamentId();
    const saveBtn = document.getElementById('saveTournamentBtn');
    const token = localStorage.getItem('accessToken');

    if (!token) {
        showNotification('Увійдіть, щоб зберігати турніри', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const savedItems = await window.savedItemsApi.getUserSavedItems();
        const isSaved = savedItems?.savedTournaments?.includes(tournamentId) || false;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        await window.savedItemsApi.toggleSaveTournament(tournamentId, isSaved);

        if (isSaved) {
            showNotification('Турнір видалено зі збережених', 'info');
            saveBtn.innerHTML = '<i class="far fa-bookmark"></i> Зберегти турнір';
            saveBtn.classList.remove('btn-warning');
            saveBtn.classList.add('btn-outline-warning');
        } else {
            showNotification('Турнір збережено!', 'success');
            saveBtn.innerHTML = '<i class="fas fa-bookmark"></i> Збережено';
            saveBtn.classList.remove('btn-outline-warning');
            saveBtn.classList.add('btn-warning');
        }
    } catch (error) {
        console.error('Error toggling saved tournament:', error);
        showNotification('Помилка: ' + error.message, 'error');
    } finally {
        saveBtn.disabled = false;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function showNotification(message, type) {
    if (window.notifications && window.notifications.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}
$(document).ready(function() {
    loadTournamentDetails();
    $('#registerForTournament').on('click', registerForTournament);
    $('#saveTournamentBtn').on('click', toggleSaveTournament);
});