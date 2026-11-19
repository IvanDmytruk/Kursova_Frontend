
(() => {
    let invitations = [];
    let isLoading = false;

    const teamCache = new Map();

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showMessage(message, type = "success") {
        if (window.notifications?.show) {
            window.notifications.show(message, type);
        } else {
            alert(message);
        }
    }

    async function getTeamName(teamId) {
        if (!teamId) return "Невідома команда";

        if (teamCache.has(teamId)) {
            return teamCache.get(teamId);
        }

        try {
            const team = await window.teamsApi.getById(teamId);
            const name = team?.teamName || "Невідома команда";

            teamCache.set(teamId, name);
            return name;
        } catch (error) {
            console.warn("Не вдалося завантажити команду:", error);
            return "Команда недоступна";
        }
    }

    function updateCounter() {
        const count = invitations.filter(
            invitation =>
                String(invitation.status).toLowerCase() === "pending"
        ).length;

        $("#invitationsCount")
            .text(count)
            .toggle(count > 0);
    }

    async function renderInvitations() {
        const container = $("#invitationsList");

        if (!invitations.length) {
            container.html(`
                <div class="text-center text-muted py-5">
                    <i class="fas fa-envelope-open fa-3x mb-3"></i>
                    <h6>Запрошень поки немає</h6>
                    <p>Коли вас запросять до команди,
                       запрошення з'явиться тут.</p>
                </div>
            `);
            return;
        }

        const cards = await Promise.all(
            invitations.map(async invitation => {
                const teamName = await getTeamName(
                    invitation.teamId
                );

                const status = String(
                    invitation.status || ""
                ).toLowerCase();

                const pending = status === "pending";

                const roles = {
                    Player: "Гравець",
                    Captain: "Капітан",
                    Coach: "Тренер"
                };

                const role = roles[invitation.role] ||
                    invitation.role ||
                    "Учасник";

                const date = invitation.createdAt
                    ? new Date(invitation.createdAt)
                        .toLocaleDateString("uk-UA")
                    : "";

                return `
                    <div class="card mb-3">
                        <div class="card-body">
                            <div class="d-flex justify-content-between
                                        align-items-start gap-2">
                                <div>
                                    <h6>${escapeHtml(teamName)}</h6>
                                    <p class="small text-muted mb-1">
                                        Роль: ${escapeHtml(role)}
                                    </p>
                                    <small class="text-muted">
                                        ${escapeHtml(date)}
                                    </small>
                                </div>

                                <span class="badge ${
                                    pending
                                        ? "bg-warning text-dark"
                                        : "bg-secondary"
                                }">
                                    ${escapeHtml(
                                        invitation.status
                                    )}
                                </span>
                            </div>

                            ${pending ? `
                                <div class="d-flex gap-2 mt-3">
                                    <button
                                        class="btn btn-success btn-sm"
                                        data-action="accept"
                                        data-id="${escapeHtml(invitation.id)}">
                                        Прийняти
                                    </button>

                                    <button
                                        class="btn btn-outline-danger btn-sm"
                                        data-action="reject"
                                        data-id="${escapeHtml(invitation.id)}">
                                        Відхилити
                                    </button>
                                </div>
                            ` : ""}
                        </div>
                    </div>
                `;
            })
        );

        container.html(cards.join(""));
    }

    async function loadTeamInvitations() {
        if (isLoading) return;

        const container = $("#invitationsList");

        if (!container.length) return;

        isLoading = true;

        $("#refreshInvitationsBtn").prop("disabled", true);

        container.html(`
            <div class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 text-muted">Завантаження...</p>
            </div>
        `);

        try {
            const response =
                await window.teamsApi.getMyInvitations();

            invitations = Array.isArray(response)
                ? response
                : Array.isArray(response?.items)
                    ? response.items
                    : [];

            updateCounter();
            await renderInvitations();

        } catch (error) {
            console.error(
                "Помилка завантаження запрошень:",
                error
            );

            container.html(`
                <div class="alert alert-danger">
                    Не вдалося завантажити запрошення.
                </div>
            `);
        } finally {
            isLoading = false;
            $("#refreshInvitationsBtn").prop(
                "disabled", false
            );
        }
    }

    async function processInvitation(id, action) {
        if (!id) return;

        const buttons = $(
            `[data-id="${id}"]`
        );

        buttons.prop("disabled", true);

        try {
            if (action === "accept") {
                await window.teamsApi.acceptInvitation(id);
                showMessage("Запрошення прийнято!");
            } else if (action === "reject") {
                await window.teamsApi.rejectInvitation(id);
                showMessage("Запрошення відхилено");
            } else {
                return;
            }

            await loadTeamInvitations();

        } catch (error) {
            console.error(
                "Помилка обробки запрошення:",
                error
            );

            showMessage(
                error.message || "Не вдалося виконати дію",
                "error"
            );

            buttons.prop("disabled", false);
        }
    }

    $(document).ready(function () {
        $(document).on(
            "click",
            "#invitationsList [data-action]",
            function () {
                processInvitation(
                    $(this).attr("data-id"),
                    $(this).attr("data-action")
                );
            }
        );

        $("#refreshInvitationsBtn").on(
            "click",
            loadTeamInvitations
        );

        loadTeamInvitations();
    });

    window.loadTeamInvitations = loadTeamInvitations;
})();
