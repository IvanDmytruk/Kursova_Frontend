
let currentUser = null;

$(document).ready(function () {
    checkAuthAndLoadProfile();
    setupTabs();
    setupEventHandlers();
});

function getStoredUser() {
    try {
        return JSON.parse(
            localStorage.getItem("user") || "{}"
        );
    } catch {
        return {};
    }
}

function checkAuthAndLoadProfile() {
    const token = localStorage.getItem("accessToken");
    const user = getStoredUser();

    if (!token || !user.id) {
        window.location.href = "/pages/login.html";
        return;
    }

    currentUser = user;

    updateNavMenu(true);
    disableUnsupportedActions();

    loadProfile();
}

function disableUnsupportedActions() {
    // Ці дії потребують окремих API для власного акаунта.
    $("#saveProfileBtn, #deleteAccountBtn, #changePasswordBtn")
        .prop("disabled", true)
        .attr("title", "Функція поки недоступна");

    $("#profileSurname, #profileName, #profileAge")
        .prop("readonly", true);

    // Не показуємо фальшиве підтвердження
    // неіснуючого запиту на зміну ролі.
    $("#requestPlayerRoleBtn")
        .prop("disabled", true)
        .attr("title", "Функція поки недоступна");
}

async function loadProfile() {
    currentUser = getStoredUser();

    if (!currentUser.id) {
        window.location.href = "/pages/login.html";
        return;
    }

    displayProfileData();

    await Promise.allSettled([
        loadUserTournaments(),
        loadUserStatistics()
    ]);
}

function updateNavMenu(isLoggedIn) {
    const user = currentUser;

    if (isLoggedIn && user) {
        const fullName = [
            user.surname,
            user.name
        ].filter(Boolean).join(" ");

        $("#userNameNav").text(fullName || "Профіль");

        $("#guestButtons").hide();
        $("#userMenu").show();
    } else {
        $("#userNameNav").text("Профіль");

        $("#userMenu").hide();
        $("#guestButtons").show();
    }
}

function displayProfileData() {
    if (!currentUser?.id) return;

    const fullName = [
        currentUser.surname,
        currentUser.name
    ].filter(Boolean).join(" ");

    const roleLabels = {
        User: "Користувач",
        Admin: "Адміністратор",
        Player: "Гравець",
        Coach: "Тренер"
    };

    const role = roleLabels[currentUser.role] ||
        currentUser.role ||
        "Користувач";

    $("#profileFullName").text(
        fullName || "Користувач"
    );

    $("#profileRole").text(role);
    $("#profileRoleDisplay").val(role);

    $("#profileSurname").val(
        currentUser.surname || ""
    );

    $("#profileName").val(
        currentUser.name || ""
    );

    $("#profileAge").val(
        currentUser.age ?? ""
    );

    $("#profileEmail").val(
        currentUser.contactInfo?.email ||
        currentUser.email ||
        ""
    );
}

async function loadUserTournaments() {
    const container = $("#myTournamentsList");

    if (!currentUser?.id || !window.tournamentsApi) {
        return;
    }

    try {
        const response = await window.tournamentsApi.getAll();

        const tournaments = Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
                ? response.items
                : [];

        const myTournaments = tournaments.filter(
            tournament =>
                String(tournament.createdBy) ===
                String(currentUser.id)
        );

        if (!myTournaments.length) {
            container.html(`
                <div class="col-12 text-center text-muted py-5">
                    <i class="fas fa-trophy fa-3x mb-3"></i>
                    <p>У вас немає створених турнірів</p>
                    <a href="/pages/tournaments.html"
                       class="btn btn-outline-primary btn-sm">
                        Переглянути турніри
                    </a>
                </div>
            `);
            return;
        }

        container.empty();

        myTournaments.forEach(tournament => {
            const id = String(tournament.id ?? "");
            const name = tournament.tournamentName ||
                "Без назви";

            const card = $("<div>")
                .addClass("col-md-6 mb-3");

            const link = $("<a>")
                .addClass(
                    "card h-100 text-decoration-none text-reset"
                )
                .attr(
                    "href",
                    `/pages/tournament-details.html?id=${
                        encodeURIComponent(id)
                    }`
                );

            const body = $("<div>")
                .addClass("card-body");

            $("<h6>")
                .addClass("card-title")
                .text(name)
                .appendTo(body);

            $("<p>")
                .addClass("small text-muted mb-2")
                .text(
                    tournament.tournamentDescription || ""
                )
                .appendTo(body);

            $("<span>")
                .addClass("badge bg-secondary")
                .text(tournament.tournamentType || "Турнір")
                .appendTo(body);

            link.append(body);
            card.append(link);
            container.append(card);
        });

    } catch (error) {
        console.error(
            "Помилка завантаження турнірів:",
            error
        );

        container.html(`
            <div class="col-12">
                <div class="alert alert-danger">
                    Не вдалося завантажити турніри.
                </div>
            </div>
        `);
    }
}

async function loadUserStatistics() {
    if (!currentUser?.id || !window.statisticsApi) {
        return;
    }

    try {
        const response = await window.statisticsApi
            .getUserStats(currentUser.id);

        const stats = Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
                ? response.items
                : [];

        const total = stats.reduce(
            (result, item) => {
                result.matches += Number(
                    item.matchesPlayed || 0
                );

                result.wins += Number(
                    item.wins || 0
                );

                result.points += Number(
                    item.points || 0
                );

                if (item.tournamentId) {
                    result.tournamentIds.add(
                        item.tournamentId
                    );
                }

                return result;
            },
            {
                matches: 0,
                wins: 0,
                points: 0,
                tournamentIds: new Set()
            }
        );

        $("#statTournamentsCount").text(
            total.tournamentIds.size
        );

        $("#statMatchesCount").text(total.matches);
        $("#statWinsCount").text(total.wins);
        $("#statPointsCount").text(total.points);

    } catch (error) {
        console.error(
            "Помилка завантаження статистики:",
            error
        );
    }
}

function setupTabs() {
    const buttons = $("#profileNavigation [data-tab]");
    const tabs = $(
    "#tab-profile, #tab-tournaments, " +
    "#tab-invitations, #tab-participation, " +
    "#tab-stats, #tab-settings"
);

    function activateTab(name) {
        const target = $(`#tab-${name}`);

        if (!target.length) {
            name = "profile";
        }

        buttons.removeClass("active");

        buttons
            .filter(`[data-tab="${name}"]`)
            .addClass("active");

        tabs.hide().removeClass("active");

        $(`#tab-${name}`)
            .show()
            .addClass("active");

        if (name === "invitations" &&
            typeof window.loadTeamInvitations === "function") {

            window.loadTeamInvitations();
        }
        if ( name === "participation" &&
    typeof window.loadMyTournamentParticipation === "function") 
    {
       window.loadMyTournamentParticipation();
    }
        if (name === "tournaments") {
            loadUserTournaments();
        }

        if (name === "stats") {
            loadUserStatistics();
        }
    }

    buttons.on("click", function (event) {
        event.preventDefault();

        const tab = $(this).data("tab");

        activateTab(tab);

        const url = new URL(window.location.href);

        url.searchParams.set("tab", tab);

        window.history.replaceState(
            {},
            "",
            url.toString()
        );
    });

    const params = new URLSearchParams(
        window.location.search
    );

    activateTab(params.get("tab") || "profile");
}

function setupEventHandlers() {
    $("#profileForm").on("submit", function (event) {
        event.preventDefault();

        showProfileMessage(
            "Редагування профілю поки недоступне",
            "info"
        );
    });

    $("#logoutBtn").on("click", async function (event) {
        event.preventDefault();

        const refreshToken = localStorage.getItem(
            "refreshToken"
        );

        try {
            if (refreshToken && window.authApi) {
                await window.authApi.logout(refreshToken);
            }
        } catch (error) {
            console.warn(
                "Помилка завершення сесії:",
                error
            );
        } finally {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");

            window.location.href = "/index.html";
        }
    });
}

function showProfileMessage(message, type = "info") {
    if (window.notifications?.show) {
        window.notifications.show(message, type);
    } else {
        alert(message);
    }
}
