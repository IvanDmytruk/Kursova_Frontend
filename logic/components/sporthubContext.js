
(() => {
    "use strict";

    const get = id => document.getElementById(id);

    const esc = value => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const list = value =>
        Array.isArray(value)
            ? value
            : Array.isArray(value?.items)
                ? value.items
                : [];

    const qs = new URLSearchParams(location.search);

    const tournamentId =
        qs.get("id") || qs.get("tournamentId");

    const user = () => {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "{}"
            ) || {};
        } catch {
            return {};
        }
    };

    const alertMessage = (
        message,
        target = "viewAlert"
    ) => {
        const element = get(target);

        if (!element) {
            window.alert(message);
            return;
        }

        element.hidden = false;
        element.className = "sh-error mb-3";
        element.textContent = String(message);
    };

    const loadTournament = async () => {
        if (!tournamentId) {
            throw new Error(
                "Не вказано ID турніру."
            );
        }

        return window.tournamentsApi.getById(
            tournamentId
        );
    };

    const labels = {
        OlympicSystem: "Олімпійська система",
        RoundRobin: "Кругова система",
        SwissSystem: "Швейцарська система",
        Cs2SwissSystem: "CS2 Swiss",
        GroupStage: "Груповий етап",
        DoubleElimination: "Подвійне вибування"
    };

    const nav = [
        ["Огляд", "fa-gauge",
            "/pages/tournament-overview.html"],

        ["Таблиці", "fa-table",
            "/pages/tournament-standings.html"],

        ["Матчі й результати", "fa-list-check",
            "/pages/tournament-results.html"],

        ["Внесення результату", "fa-pen-to-square",
            "/pages/match-result-entry.html"],

        ["Формати", "fa-sitemap",
            "/pages/tournament-formats.html"],

        ["Основна сторінка", "fa-arrow-left",
            "/pages/tournament-details.html"]
    ];

    function contextNav(id = tournamentId) {
        const path = location.pathname;

        return `
            <nav aria-label="Навігація турніру">
                ${nav.map(([label, icon, url]) => {
                    const href = id
                        ? `${url}?id=${encodeURIComponent(id)}`
                        : url;

                    return `
                        <a href="${href}"
                           ${path === url
                                ? 'aria-current="page"'
                                : ""}>
                            <i class="fas ${icon}"></i>
                            ${esc(label)}
                        </a>
                    `;
                }).join("")}
            </nav>
        `;
    }

    function layout(
        heading,
        description,
        id = tournamentId
    ) {
        const sidebar = get("viewSidebar");

        if (sidebar) {
            sidebar.innerHTML = `
                <div class="sh-card sh-context-nav">
                    <h3>Розділи турніру</h3>
                    ${contextNav(id)}
                </div>
            `;
        }

        const title = get("viewTitle");
        const subtitle = get("viewSubtitle");
        const back = get("viewBack");

        if (title) title.textContent = heading;
        if (subtitle) subtitle.textContent = description;

        if (back) {
            back.href = id
                ? `/pages/tournament-details.html?id=${
                    encodeURIComponent(id)
                }`
                : "/pages/tournaments.html";
        }
    }

    function nameOf(id, tournament) {
        const participant = list(
            tournament?.tournamentParticipants
        ).find(item =>
            String(item.id) === String(id)
        );

        return participant?.teamName ||
            participant?.name ||
            id ||
            "Невідомий учасник";
    }

    /*
     * Реальні значення TournamentPermission
     * із Backend.
     */
    const Permission = Object.freeze({
        ManageSchedule: 1,
        ManageMatches: 2,
        ApproveResults: 4,
        SetTechnicalResults: 8,
        DisqualifyTeams: 16,
        ManageParticipants: 32,
        ManagePlayerSanctions: 64,
        ViewAuditLog: 128,
        ViewStaff: 256
    });

    function parsePermissions(value) {
        if (typeof value === "number") {
            return value;
        }

        if (typeof value !== "string") {
            return 0;
        }

        if (/^\d+$/.test(value.trim())) {
            return Number(value);
        }

        return value
            .split(",")
            .map(part => part.trim())
            .reduce(
                (mask, name) =>
                    mask | (Permission[name] || 0),
                0
            );
    }

    function hasPermission(mask, flag) {
        return (mask & flag) === flag;
    }

    function emptyPermissions() {
        return {
            results: false,
            technical: false,
            disqualify: false,
            participants: false,
            schedule: false,
            matches: false,
            audit: false,
            staff: false,
            organizer: false,
            manager: false
        };
    }

    async function permissions(tournament) {
        const currentUser = user();

        if (!currentUser.id ||
            !localStorage.getItem("accessToken")) {
            return emptyPermissions();
        }

        try {
            const url =
                `${window.tournamentManagementApi
                    .tournamentUrl(tournament.id)}/staff/me`;

            const response =
                await window.tournamentManagementApi.get(url);

            const mask = parsePermissions(
                response?.permissions
            );

            return {
                organizer: response?.isOrganizer === true,
                manager: response?.isManager === true,

                results: hasPermission(
                    mask, Permission.ApproveResults
                ),

                technical: hasPermission(
                    mask, Permission.SetTechnicalResults
                ),

                disqualify: hasPermission(
                    mask, Permission.DisqualifyTeams
                ),

                participants: hasPermission(
                    mask, Permission.ManageParticipants
                ),

                schedule: hasPermission(
                    mask, Permission.ManageSchedule
                ),

                matches: hasPermission(
                    mask, Permission.ManageMatches
                ),

                audit: hasPermission(
                    mask, Permission.ViewAuditLog
                ),

                staff: hasPermission(
                    mask, Permission.ViewStaff
                )
            };

        } catch (error) {
            console.warn(
                "Не вдалося отримати права турніру:",
                error
            );

            return emptyPermissions();
        }
    }

    window.SHView = {
        get,
        esc,
        list,
        qs,
        tournamentId,
        user,
        alert: alertMessage,
        loadTournament,
        labels,
        layout,
        nameOf,
        Permission,
        parsePermissions,
        hasPermission,
        permissions
    };
})();
