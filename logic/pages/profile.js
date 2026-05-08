// logic/pages/profile.js
let currentUser = null;

$(document).ready(function() {
    checkAuthAndLoadProfile();
    setupTabs();
    setupEventHandlers();
});

function checkAuthAndLoadProfile() {
    const token = localStorage.getItem('accessToken');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || !user.id) {
        window.location.href = '/pages/login.html';
        return;
    }

    currentUser = user;
    loadProfile();
    updateNavMenu(true);
}

function updateNavMenu(isLoggedIn) {
    if (isLoggedIn && currentUser) {
        const fullName = `${currentUser.surname || ''} ${currentUser.name || ''}`.trim();
        $('#userNameNav').text(fullName || 'Профіль');
        $('#loginMenuItem').hide();
        $('#userMenuItem').show();
    } else {
        $('#userNameNav').text('Профіль');
        $('#loginMenuItem').show();
        $('#userMenuItem').hide();
    }
}

async function loadProfile() {
    try {
        const userData = await window.usersApi.getById(currentUser.id);
        if (userData) {
            currentUser = userData;
            localStorage.setItem('user', JSON.stringify(currentUser));
            displayProfileData();
            loadUserTournaments();
            loadUserStatistics();
        }
    } catch (error) {
        console.error('Помилка завантаження профілю:', error);
        showNotification('Не вдалося завантажити дані профілю', 'error');
    }
}

function displayProfileData() {
    console.log('Displaying profile data:', currentUser);  // Додати логування

    if (!currentUser || !currentUser.id) {
        console.error('No user data available');
        return;
    }

    const fullName = `${currentUser.surname || ''} ${currentUser.name || ''}`.trim();
    $('#profileFullName').text(fullName || 'Користувач');
    $('#profileRole').text(currentUser.role || 'User');
    $('#profileRoleDisplay').val(currentUser.role || 'User');
    $('#profileSurname').val(currentUser.surname || '');
    $('#profileName').val(currentUser.name || '');
    $('#profileAge').val(currentUser.age || '');

    const email = currentUser.contactInfo?.email || currentUser.email || '';
    $('#profileEmail').val(email);

    // Оновлюємо також navbar на сторінці профілю
    $('#userNameNav').text(fullName || 'Профіль');
}

async function loadUserTournaments() {
    try {
        const allTournaments = await window.tournamentsApi.getAll() || [];
        // Фільтруємо тільки ті, які створив поточний користувач
        const myTournaments = allTournaments.filter(t => t.createdBy === currentUser.id);

        const container = $('#myTournamentsList');
        if (myTournaments.length === 0) {
            container.html(`
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-trophy fa-3x mb-3"></i>
                    <p>У вас немає створених турнірів</p>
                    <a href="/index.html" class="btn btn-primary btn-sm">Створити турнір</a>
                </div>
            `);
            return;
        }

        // Відображаємо турніри
        let html = '';
        for (const tournament of myTournaments) {
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
        container.html(html);

        $('.tournament-card').on('click', function() {
            const id = $(this).data('id');
            window.location.href = `/pages/tournament-details.html?id=${id}`;
        });

    } catch (error) {
        console.error('Помилка завантаження турнірів:', error);
    }
}

async function loadUserStatistics() {
    try {
        if (!window.statisticsApi) {
            console.warn('statisticsApi not found');
            return;
        }

        const stats = await window.statisticsApi.getUserStats(currentUser.id) || [];

        let totalMatches = 0, totalWins = 0, totalPoints = 0;
        stats.forEach(stat => {
            totalMatches += stat.matchesPlayed || 0;
            totalWins += stat.wins || 0;
            totalPoints += stat.points || 0;
        });

        $('#statTournamentsCount').text(stats.length || '0');
        $('#statMatchesCount').text(totalMatches || '0');

        if ($('#statWinsCount').length) {
            $('#statWinsCount').text(totalWins || '0');
        }
        if ($('#statPointsCount').length) {
            $('#statPointsCount').text(totalPoints || '0');
        }
    } catch (error) {
        console.error('Помилка завантаження статистики:', error);
    }
}

function setupTabs() {
    $('.list-group-item').click(function(e) {
        e.preventDefault();
        const tab = $(this).data('tab');

        $('.list-group-item').removeClass('active');
        $(this).addClass('active');

        $('.tab-content').hide();
        $(`#tab-${tab}`).show();

        if (tab === 'stats') {
            loadUserStatistics();
        }
        if (tab === 'tournaments') {
            loadUserTournaments();
        }
    });

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && tabParam === 'stats') {
        $(`.list-group-item[data-tab="stats"]`).click();
    }
}

function setupEventHandlers() {
    $('#profileForm').on('submit', async function(e) {
        e.preventDefault();
        await saveProfile();
    });

    $('#changePasswordBtn').click(async function() {
        await changePassword();
    });

    $('#deleteAccountBtn').click(async function() {
        if (confirm('Ви впевнені, що хочете видалити акаунт? Цю дію не можна скасувати.')) {
            await deleteAccount();
        }
    });

    $('#logoutBtn').click(async function(e) {
        e.preventDefault();
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken && window.authApi) {
            try {
                await window.authApi.logout(refreshToken);
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        localStorage.clear();
        window.location.href = '/index.html';
    });

    $('#requestPlayerRoleBtn').on('click', requestPlayerRole);
}
async function saveProfile() {
    const updateData = {
        surname: $('#profileSurname').val(),
        name: $('#profileName').val(),
        age: parseInt($('#profileAge').val()) || 0,
        role: currentUser.role || 'User',
        contactInfo: {
            email: $('#profileEmail').val(),
            phone: currentUser.contactInfo?.phone || '',
            address: currentUser.contactInfo?.address || ''
        }
    };

    console.log('Sending data to update:', updateData);  // для діагностики

    try {
        $('#saveProfileBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Збереження...');

        await window.usersApi.update(currentUser.id, updateData);

        // Оновлюємо локальні дані
        currentUser.surname = updateData.surname;
        currentUser.name = updateData.name;
        currentUser.age = updateData.age;
        if (currentUser.contactInfo) {
            currentUser.contactInfo.email = updateData.contactInfo.email;
        }
        localStorage.setItem('user', JSON.stringify(currentUser));

        displayProfileData();
        updateNavMenu(true);
        showNotification('Профіль успішно оновлено!', 'success');
    } catch (error) {
        console.error('Помилка збереження:', error);
        showNotification('Помилка при збереженні профілю: ' + error.message, 'error');
    } finally {
        $('#saveProfileBtn').prop('disabled', false).html('<i class="fas fa-save me-2"></i>Зберегти зміни');
    }
}

async function changePassword() {
    const newPassword = $('#newPassword').val();
    const confirmPassword = $('#confirmPassword').val();

    if (!newPassword || newPassword.length < 6) {
        showNotification('Пароль повинен містити мінімум 6 символів', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('Паролі не співпадають', 'warning');
        return;
    }

    try {
        showNotification('Функція зміни паролю буде доступна найближчим часом', 'info');
        $('#newPassword, #confirmPassword').val('');
    } catch (error) {
        showNotification('Помилка зміни паролю', 'error');
    }
}

async function deleteAccount() {
    try {
        await window.usersApi.delete(currentUser.id);
        localStorage.clear();
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Помилка видалення:', error);
        showNotification('Помилка видалення акаунту', 'error');
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

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Дата невідома';
    return date.toLocaleDateString('uk-UA');
}

function showNotification(message, type) {
    if (window.notifications) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}
async function requestPlayerRole() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        showNotification('Увійдіть, щоб подати запит', 'warning');
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        // TODO: Додати API ендпоінт для запиту ролі на бекенді
        // await window.roleRequestsApi.create({ userId: currentUser.id, requestedRole: 'Player' });

        showNotification('Запит на роль гравця надіслано адміністратору', 'success');
    } catch (error) {
        console.error('Error sending request:', error);
        showNotification('Помилка надсилання запиту', 'error');
    }
}