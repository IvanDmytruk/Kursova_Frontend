// logic/pages/matches.js
$(document).ready(function() {
    initializeMatchesPage();
    bindMatchesEvents();
    loadAllMatches();
});

let matchesState = {
    allMatches: [],
    filteredMatches: [],
    currentFilter: 'upcoming',
    teamsMap: {}
};

async function initializeMatchesPage() {
    showMatchesLoadingState();
}

function bindMatchesEvents() {
    $('.filter-btn').click(function() {
        $('.filter-btn').removeClass('active');
        $(this).addClass('active');
        matchesState.currentFilter = $(this).data('filter');
        filterAndDisplayMatches();
    });
}

async function loadAllMatches() {
    try {
        const matches = await window.matchesApi.getAll();
        matchesState.allMatches = matches || [];

        await loadTeamsForMatches(matchesState.allMatches);

        filterAndDisplayMatches();
    } catch (error) {
        console.error('Помилка завантаження матчів:', error);
        $('#matchesList').html(`
            <div class="col-12 text-center text-danger py-5">
                <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                <p>Не вдалося завантажити матчі</p>
                <button class="btn btn-primary" onclick="loadAllMatches()">Спробувати знову</button>
            </div>
        `);
    }
}

async function loadTeamsForMatches(matches) {
    const teamIds = new Set();
    matches.forEach(match => {
        if (match.homeTeamId) teamIds.add(match.homeTeamId);
        if (match.awayTeamId) teamIds.add(match.awayTeamId);
    });

    for (const teamId of teamIds) {
        if (!matchesState.teamsMap[teamId]) {
            try {
                const team = await window.teamsApi.getById(teamId);
                matchesState.teamsMap[teamId] = team;
            } catch (error) {
                console.error(`Помилка завантаження команди ${teamId}:`, error);
                matchesState.teamsMap[teamId] = { teamName: 'Невідома команда' };
            }
        }
    }
}

function filterAndDisplayMatches() {
    let filtered = [...matchesState.allMatches];
    const now = new Date();

    switch(matchesState.currentFilter) {
        case 'upcoming':
            filtered = filtered.filter(m => new Date(m.startTime) > now);
            break;
        case 'live':
            filtered = filtered.filter(m => {
                const start = new Date(m.startTime);
                return start <= now && new Date(start.getTime() + 2*60*60*1000) >= now;
            });
            break;
        case 'all':
        default:
            break;
    }

    matchesState.filteredMatches = filtered;
    displayMatches(matchesState.filteredMatches);
}

function displayMatches(matches) {
    const container = $('#matchesList');

    if (!matches || matches.length === 0) {
        container.html(`
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-calendar-day fa-3x mb-3"></i>
                <p>Матчів не знайдено</p>
            </div>
        `);
        return;
    }

    const matchesHtml = matches.map(match => {
        const homeTeam = matchesState.teamsMap[match.homeTeamId];
        const awayTeam = matchesState.teamsMap[match.awayTeamId];
        return `<div class="col-md-6">${MatchCardComponent.create(match, homeTeam, awayTeam)}</div>`;
    }).join('');

    container.html(matchesHtml);
}

function showMatchesLoadingState() {
    $('#matchesList').html(MatchCardComponent.createSkeleton().repeat(6));
}

window.loadAllMatches = loadAllMatches;