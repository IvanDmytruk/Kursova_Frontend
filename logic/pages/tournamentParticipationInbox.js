
(() => {
    "use strict";

    const api = () => window.tournamentParticipationApi;

    let requests = [];
    let busy = false;

    const tournaments = new Map();
    const teams = new Map();

    const statuses = {
        Pending: "Очікує",
        Accepted: "Прийнято",
        Rejected: "Відхилено",
        Cancelled: "Скасовано"
    };

    function esc(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getUserId() {
        try {
            const user = JSON.parse(
                localStorage.getItem("user") || "{}"
            );

            return String(user.id ?? "");
        } catch {
            return "";
        }
    }

    function pending(request) {
        return String(request.status).toLowerCase() ===
            "pending";
    }

    function normalize(response) {
        return Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
                ? response.items
                : [];
    }

    function notify(message, type = "success") {
        if (window.notifications?.show) {
            window.notifications.show(message, type);
        } else {
            alert(message);
        }
    }

    async function loadNames() {
        const tournamentIds = [
            ...new Set(requests.map(r => r.tournamentId))
        ].filter(Boolean);

        const teamIds = [
            ...new Set(requests.map(r => r.teamId))
        ].filter(Boolean);

        await Promise.all([
            ...tournamentIds.map(async id => {
                if (tournaments.has(id)) return;

                try {
                    tournaments.set(
                        id,
                        await window.tournamentsApi.getById(id)
                    );
                } catch {
                    tournaments.set(id, null);
                }
            }),
            ...teamIds.map(async id => {
                if (teams.has(id)) return;

                try {
                    teams.set(
                        id,
                        await window.teamsApi.getById(id)
                    );
                } catch {
                    teams.set(id, null);
                }
            })
        ]);
    }

    function render() {
        const container = $("#myParticipationRequests");
        const userId = getUserId();

        const pendingInvitations = requests.filter(r =>
            pending(r) &&
            String(r.type).toLowerCase() === "invitation"
        ).length;

        $("#participationCount")
            .text(pendingInvitations)
            .toggle(pendingInvitations > 0);

        if (!requests.length) {
            container.html(`
                <div class="text-center text-muted py-5">
                    <i class="fas fa-inbox fa-3x mb-3"></i>
                    <p>Турнірних запитів поки немає.</p>
                </div>
            `);
            return;
        }

        const sorted = [...requests].sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        );

        container.html(sorted.map(request => {
            const tournament = tournaments.get(
                request.tournamentId
            );

            const team = teams.get(request.teamId);

            const name =
                tournament?.tournamentName ||
                "Невідомий турнір";

            const isInvitation =
                String(request.type).toLowerCase() ===
                "invitation";

            const isOwnIndividual =
                request.playerId &&
                String(request.playerId) === userId;

            const canAcceptInvitation =
                pending(request) &&
                isInvitation &&
                (request.teamId || isOwnIndividual);

            const canCancel =
                pending(request) &&
                String(request.createdByUserId) === userId;

            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="d-flex
                                    justify-content-between
                                    gap-2 flex-wrap">

                            <div>
                                <h6>
                                    ${esc(name)}
                                </h6>

                                <p class="small mb-1">
                                    ${isInvitation
                                        ? "Запрошення на турнір"
                                        : "Заявка на участь"}
                                </p>

                                ${request.teamId ? `
                                    <p class="small text-muted mb-1">
                                        Команда:
                                        ${esc(
                                            team?.teamName ||
                                            "Невідома команда"
                                        )}
                                    </p>
                                ` : ""}

                                <span class="badge ${
                                    pending(request)
                                        ? "bg-warning text-dark"
                                        : "bg-secondary"
                                }">
                                    ${esc(
                                        statuses[request.status] ||
                                        request.status
                                    )}
                                </span>
                            </div>
                        </div>

                        <div class="d-flex flex-wrap gap-2 mt-3">
                            ${canAcceptInvitation ? `
                                <button type="button"
                                        class="btn btn-success btn-sm"
                                        data-participation-inbox="accept"
                                        data-id="${esc(request.id)}">
                                    Прийняти
                                </button>

                                <button type="button"
                                        class="btn btn-outline-danger btn-sm"
                                        data-participation-inbox="reject"
                                        data-id="${esc(request.id)}">
                                    Відхилити
                                </button>
                            ` : ""}

                            ${canCancel ? `
                                <button type="button"
                                        class="btn btn-outline-secondary btn-sm"
                                        data-participation-inbox="cancel"
                                        data-id="${esc(request.id)}">
                                    Скасувати
                                </button>
                            ` : ""}

                            <a class="btn btn-outline-primary btn-sm"
                               href="/pages/tournament-details.html?id=${
                                   encodeURIComponent(request.tournamentId)
                               }">
                                Відкрити турнір
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }).join(""));
    }

    async function load() {
        const container = $("#myParticipationRequests");

        if (!container.length || busy) return;

        $("#refreshMyParticipation").prop(
            "disabled", true
        );

        container.html(`
            <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">Завантаження...</p>
            </div>
        `);

        try {
            requests = normalize(
                await api().getMyRequests()
            );

            await loadNames();
            render();
        } catch (error) {
            console.error(
                "Помилка турнірних заявок:",
                error
            );

            container.html(`
                <div class="alert alert-danger">
                    Не вдалося завантажити заявки.
                </div>
            `);
        } finally {
            $("#refreshMyParticipation").prop(
                "disabled", false
            );
        }
    }

    async function process(id, action) {
        if (busy) return;

        const request = requests.find(
            r => String(r.id) === String(id)
        );

        if (!request || !pending(request)) return;

        const userId = getUserId();

        if (action === "cancel" &&
            String(request.createdByUserId) !== userId) {
            return;
        }

        if (!confirm("Підтвердити дію над запитом?")) {
            return;
        }

        busy = true;

        $("#myParticipationRequests button")
            .prop("disabled", true);

        try {
            if (action === "accept") {
                await api().accept(id);
            } else if (action === "reject") {
                await api().reject(id);
            } else if (action === "cancel") {
                await api().cancel(id);
            } else {
                return;
            }

            notify("Статус запиту оновлено");

        } catch (error) {
            console.error(error);

            notify(
                error.message || "Не вдалося виконати дію",
                "error"
            );
        } finally {
            busy = false;
            await load();
        }
    }

    $(document).ready(function () {
        if (!$("#myParticipationRequests").length) {
            return;
        }

        $(document).on(
            "click",
            "#refreshMyParticipation",
            load
        );

        $(document).on(
            "click",
            "[data-participation-inbox]",
            function () {
                process(
                    $(this).attr("data-id"),
                    $(this).attr("data-participation-inbox")
                );
            }
        );

        load();
    });

    window.loadMyTournamentParticipation = load;
})();
