//admin.js
const API_BASE = '';
    let currentPage = 1;
    let currentUserSearch = '';

    // Отримання токена
    function getToken() {
    return localStorage.getItem('accessToken');
}

    // Перевірка авторизації
    function checkAuth() {
    const token = getToken();
    if (!token) {
    window.location.href = '/login.html';
    return false;
}

    // Декодуємо токен і перевіряємо роль
    try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.role !== 'Admin') {
    alert('Доступ заборонено. Потрібні права адміністратора.');
    window.location.href = '/index.html';
    return false;
}
    document.getElementById('adminEmail').textContent = payload.email || payload.name || 'Admin';
} catch (e) {
    console.error('Помилка декодування токена', e);
}
    return true;
}

    // API запит
    async function apiRequest(url, options = {}) {
    const token = getToken();
    const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
}
});

    if (response.status === 401) {
    localStorage.removeItem('accessToken');
    window.location.href = '/login.html';
    throw new Error('Неавторизований');
}

    if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Помилка запиту');
}

    return response.json();
}

    // Завантаження статистики
    async function loadStats() {
    try {
    const stats = await apiRequest('/api/Admin/stats');
    document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
    document.getElementById('totalTournaments').textContent = stats.totalTournaments || 0;
    document.getElementById('totalTeams').textContent = stats.totalTeams || 0;
    document.getElementById('totalMatches').textContent = stats.totalMatches || 0;
    document.getElementById('pendingRequests').textContent = stats.pendingRoleRequests || 0;

    const pendingCount = stats.pendingRoleRequests || 0;
    const pendingBadge = document.getElementById('pendingCount');
    if (pendingCount > 0) {
    pendingBadge.textContent = pendingCount;
    pendingBadge.style.display = 'inline-block';
} else {
    pendingBadge.style.display = 'none';
}
} catch (error) {
    console.error('Помилка завантаження статистики:', error);
}
}

    // Завантаження користувачів
    async function loadUsers(page = 1, search = '') {
    try {
    let url = `/api/Admin/users?page=${page}&pageSize=20`;
    if (search) {
    url += `&search=${encodeURIComponent(search)}`;
}
    const data = await apiRequest(url);
    const users = data.users || data;
    const total = data.total || users.length;

    renderUsersTable(users);
    renderPagination(page, Math.ceil(total / 20), 'usersPagination', loadUsers);
} catch (error) {
    console.error('Помилка завантаження користувачів:', error);
    document.getElementById('usersTableBody').innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger py-5">
                        <i class="fas fa-exclamation-triangle"></i> Помилка завантаження
                    </td></tr>
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
                    <td>${user.contactInfo?.email || 'N/A'}</td>
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
    try {
    const requests = await apiRequest('/api/Admin/role-requests?status=Pending');
    renderRoleRequests(requests);
} catch (error) {
    console.error('Помилка завантаження запитів:', error);
    document.getElementById('requestsTableBody').innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger py-5">Помилка завантаження</td></tr>
                `;
}
}

    function renderRoleRequests(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5">Немає активних запитів</td></tr>';
    return;
}

    tbody.innerHTML = requests.map(req => `
                <tr>
                    <td><strong>${req.userName || req.userId}</strong></td>
                    <td>${req.userEmail || 'N/A'}</td>
                    <td><span class="role-badge role-${req.requestedRole.toLowerCase()}">${req.requestedRole}</span></td>
                    <td><span class="badge request-pending">${req.status}</span></td>
                    <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="approveRequest('${req.id}')">
                            <i class="fas fa-check"></i> Підтвердити
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="rejectRequest('${req.id}')">
                            <i class="fas fa-times"></i> Відхилити
                        </button>
                    </td>
                </tr>
            `).join('');
}

    // Завантаження топ гравців
    async function loadPlayersStats() {
    try {
    const players = await apiRequest('/api/Admin/players/stats?limit=20');
    renderPlayersStats(players);
} catch (error) {
    console.error('Помилка завантаження топ гравців:', error);
    document.getElementById('playersStatsBody').innerHTML = `
                    <tr><td colspan="6" class="text-center text-danger py-5">Помилка завантаження</td></tr>
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
    let currentUserId = null;

    function openChangeRoleModal(userId, currentRole) {
    currentUserId = userId;
    document.getElementById('changeRoleUserId').value = userId;
    document.getElementById('newRole').value = currentRole;
    new bootstrap.Modal(document.getElementById('changeRoleModal')).show();
}

    async function confirmChangeRole() {
    const userId = document.getElementById('changeRoleUserId').value;
    const newRole = document.getElementById('newRole').value;

    try {
    await apiRequest(`/api/Admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify(newRole)
});
    alert('Роль успішно змінено');
    bootstrap.Modal.getInstance(document.getElementById('changeRoleModal')).hide();
    loadUsers(currentPage, currentUserSearch);
} catch (error) {
    alert('Помилка: ' + error.message);
}
}

    function openBanModal(userId) {
    currentUserId = userId;
    document.getElementById('banUserId').value = userId;
    document.getElementById('banReason').value = '';
    new bootstrap.Modal(document.getElementById('banUserModal')).show();
}

    async function confirmBanUser() {
    const userId = document.getElementById('banUserId').value;
    const minutes = parseInt(document.getElementById('banMinutes').value);
    const reason = document.getElementById('banReason').value;

    try {
    await apiRequest(`/api/Admin/users/${userId}/ban`, {
    method: 'POST',
    body: JSON.stringify({ minutes, reason })
});
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
    await apiRequest(`/api/Admin/users/${userId}/unban`, { method: 'DELETE' });
    alert('Користувача розблоковано');
    loadUsers(currentPage, currentUserSearch);
} catch (error) {
    alert('Помилка: ' + error.message);
}
}

    // Дії з рольовими запитами
    async function approveRequest(requestId) {
    if (!confirm('Підтвердити цей запит?')) return;

    try {
    await apiRequest(`/api/Admin/role-requests/${requestId}/approve`, { method: 'PUT' });
    alert('Запит підтверджено');
    loadRoleRequests();
    loadStats();
    if (document.querySelector('[data-tab="users"].active')) loadUsers();
} catch (error) {
    alert('Помилка: ' + error.message);
}
}

    async function rejectRequest(requestId) {
    if (!confirm('Відхилити цей запит?')) return;

    try {
    await apiRequest(`/api/Admin/role-requests/${requestId}/reject`, { method: 'DELETE' });
    alert('Запит відхилено');
    loadRoleRequests();
    loadStats();
} catch (error) {
    alert('Помилка: ' + error.message);
}
}

    // Перемикання вкладок
    function switchTab(tabName) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.style.display = 'none');
    document.getElementById(`${tabName}-tab`).style.display = 'block';

    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Завантажуємо дані відповідної вкладки
    switch(tabName) {
    case 'stats':
    loadStats();
    break;
    case 'users':
    currentPage = 1;
    loadUsers();
    break;
    case 'role-requests':
    loadRoleRequests();
    break;
    case 'players-stats':
    loadPlayersStats();
    break;
}
}

    // Вихід
    function logout() {
    localStorage.removeItem('accessToken');
    window.location.href = '/login.html';
}

    // Ініціалізація
    document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    // Обробники меню
    document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', () => {
    switchTab(item.dataset.tab);
});
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

    // Завантажуємо стартову вкладку
    loadStats();
});