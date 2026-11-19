
const matchesState = {
    allMatches: [],
    filteredMatches: [],
    currentFilter: "today",
    teamsMap: {},
    loading: false
};

$(document).ready(function () {
    bindMatchesEvents();
    loadAllMatches();
});

function bindMatchesEvents() {
    $(document).on("click", ".filter-btn", function () {
        matchesState.currentFilter = $(this).data("filter");

        $(".filter-btn")
            .removeClass("active btn-primary")
            .addClass("btn-outline-primary");

        $(this)
            .addClass("active btn-primary")
            .removeClass("btn-outline-primary");

        filterAndDisplayMatches();
    });

    $(document).on("click", "#reloadMatchesBtn", function () {
        loadAllMatches();
    });

    if (window.SearchBar && $("#search-container").length) {
        new SearchBar("search-container");
    }
}

function getMatchTime(match) {
    const time = new Date(match.startTime).getTime();
    return Number.isFinite(time) ? time : null;
}

function getTodayBounds() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return {
        start: start.getTime(),
        end: end.getTime()
    };
}

function isFinishedMatch(match) {
    const status = String(match.status ?? "").toLowerCase();

    return [
        "finished",
        "completed",
        "ended"
    ].includes(status);
}

function normalizeMatches(response) {
    if (Array.isArray(response)) {
        return response;
    }

    if (Array.isArray(response?.items)) {
        return response.items;
    }

    if (Array.isArray(response?.data)) {
        return response.data;
    }

    throw new Error("Невідомий формат відповіді API матчів");
}

async function loadAllMatches() {
    if (matchesState.loading) return;

    matchesState.loading = true;

    $("#reloadMatchesBtn").prop("disabled", true);
    $("#matchesError").addClass("d-none").text("");

    showMatchesLoadingState();

    try {
        const response = await window.matchesApi.getAll();
        matchesState.allMatches = normalizeMatches(response);

        await loadTeamsForMatches(matchesState.allMatches);

        filterAndDisplayMatches();
    } catch (error) {
        console.error("Помилка завантаження матчів:", error);

        $("#matchesList").empty();

        $("#matchesError")
            .removeClass("d-none")
            .text("Не вдалося завантажити матчі. Спробуйте оновити сторінку.");

        $("#matchesCount").text("Помилка завантаження");
    } finally {
        matchesState.loading = false;
        $("#reloadMatchesBtn").prop("disabled", false);
    }
}

async function loadTeamsForMatches(matches) {
    const teamIds = new Set();

    matches.forEach(match => {
        if (match.homeTeamId) {
            teamIds.add(match.homeTeamId);
        }

        if (match.awayTeamId) {
            teamIds.add(match.awayTeamId);
        }
    });

    const missingIds = [...teamIds].filter(
        id => !matchesState.teamsMap[id]
    );

    await Promise.all(missingIds.map(async teamId => {
        try {
            matchesState.teamsMap[teamId] =
                await window.teamsApi.getById(teamId);
        } catch (error) {
            console.warn("Помилка команди:", teamId, error);

            matchesState.teamsMap[teamId] = {
                teamName: "Невідома команда"
            };
        }
    }));
}

function filterAndDisplayMatches() {
    const { start, end } = getTodayBounds();

    let filtered = matchesState.allMatches.filter(match => {
        const time = getMatchTime(match);

        if (time === null) return false;

        switch (matchesState.currentFilter) {
            case "finished":
                return time < start && isFinishedMatch(match);

            case "today":
                return time >= start && time < end;

            case "upcoming":
                return time >= end && !isFinishedMatch(match);

            default:
                return false;
        }
    });

    filtered.sort((a, b) => {
        const first = getMatchTime(a);
        const second = getMatchTime(b);

        if (matchesState.currentFilter === "finished") {
            return second - first;
        }

        return first - second;
    });

    matchesState.filteredMatches = filtered;

    displayMatches(filtered);
}

function displayMatches(matches) {
    const container = $("#matchesList");

    $("#matchesCount").text(`Знайдено матчів: ${matches.length}`);

    if (!matches.length) {
        container.html(`
            <div class="col-12 text-center py-5">
                <i class="far fa-calendar-times fa-3x mb-3 text-muted"></i>
                <h5>Матчів не знайдено</h5>
                <p class="text-muted">
                    У вибраній категорії немає матчів.
                </p>
            </div>
        `);
        return;
    }

    const html = matches.map(match => {
        const homeTeam =
            matchesState.teamsMap[match.homeTeamId];

        const awayTeam =
            matchesState.teamsMap[match.awayTeamId];

        return `
            <div class="col-12 col-xl-6">
                ${MatchCardComponent.create(
                    match,
                    homeTeam,
                    awayTeam
                )}
            </div>
        `;
    }).join("");

    container.html(html);
}

function showMatchesLoadingState() {
    $("#matchesCount").text("Завантаження матчів...");

    $("#matchesList").html(
        MatchCardComponent.createSkeleton().repeat(6)
    );
}

window.loadAllMatches = loadAllMatches;
