// admin.js
let currentPage = 1;
let currentUserSearch = '';

// Використовуємо існуючий BaseApi з config.js
class AdminApi extends BaseApi {
    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const token = localStorage.getItem('accessToken');
        const headers = { ...this.defaultHeaders, ...options.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Перевіряємо чи url вже повний або відносний
        const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

        try {
            const response = await fetch(fullUrl, {
                ...options,
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.status === 401) {
                const newToken = await this.refreshToken();
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(fullUrl, {
                        ...options,
                        headers: headers,
                        signal: controller.signal
                    });
                    return retryResponse.json();
                } else {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('user');
                    window.location.href = '/login.html';
                    throw new Error('Session expired');
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Запит перевищив час очікування');
            }
            throw error;
        }
    }
}

const adminApi = new AdminApi();

// Перевірка авторизації
function checkAuth() {
    const token = localStorage.getItem('accessToken');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    console.log('Admin user:', user);

    if (user.role !== 'Admin' && user.role !== 'admin') {
        alert('Доступ заборонено. Потрібні права адміністратора.');
        window.location.href = '/index.html';
        return false;
    }

    const adminEmailSpan = document.getElementById('adminEmail');
    if (adminEmailSpan) {
        adminEmailSpan.textContent = user.email || user.contactInfo?.email || 'Admin';
    }

    return true;
}

// Завантаження статистики - ВИКОРИСТОВУЄМО ПРАВИЛЬНІ ЕНДПОІНТИ
async function loadStats() {
    try {
        // Використовуємо ендпоінти з API_CONFIG
        const [users, tournaments, teams, matches] = await Promise.all([
            adminApi.get(API_CONFIG.endpoints.users).catch(() => []),
            adminApi.get(API_CONFIG.endpoints.tournaments).catch(() => []),
            adminApi.get(API_CONFIG.endpoints.teams).catch(() => []),
            adminApi.get(API_CONFIG.endpoints.matches).catch(() => [])
        ]);

        const usersCount = Array.isArray(users) ? users.length : (users.total || users.items?.length || 0);
        const tournamentsCount = Array.isArray(tournaments) ? tournaments.length : (tournaments.total || tournaments.items?.length || 0);
        const teamsCount = Array.isArray(teams) ? teams.length : (teams.total || teams.items?.length || 0);
        const matchesCount = Array.isArray(matches) ? matches.length : (matches.total || matches.items?.length || 0);

        document.getElementById('totalUsers').textContent = usersCount;
        document.getElementById('totalTournaments').textContent = tournamentsCount;
        document.getElementById('totalTeams').textContent = teamsCount;
        document.getElementById('totalMatches').textContent = matchesCount;
        document.getElementById('pendingRequests').textContent = '0';

        console.log('Stats loaded:', { usersCount, tournamentsCount, teamsCount, matchesCount });

    } catch (error) {
        console.error('Помилка завантаження статистики:', error);
        const statsContainer = document.querySelector('#stats-tab .stats-grid');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger m-3">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Помилка завантаження статистики: ${error.message}
                    </div>
                </div>
            `;
        }
    }
}

// Завантаження користувачів
async function loadUsers(page = 1, search = '') {
    try {
        let url = `${API_CONFIG.endpoints.users}?page=${page}&limit=20`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        const data = await adminApi.get(url);

        // Обробляємо різні формати відповіді
        let users = [];
        let total = 0;

        if (Array.isArray(data)) {
            users = data;
            total = data.length;
        } else if (data.users) {
            users = data.users;
            total = data.total || users.length;
        } else if (data.items) {
            users = data.items;
            total = data.total || users.length;
        } else {
            users = [];
        }

        renderUsersTable(users);
        renderPagination(page, Math.ceil(total / 20), 'usersPagination', loadUsers);
    } catch (error) {
        console.error('Помилка завантаження користувачів:', error);
        document.getElementById('usersTableBody').innerHTML = `
            <tr><td colspan="6" class="text-center text-danger py-5">
                <i class="fas fa-exclamation-triangle"></i> Помилка: ${error.message}
            </td>
        </tr>
        `;
    }
}

// Відображення таблиці користувачів
function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">Користувачів не знайдено</td></tr>';
        return;
    }

    tbody.innerHTML = users.map((user, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="user-avatar-sm">${(user.name?.[0] || 'U')}${(user.surname?.[0] || '')}</div>
                    <div>
                        <strong>${user.name || 'N/A'} ${user.surname || ''}</strong>
                    </div>
                </div>
            </td>
            <td>${user.contactInfo?.email || user.email || 'N/A'}</td>
            <td><span class="role-badge role-${(user.role || 'User').toLowerCase()}">${user.role || 'User'}</span></td>
            <td>
                <span class="ban-status ${user.isBanned ? 'banned' : 'active-user'}">
                    ${user.isBanned ? 'Заблоковано' : 'Активний'}
                    ${user.bannedUntil ? `<br><small>до ${new Date(user.bannedUntil).toLocaleString()}</small>` : ''}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openChangeRoleModal('${user.id}', '${user.role}')" title="Змінити роль">
                    <i class="fas fa-user-tag"></i>
                </button>
                ${!user.isBanned ?
        `<button class="btn btn-sm btn-danger" onclick="openBanModal('${user.id}')" title="Заблокувати">
                        <i class="fas fa-ban"></i>
                    </button>` :
        `<button class="btn btn-sm btn-success" onclick="unbanUser('${user.id}')" title="Розблокувати">
                        <i class="fas fa-check"></i>
                    </button>`
    }
            </td>
        </tr>
    `).join('');
}

// Пагінація
function renderPagination(currentPage, totalPages, elementId, loadFunction) {
    const container = document.getElementById(elementId);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }

    let html = '';
    if (currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">«</a></li>`;
    }

    for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
        html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                 </li>`;
    }

    if (currentPage < totalPages) {
        html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">»</a></li>`;
    }

    container.innerHTML = html;
    container.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (page) loadFunction(page, currentUserSearch);
        });
    });
}

// Завантаження запитів на роль
async function loadRoleRequests() {
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = `
        <tr><td colspan="6" class="text-center py-5 text-muted">
            <i class="fas fa-info-circle me-2"></i>Функція в розробці
        </td></tr>
    `;
}

// Завантаження топ гравців
async function loadPlayersStats() {
    try {
        const users = await adminApi.get(API_CONFIG.endpoints.users);
        let players = [];

        if (Array.isArray(users)) {
            players = users.filter(u => u.role === 'Player');
        } else if (users.users) {
            players = users.users.filter(u => u.role === 'Player');
        } else if (users.items) {
            players = users.items.filter(u => u.role === 'Player');
        }

        const stats = players.map((player, index) => ({
            id: player.id,
            name: player.name,
            surname: player.surname,
            wins: 0,
            losses: 0,
            points: 0,
            matchesPlayed: 0
        }));

        renderPlayersStats(stats);
    } catch (error) {
        console.error('Помилка завантаження топ гравців:', error);
        document.getElementById('playersStatsBody').innerHTML = `
            <tr><td colspan="6" class="text-center text-danger py-5">Помилка: ${error.message}</td></tr>
        `;
    }
}

function renderPlayersStats(players) {
    const tbody = document.getElementById('playersStatsBody');
    if (!players || players.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">Немає даних про гравців</td></tr>';
        return;
    }

    tbody.innerHTML = players.map((player, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <div class="user-avatar-sm">${(player.name?.[0] || 'P')}</div>
                    <strong>${player.name || 'N/A'} ${player.surname || ''}</strong>
                </div>
            </td>
            <td>${player.wins || 0}</td>
            <td>${player.losses || 0}</td>
            <td><span class="fw-bold text-warning">${player.points || 0}</span></td>
            <td>${player.matchesPlayed || 0}</td>
        </tr>
    `).join('');
}

// Дії з користувачами
function openChangeRoleModal(userId, currentRole) {
    document.getElementById('changeRoleUserId').value = userId;
    document.getElementById('newRole').value = currentRole;
    new bootstrap.Modal(document.getElementById('changeRoleModal')).show();
}

async function confirmChangeRole() {
    const userId = document.getElementById('changeRoleUserId').value;
    const newRole = document.getElementById('newRole').value;

    try {
        await adminApi.put(`${API_CONFIG.endpoints.users}/${userId}`, { role: newRole });
        alert('Роль успішно змінено');
        bootstrap.Modal.getInstance(document.getElementById('changeRoleModal')).hide();
        loadUsers(currentPage, currentUserSearch);
    } catch (error) {
        alert('Помилка: ' + error.message);
    }
}

function openBanModal(userId) {
    document.getElementById('banUserId').value = userId;
    document.getElementById('banReason').value = '';
    new bootstrap.Modal(document.getElementById('banUserModal')).show();
}

async function confirmBanUser() {
    const userId = document.getElementById('banUserId').value;
    const minutes = parseInt(document.getElementById('banMinutes').value);
    const reason = document.getElementById('banReason').value;

    try {
        await adminApi.post(`${API_CONFIG.endpoints.users}/${userId}/ban`, { minutes, reason });
        alert('Користувача заблоковано');
        bootstrap.Modal.getInstance(document.getElementById('banUserModal')).hide();
        loadUsers(currentPage, currentUserSearch);
    } catch (error) {
        alert('Помилка: ' + error.message);
    }
}

async function unbanUser(userId) {
    if (!confirm('Розблокувати цього користувача?')) return;

    try {
        await adminApi.delete(`${API_CONFIG.endpoints.users}/${userId}/unban`);
        alert('Користувача розблоковано');
        loadUsers(currentPage, currentUserSearch);
    } catch (error) {
        alert('Помилка: ' + error.message);
    }
}

// Заглушки
async function approveRequest(requestId) {
    alert('Функція в розробці');
}

async function rejectRequest(requestId) {
    alert('Функція в розробці');
}

// Перемикання вкладок
function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) activeTab.style.display = 'block';

    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNav) activeNav.classList.add('active');

    switch(tabName) {
        case 'stats': loadStats(); break;
        case 'users': currentPage = 1; loadUsers(); break;
        case 'role-requests': loadRoleRequests(); break;
        case 'players-stats': loadPlayersStats(); break;
    }
}

// Вихід
function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');

    // Перенаправляємо на головну сторінку (index.html)
    window.location.href = '/index.html';
}

// Ініціалізація
document.addEventListener('DOMContentLoaded', () => {
    console.log('Admin page loading...');
    if (!checkAuth()) return;

    // Обробники меню
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });

    // Пошук користувачів
    const searchInput = document.getElementById('userSearch');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                currentUserSearch = e.target.value;
                currentPage = 1;
                loadUsers(currentPage, currentUserSearch);
            }, 500);
        });
    }

    // Кнопка виходу
    const logoutBtn = document.querySelector('.btn-danger');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            logout();
        };
    }

    loadStats();
});