(() => {
    "use strict";

    const api = () => window.tournamentParticipationApi;

    const state = {
        tournament: null,
        myTeams: [],
        requests: [],
        myRequests: [],
        canManage: false,
        selectedPlayer: null,
        busy: false
    };

    const statusNames = {
        Pending: "Очікує",
        Accepted: "Прийнято",
        Rejected: "Відхилено",
        Cancelled: "Скасовано"
    };

    const typeNames = {
        Application: "Заявка",
        Invitation: "Запрошення"
    };

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getUser() {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "{}"
            );
        } catch {
            return {};
        }
    }

    function getTournament() {
        return typeof currentTournament !== "undefined"
            ? currentTournament
            : null;
    }

    function isLoggedIn() {
        return Boolean(
            localStorage.getItem("accessToken") &&
            getUser().id
        );
    }

    function isRegistrationOpen(tournament) {
        return tournament?.status === "Registration";
    }

    function isTeamFormat(tournament) {
        return tournament?.format === "Command";
    }

    function notice(message, type = "success") {
        if (window.notifications?.show) {
            window.notifications.show(message, type);
        } else {
            alert(message);
        }
    }

    function normalize(items) {
        if (Array.isArray(items)) return items;
        if (Array.isArray(items?.items)) return items.items;
        return [];
    }

    function isPending(item) {
        return String(item.status).toLowerCase() === "pending";
    }

    function isInvitation(item) {
        return String(item.type).toLowerCase() === "invitation";
    }

    function isApplication(item) {
        return String(item.type).toLowerCase() === "application";
    }

    function isOrganizer(tournament) {
        return String(tournament?.createdBy ?? "") ===
            String(getUser().id ?? "");
    }

    function myRequestFor(tournamentId, teamId, playerId) {
        return state.myRequests.find(request =>
            String(request.tournamentId) === String(tournamentId) &&
            String(request.teamId ?? "") === String(teamId ?? "") &&
            String(request.playerId ?? "") === String(playerId ?? "") &&
            isPending(request)
        );
    }

    async function loadMyTeams() {
        const userId = String(getUser().id ?? "");

        const teams = normalize(
            await window.teamsApi.getAll()
        );

        const results = await Promise.all(
            teams.map(async team => {
                if (String(team.ownerId) === userId) {
                    return team;
                }

                try {
                    const members = normalize(
                        await window.teamsApi.getMembers(team.id)
                    );

                    const authorized = members.some(member =>
                        String(member.userId) === userId &&
                        ["captain", "coach"].includes(
                            String(member.role).toLowerCase()
                        )
                    );

                    return authorized ? team : null;
                } catch {
                    return null;
                }
            })
        );

        state.myTeams = results.filter(Boolean);
    }

    function teamOptions(teams) {
        return teams.map(team => `
            <option value="${esc(team.id)}">
                ${esc(team.teamName || "Команда")}
            </option>
        `).join("");
    }

    function ensurePanel() {
        if ($("#participationPanel").length) return;

        const panel = $(`
            <section id="participationPanel"
                     class="card shadow-sm mt-4">
                <div class="card-header bg-dark text-white
                            d-flex justify-content-between
                            align-items-center gap-2">
                    <h5 class="mb-0">
                        <i class="fas fa-clipboard-list me-2"></i>
                        Заявки та запрошення
                    </h5>

                    <button id="refreshParticipationBtn"
                            type="button"
                            class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sync-alt"></i>
                        Оновити
                    </button>
                </div>

                <div class="card-body">
                    <div id="participationActions"></div>
                    <div id="participationRequests"></div>
                </div>
            </section>
        `);

        $("#participantsList").closest(".card").after(panel);
    }

    function renderActions() {
        const tournament = state.tournament;
        const container = $("#participationActions");

        if (!isLoggedIn()) {
            container.html(`
                <div class="alert alert-info">
                    Увійдіть в акаунт для подання заявки
                    або отримання запрошень.
                </div>
            `);
            return;
        }

        if (!isRegistrationOpen(tournament)) {
            container.html(`
                <div class="alert alert-secondary">
                    Реєстрація на цей турнір закрита.
                </div>
            `);
            return;
        }

        let html = "";

        if (isTeamFormat(tournament)) {
            const teams = state.myTeams.filter(team =>
                String(team.sportName).toLowerCase() ===
                String(tournament.sportName).toLowerCase()
            );

            html += `
                <div class="mb-4">
                    <h6>Подати заявку від команди</h6>

                    ${teams.length ? `
                        <div class="d-flex gap-2 flex-wrap">
                            <select id="applicationTeamId"
                                    class="form-select"
                                    style="max-width:350px">
                                ${teamOptions(teams)}
                            </select>

                            <button id="submitParticipationApplication"
                                    class="btn btn-primary">
                                Подати заявку
                            </button>
                        </div>
                    ` : `
                        <p class="text-muted small">
                            У вас немає команди цього виду спорту,
                            якою ви можете керувати.
                        </p>
                    `}
                </div>
            `;
        } else {
            const pending = myRequestFor(
                tournament.id, "", getUser().id
            );

            html += `
                <div class="mb-4">
                    <h6>Індивідуальна участь</h6>

                    <button id="submitParticipationApplication"
                            class="btn btn-primary"
                            ${pending ? "disabled" : ""}>
                        ${pending
                            ? "Заявку вже подано"
                            : "Подати заявку"}
                    </button>
                </div>
            `;
        }

        if (state.canManage) {
            html += `
                <hr>
                <h6>Запросити учасника</h6>
            `;

            if (isTeamFormat(tournament)) {
                html += `
                    <div class="d-flex gap-2 flex-wrap mb-3">
                        <select id="inviteTournamentTeam"
                                class="form-select"
                                style="max-width:350px">
                            <option value="">
                                Виберіть команду...
                            </option>
                        </select>

                        <button id="sendTournamentInvitation"
                                type="button"
                                class="btn btn-outline-primary">
                            Надіслати запрошення
                        </button>
                    </div>
                    <p class="text-muted small">
                        Команду можна запросити незалежно від того,
                        хто є її власником. Прийме запрошення
                        уповноважений представник команди.
                    </p>
                `;
            } else {
                html += `
                    <div class="mb-2">
                        <input id="inviteTournamentPlayerSearch"
                               type="search"
                               class="form-control"
                               maxlength="60"
                               placeholder="Пошук за ім'ям або прізвищем">
                    </div>

                    <div id="tournamentPlayerResults"
                         class="list-group mb-2"></div>

                    <div id="selectedTournamentPlayer"
                         class="small mb-2 text-muted"></div>

                    <button id="sendTournamentInvitation"
                            type="button"
                            disabled
                            class="btn btn-outline-primary">
                        Надіслати запрошення
                    </button>
                `;
            }
        }

        container.html(html);

        if (state.canManage && isTeamFormat(tournament)) {
            populateInviteTeams();
        }
    }

    async function populateInviteTeams() {
        const select = $("#inviteTournamentTeam");

        if (!select.length) return;

        try {
            const teams = normalize(
                await window.teamsApi.getAll()
            );

            const registeredIds = new Set(
                (state.tournament.tournamentParticipants || [])
                    .map(p => String(p.id))
            );

            const filtered = teams.filter(team =>
                String(team.sportName).toLowerCase() ===
                    String(state.tournament.sportName).toLowerCase() &&
                !registeredIds.has(String(team.id))
            );

            select.append(teamOptions(filtered));
        } catch (error) {
            console.error("Помилка завантаження команд:", error);
            notice("Не вдалося завантажити команди", "error");
        }
    }

    function getRequestTarget(request) {
        const teamId = request.teamId;
        const playerId = request.playerId;

        if (teamId) {
            const team = state.myTeams.find(t =>
                String(t.id) === String(teamId)
            );

            return team?.teamName || `Команда: ${teamId}`;
        }

        return playerId ? `Гравець: ${playerId}` : "Учасник";
    }

    function renderRequestList() {
        const container = $("#participationRequests");

        const requests = state.canManage
            ? state.requests
            : state.myRequests.filter(request =>
                String(request.tournamentId) ===
                String(state.tournament.id)
            );

        if (!requests.length) {
            container.html(`
                <p class="text-muted mt-3">
                    Заявок і запрошень поки немає.
                </p>
            `);
            return;
        }

        const userId = String(getUser().id ?? "");

        container.html(`
            <hr>
            <h6>
                ${state.canManage
                    ? "Заявки та запрошення турніру"
                    : "Мої заявки та запрошення"}
            </h6>

            <div class="list-group">
                ${requests.map(request => {
                    const pending = isPending(request);
                    const invited = isInvitation(request);
                    const applied = isApplication(request);

                    const targetAuthorized = request.playerId
                        ? String(request.playerId) === userId
                        : state.myTeams.some(team =>
                            String(team.id) ===
                            String(request.teamId)
                        );

                    const canAccept = pending && (
                        (applied && state.canManage) ||
                        (invited && targetAuthorized)
                    );

                    const canReject = canAccept;

                    const canCancel = pending &&
                        String(request.createdByUserId) === userId;

                    return `
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between
                                        align-items-start flex-wrap gap-2">
                                <div>
                                    <strong>
                                        ${esc(
                                            typeNames[request.type] ||
                                            request.type
                                        )}
                                    </strong>
                                    <div class="small text-muted">
                                        ${esc(getRequestTarget(request))}
                                    </div>
                                </div>

                                <span class="badge ${
                                    pending
                                        ? "bg-warning text-dark"
                                        : "bg-secondary"
                                }">
                                    ${esc(
                                        statusNames[request.status] ||
                                        request.status
                                    )}
                                </span>
                            </div>

                            ${pending ? `
                                <div class="d-flex gap-2 mt-2">
                                    ${canAccept ? `
                                        <button
                                            class="btn btn-success btn-sm"
                                            data-participation-action="accept"
                                            data-id="${esc(request.id)}">
                                            Прийняти
                                        </button>
                                    ` : ""}

                                    ${canReject ? `
                                        <button
                                            class="btn btn-outline-danger btn-sm"
                                            data-participation-action="reject"
                                            data-id="${esc(request.id)}">
                                            Відхилити
                                        </button>
                                    ` : ""}

                                    ${canCancel ? `
                                        <button
                                            class="btn btn-outline-secondary btn-sm"
                                            data-participation-action="cancel"
                                            data-id="${esc(request.id)}">
                                            Скасувати
                                        </button>
                                    ` : ""}
                                </div>
                            ` : ""}
                        </div>
                    `;
                }).join("")}
            </div>
        `);
    }

    async function loadRequests() {
        state.canManage = false;
        state.requests = [];
        state.myRequests = [];

        if (!isLoggedIn()) return;

        const myResult = await Promise.allSettled([
            api().getMyRequests(),
            api().getTournamentRequests(state.tournament.id)
        ]);

        if (myResult[0].status === "fulfilled") {
            state.myRequests = normalize(myResult[0].value);
        } else {
            console.warn(
                "Не вдалося отримати власні заявки:",
                myResult[0].reason
            );
        }

        if (myResult[1].status === "fulfilled") {
            state.canManage = true;
            state.requests = normalize(myResult[1].value);
        } else {
            state.canManage = false;
        }
    }

    async function refresh() {
        const tournament = getTournament();

        if (!tournament?.id) return;

        state.tournament = tournament;
        ensurePanel();

        $("#participationActions").text("Завантаження...");
        $("#participationRequests").empty();

        try {
            await Promise.all([
                loadRequests(),
                isLoggedIn()
                    ? loadMyTeams()
                    : Promise.resolve()
            ]);

            renderActions();
            renderRequestList();
        } catch (error) {
            console.error("Помилка модуля заявок:", error);

            $("#participationActions").html(`
                <div class="alert alert-danger">
                    Не вдалося завантажити заявки.
                </div>
            `);
        }
    }

    async function createApplication() {
        const tournament = state.tournament;
        const user = getUser();

        if (!isRegistrationOpen(tournament)) return;

        let response;

        if (isTeamFormat(tournament)) {
            const teamId = $("#applicationTeamId").val();

            if (!teamId) {
                notice("Спочатку виберіть команду", "warning");
                return;
            }

            response = await api().applyTeam(
                tournament.id, teamId
            );
        } else {
            response = await api().applyPlayer(
                tournament.id, user.id
            );
        }

        notice("Заявку на участь надіслано");
        await refresh();

        return response;
    }

    async function createInvitation() {
        const tournament = state.tournament;

        if (!state.canManage ||
            !isRegistrationOpen(tournament)) return;

        if (isTeamFormat(tournament)) {
            const teamId = $("#inviteTournamentTeam").val();

            if (!teamId) {
                notice("Виберіть команду", "warning");
                return;
            }

            await api().inviteTeam(tournament.id, teamId);
        } else {
            if (!state.selectedPlayer?.id) {
                notice("Виберіть гравця", "warning");
                return;
            }

            await api().invitePlayer(
                tournament.id,
                state.selectedPlayer.id
            );
        }

        notice("Запрошення надіслано");
        state.selectedPlayer = null;

        await refresh();
    }

    let searchTimer = null;
    let searchVersion = 0;

    async function searchPlayers(term) {
        const version = ++searchVersion;
        const container = $("#tournamentPlayerResults");

        if (term.length < 2) {
            container.empty();
            return;
        }

        container.text("Пошук...");

        try {
            const url =
                `${window.teamsApi.url}/users/search` +
                `?term=${encodeURIComponent(term)}`;

            const result = normalize(
                await window.teamsApi.get(url)
            );

            if (version !== searchVersion) return;

            container.empty();

            result.forEach(user => {
                const button = $("<button>", {
                    type: "button",
                    class: "list-group-item list-group-item-action"
                });

                button.text(
                    [user.name, user.surname]
                        .filter(Boolean).join(" ")
                );

                button.on("click", () => {
                    state.selectedPlayer = user;

                    $("#selectedTournamentPlayer").text(
                        `Вибрано: ${user.name} ${user.surname}`
                    );

                    $("#sendTournamentInvitation")
                        .prop("disabled", false);

                    container.empty();
                });

                container.append(button);
            });

            if (!result.length) {
                container.text("Користувачів не знайдено");
            }
        } catch (error) {
            if (version !== searchVersion) return;

            container.text("Помилка пошуку");
            console.error(error);
        }
    }

    async function runAction(callback) {
        if (state.busy) return;

        state.busy = true;

        $("#participationPanel button")
            .prop("disabled", true);

        try {
            await callback();
        } catch (error) {
            console.error("Помилка заявки:", error);

            notice(
                error.message || "Операцію не виконано",
                "error"
            );
        } finally {
            state.busy = false;

            $("#participationPanel button")
                .prop("disabled", false);
        }
    }

    async function resolveRequest(id, action) {
        const request = (
            state.canManage
                ? state.requests
                : state.myRequests
        ).find(item => String(item.id) === String(id));

        if (!request || !isPending(request)) return;

        const labels = {
            accept: "прийняти",
            reject: "відхилити",
            cancel: "скасувати"
        };

        if (!confirm(
            `Ви впевнені, що хочете ${labels[action]} запит?`
        )) return;

        if (action === "accept") {
            await api().accept(id);
        } else if (action === "reject") {
            await api().reject(id);
        } else if (action === "cancel") {
            await api().cancel(id);
        }

        notice("Статус запиту оновлено");

        if (typeof window.loadTournamentDetails === "function") {
            await window.loadTournamentDetails();
        }

        await refresh();
    }

    $(document).ready(function () {
        if (!$("#participantsList").length) return;

        $(document).on(
            "click",
            "#refreshParticipationBtn",
            () => refresh()
        );

        $(document).on(
            "click",
            "#submitParticipationApplication",
            () => runAction(createApplication)
        );

        $(document).on(
            "click",
            "#sendTournamentInvitation",
            () => runAction(createInvitation)
        );

        $(document).on(
            "input",
            "#inviteTournamentPlayerSearch",
            function () {
                clearTimeout(searchTimer);
                searchVersion++;

                state.selectedPlayer = null;

                $("#sendTournamentInvitation")
                    .prop("disabled", true);

                $("#selectedTournamentPlayer").empty();

                const term = $(this).val().trim();

                searchTimer = setTimeout(
                    () => searchPlayers(term),
                    350
                );
            }
        );

        $(document).on(
            "click",
            "[data-participation-action]",
            function () {
                const id = $(this).attr("data-id");
                const action = $(this).attr(
                    "data-participation-action"
                );

                runAction(() => resolveRequest(id, action));
            }
        );
    });

    window.loadTournamentParticipation = refresh;
})();
