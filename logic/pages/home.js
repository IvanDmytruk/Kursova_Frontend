// logic/pages/home.js
let currentSport = localStorage.getItem('selectedSport') || 'all';
let homeState = {
    matches: [],
    tournaments: [],
    teamsMap: {}
};
let authApi = window.authApi;

window.addEventListener('pageshow', function(event) {
    console.log('Page shown from cache, updating auth...');
    updateAuthUI();
});

document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('Page became visible, updating auth...');
        updateAuthUI();
    }
});

window.addEventListener('storage', function(event) {
    if (event.key === 'accessToken' || event.key === 'user') {
        console.log('Storage changed, updating auth UI');
        updateAuthUI();
    }
});

$(document).ready(function() {
    console.log('Home page initialized');
    console.log('Current sport from localStorage:', currentSport);

    updateAuthUI();
    updateSportButtonText(currentSport);
    setupSportSelector();
    loadSystemInfo();
    loadUpcomingMatches();
    loadActiveTournaments();
    bindHomeEvents();
    if (window.SearchBar && $('#search-container').length) {
        new SearchBar('search-container');
        console.log('SearchBar initialized');
    }
});

//Перевірка прав адміністратора та показ кнопки
function checkAndShowAdminButton() {
    const adminBtn = document.getElementById('adminPanelBtn');

    if (!adminBtn) {
        console.log('Admin button element not found in DOM');
        return;
    }

    // БЕРЕМО РОЛЬ З localStorage.user
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('accessToken');

    console.log('User from storage in checkAndShowAdminButton:', user);
    console.log('User role:', user.role);

    if (token && (user.role === 'Admin' || user.role === 'admin')) {
        adminBtn.style.display = 'block';
        console.log('✅ Admin button shown - user has Admin role');
    } else {
        adminBtn.style.display = 'none';
        console.log('❌ Admin button hidden - user role:', user.role);
    }
}

function updateAuthUI() {
    const token = localStorage.getItem('accessToken');
    let user = JSON.parse(localStorage.getItem('user') || '{}');

    console.log('updateAuthUI - token exists:', !!token);
    console.log('updateAuthUI - user:', user);

    if (token && (user.id || user.email)) {
        // АВТОРИЗОВАНИЙ
        console.log('✅ User is logged in');

        // Меню в навігації
        $('#guestButtons').hide();
        $('#userMenu').show();
        $('#userNameNav').text(`${user.surname || ''} ${user.name || ''}`.trim() || 'Профіль');

        // Бічна панель
        $('#userName').text(`${user.surname || ''} ${user.name || ''}`.trim() || 'Користувач');
        $('#userEmail').text(user.email || user.contactInfo?.email || 'user@example.com');

        // Кнопки
        $('#createTournamentBtn').show();
        $('.system-info').show();

        // ПЕРЕВІРКА НА АДМІНА - показуємо кнопку адмін-панелі
        checkAndShowAdminButton();

    } else {
        // НЕАВТОРИЗОВАНИЙ
        console.log('❌ User is NOT logged in');

        // Меню в навігації
        $('#guestButtons').show();
        $('#userMenu').hide();

        // Бічна панель
        $('#userName').text('Гість');
        $('#userEmail').text('guest@example.com');

        // Кнопки
        $('#createTournamentBtn').hide();
        $('.system-info').hide();

        // ХОВАЄМО КНОПКУ АДМІН-ПАНЕЛІ
        const adminBtn = document.getElementById('adminPanelBtn');
        if (adminBtn) adminBtn.style.display = 'none';
    }
}

// Обробник виходу
$(document).on('click', '#logoutBtn', async function(e) {
    e.preventDefault();
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken && window.authApi) {
        try {
            await window.authApi.logout(refreshToken);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('refreshTokenExpiry');
    localStorage.removeItem('user');
    localStorage.removeItem('currentUser');
    updateAuthUI();
    location.reload();
});

function setupSportSelector() {
    console.log('Setting up sport selector...');

    const sportLinks = document.querySelectorAll('#sportDropdownMenu a[data-sport]');
    console.log('Found', sportLinks.length, 'sport links');

    if (sportLinks.length === 0) {
        console.error('No sport links found! Check if #sportDropdownMenu exists.');
        return;
    }

    sportLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const sport = this.getAttribute('data-sport');
            console.log('🔵 SPORT SELECTED:', sport);

            currentSport = sport;
            localStorage.setItem('selectedSport', sport);
            updateSportButtonText(sport);
            loadUpcomingMatches();
            loadActiveTournaments();
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

function getSportEndpoint(sport) {
    if (sport === 'all') return null;
    const sportEndpointMap = {
        'Football': 'football',
        'Basketball': 'basketball',
        'Volleyball': 'volleyball',
        'Handball': 'handball',
        'Tennis': 'tennis',
        'Boxing': 'boxing',
        'Judo': 'judo',
        'Karate': 'karate',
        'Chess': 'chess',
        'Checkers': 'checkers',
        'Contr_Strike_2': 'cs2',
        'Dota_2': 'dota2',
        'Mobile_Legends_Bang_Bang': 'mlbb',
        'Hearts_of_Iron_4': 'hoi4',
        'Civilization_6': 'civ6'
    };
    return sportEndpointMap[sport] || sport.toLowerCase();
}

async function loadSystemInfo() {
    try {
        const tournaments = await window.tournamentsApi?.getAll() || [];
        $('#activeTournaments').text(tournaments.length || 0);
        $('#lastUpdate').text(new Date().toLocaleTimeString('uk-UA'));
    } catch (error) {
        console.error('Помилка завантаження системної інформації:', error);
        $('#activeTournaments').text('0');
        $('#lastUpdate').text(new Date().toLocaleTimeString('uk-UA'));
    }
    $('#totalTeams').text('0');
}

async function loadUpcomingMatches() {
    console.log('loadUpcomingMatches called, currentSport:', currentSport);

    try {
        if (!window.matchesApi) {
            console.error('matchesApi not found');
            return;
        }

        let matches;
        if (currentSport === 'all') {
            console.log('Fetching all matches (no sport filter)');
            matches = await window.matchesApi.getUpcoming();
        } else {
            console.log(`Fetching matches for sport: ${currentSport}`);
            matches = await window.matchesApi.getUpcomingBySport(currentSport);
        }

        console.log(`Received ${matches?.length || 0} matches`);
        const container = $('#upcomingMatchesList');

        if (!matches || matches.length === 0) {
            container.html(`
                <div class="col-12 text-center text-muted py-4">
                    <i class="fas fa-calendar-day fa-2x mb-2"></i>
                    <p>Найближчим часом матчів немає</p>
                </div>
            `);
            return;
        }

        let matchesHtml = '';
        for (const match of matches.slice(0, 3)) {
            let homeTeamName = 'Невідома команда';
            let awayTeamName = 'Невідома команда';

            if (match.homeTeam?.teamName) {
                homeTeamName = match.homeTeam.teamName;
            } else if (match.homeTeamId) {
                try {
                    const homeTeam = await window.teamsApi.getById(match.homeTeamId);
                    homeTeamName = homeTeam?.teamName || `Команда ${match.homeTeamId.substring(0, 6)}`;
                } catch (e) {
                    homeTeamName = `Команда ${match.homeTeamId.substring(0, 6)}`;
                }
            }

            if (match.awayTeam?.teamName) {
                awayTeamName = match.awayTeam.teamName;
            } else if (match.awayTeamId) {
                try {
                    const awayTeam = await window.teamsApi.getById(match.awayTeamId);
                    awayTeamName = awayTeam?.teamName || `Команда ${match.awayTeamId.substring(0, 6)}`;
                } catch (e) {
                    awayTeamName = `Команда ${match.awayTeamId.substring(0, 6)}`;
                }
            }

            matchesHtml += `
                <div class="col-md-4 mb-3">
                    <div class="card match-card h-100" data-match-id="${match.id}" style="cursor: pointer;">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge ${getMatchStatusClass(match.status)}">
                                    ${getMatchStatusText(match.status)}
                                </span>
                                <small class="text-muted">${formatMatchTime(match.startTime)}</small>
                            </div>
                            <div class="text-center">
                                <div class="fw-bold fs-5">${escapeHtml(homeTeamName)}</div>
                                <div class="my-2 text-muted">VS</div>
                                <div class="fw-bold fs-5">${escapeHtml(awayTeamName)}</div>
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-ticket-alt me-1"></i>${match.ticketCost || 0} грн
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        container.html(matchesHtml);
        attachMatchCardClickHandlers();

    } catch (error) {
        console.error('Error loading matches:', error);
        $('#upcomingMatchesList').html(`
            <div class="col-12 text-center text-danger py-4">
                <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                <p>Помилка завантаження матчів</p>
            </div>
        `);
    }
}

async function loadActiveTournaments() {
    console.log('loadActiveTournaments called, currentSport:', currentSport);

    try {
        let tournaments;
        if (currentSport === 'all') {
            tournaments = await window.tournamentsApi.getActive();
        } else {
            tournaments = await window.tournamentsApi.getActiveBySport(currentSport);
        }

        homeState.tournaments = tournaments || [];
        displayActiveTournaments(homeState.tournaments);
    } catch (error) {
        console.error('Помилка завантаження турнірів:', error);
    }
}

function displayActiveTournaments(tournaments) {
    const container = $('#activeTournamentsList');

    if (!tournaments || tournaments.length === 0) {
        container.html(`
            <div class="col-12 text-center text-muted py-4">
                <i class="fas fa-trophy fa-3x mb-2"></i>
                <p>Активних турнірів немає</p>
            </div>
        `);
        return;
    }

    const limitedTournaments = tournaments.slice(0, 3);
    const tournamentsHtml = limitedTournaments.map(t => renderTournamentCard(t)).join('');
    container.html(tournamentsHtml);

    $('.tournament-card').off('click').on('click', function() {
        const id = $(this).data('id');
        if (id) window.location.href = `/pages/tournament-details.html?id=${id}`;
    });
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

function renderTournamentCard(tournament) {
    return `
        <div class="col-md-6 col-lg-4 mb-3">
            <div class="tournament-card" data-id="${tournament.id}" style="cursor: pointer;">
                <div class="card-body p-3">
                    <h6 class="card-title mb-2">${escapeHtml(tournament.tournamentName || 'Без назви')}</h6>
                    <p class="card-text small text-muted mb-2">${escapeHtml((tournament.tournamentDescription || '').substring(0, 60))}${(tournament.tournamentDescription || '').length > 60 ? '...' : ''}</p>
                    <div class="tournament-type mb-2">${escapeHtml(tournament.tournamentType || 'Турнір')}</div>
                    <div class="tournament-dates d-flex justify-content-between">
                        <span><i class="far fa-calendar-alt me-1"></i>${formatDate(new Date(tournament.startDate))}</span>
                        <span><i class="fas fa-trophy me-1"></i>${(tournament.prizeFund || 0).toLocaleString()} грн</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function formatDate(date) {
    if (!date || isNaN(date.getTime())) return 'Дата невідома';
    return date.toLocaleDateString('uk-UA');
}

async function createTournament() {
    const form = $('#createTournamentForm');

    let selectedSport = currentSport;

    if (selectedSport === 'all') {
        const sport = prompt('Введіть вид спорту для турніру (Football, Basketball, Boxing, Chess, etc.):');
        if (!sport) {
            alert('Виберіть вид спорту');
            return;
        }
        selectedSport = sport;
    }

    // Маппінг українських назв на англійські
    const sportMapping = {
        'Футбол': 'Football', 'Баскетбол': 'Basketball', 'Волейбол': 'Volleyball',
        'Гандбол': 'Handball', 'Теніс': 'Tennis', 'Бокс': 'Boxing',
        'Дзюдо': 'Judo', 'Карате': 'Karate', 'Шахи': 'Chess', 'Шашки': 'Checkers'
    };
    if (sportMapping[selectedSport]) selectedSport = sportMapping[selectedSport];

    // Конвертація дати в ISO формат
    const startDateRaw = form.find('[name="startDate"]').val();
    const endDateRaw = form.find('[name="endDate"]').val();

    if (!startDateRaw) {
        alert('Введіть дату початку турніру');
        return;
    }

    const startDate = new Date(startDateRaw).toISOString();
    const endDate = endDateRaw ? new Date(endDateRaw).toISOString() : null;

    // Отримуємо ID користувача з localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const formData = {
        tournamentName: form.find('[name="tournamentName"]').val(),
        tournamentDescription: form.find('[name="tournamentDescription"]').val(),
        tournamentType: form.find('[name="tournamentType"]').val(),
        format: form.find('[name="format"]').val(),
        prizeFund: parseInt(form.find('[name="prizeFund"]').val()) || 0,
        startDate: startDate,
        endDate: endDate,
        sportName: selectedSport,
        maxParticipants: parseInt(form.find('[name="maxParticipants"]').val()) || 0,
        createdBy: user.id || null
    };

    console.log('Form data:', formData);

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
        await loadActiveTournaments();
    } catch (error) {
        console.error('Помилка створення турніру:', error);
        alert('Не вдалося створити турнір: ' + error.message);
    } finally {
        $('#submitTournamentBtn').prop('disabled', false).html('Створити');
    }
}

async function checkNotifications() {
    try {
        const soonMatches = await window.matchesApi.getStartingSoon(24);
        const count = soonMatches?.length || 0;
        $('#notificationsCount').text(count);
    } catch (error) {
        console.error('Помилка завантаження сповіщень:', error);
    }
}

function attachMatchCardClickHandlers() {
    document.querySelectorAll('.match-card').forEach(card => {
        if (!card.hasAttribute('data-listener')) {
            card.setAttribute('data-listener', 'true');
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                const matchId = card.dataset.matchId;
                if (matchId) {
                    console.log('Navigating to match:', matchId);
                    window.location.href = `/pages/match-details.html?matchId=${matchId}`;
                }
            });
        }
    });
}

function getMatchStatusClass(status) {
    const classes = {
        'upcoming': 'bg-secondary',
        'live': 'bg-danger',
        'finished': 'bg-success',
        'postponed': 'bg-warning'
    };
    return classes[status] || 'bg-secondary';
}

function getMatchStatusText(status) {
    const texts = {
        'upcoming': 'Заплановано',
        'live': 'LIVE',
        'finished': 'Завершено',
        'postponed': 'Відкладено'
    };
    return texts[status] || status;
}

function formatMatchTime(dateStr) {
    if (!dateStr) return 'Дата невідома';
    const date = new Date(dateStr);
    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function bindHomeEvents() {
    $('#createTournamentBtn').click(() => {
        $('#createTournamentModal').modal('show');
    });

    $('#submitTournamentBtn').click(async () => {
        await createTournament();
    });

    $('#notificationsBtn').click(async () => {
        await checkNotifications();
    });

    $('#searchAllMatchesBtn').click(() => {
        openGlobalSearch('match');
    });

    $('#searchAllTournamentsBtn').click(() => {
        openGlobalSearch('tournament');
    });
}

// Функція відкриття глобального пошуку
function openGlobalSearch(type) {
    const searchInput = $('#global-search');
    if (searchInput.length) {
        searchInput.focus();
        searchInput.trigger('input');
        if (type === 'match') {
            searchInput.attr('placeholder', 'Пошук матчів...');
        } else if (type === 'tournament') {
            searchInput.attr('placeholder', 'Пошук турнірів...');
        }
    } else {
        showNotification('Використовуйте пошук у верхній панелі', 'info');
    }
}

// Глобальна функція для тестування
window.selectSport = function(sport) {
    console.log('TEST: Setting sport to', sport);
    currentSport = sport;
    localStorage.setItem('selectedSport', sport);
    updateSportButtonText(sport);
    loadUpcomingMatches();
    loadActiveTournaments();
};
async function fetchCurrentUser() {
    try {
        const token = localStorage.getItem('accessToken');
        if (!token) return null;

        // Спробуємо отримати дані користувача з API
        const response = await fetch(`${API_CONFIG.baseUrl}/api/User/me`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const user = await response.json();
            localStorage.setItem('user', JSON.stringify(user));
            return user;
        }
    } catch (error) {
        console.error('Error fetching current user:', error);
    }
    return null;
}
// Експорт функцій
window.loadUpcomingMatches = loadUpcomingMatches;
window.loadActiveTournaments = loadActiveTournaments;
window.checkAndShowAdminButton = checkAndShowAdminButton;