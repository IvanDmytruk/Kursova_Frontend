(() => {
    const state = {
        members: [],
        invitations: [],
        teamId: null,
        busy: false
    };

    const roleNames = {
        Player: "Гравець",
        Captain: "Капітан",
        Coach: "Тренер"
    };

    const statusNames = {
        Pending: "Очікує відповіді",
        Accepted: "Прийнято",
        Rejected: "Відхилено",
        Cancelled: "Скасовано"
    };

    function html(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getTeam() {
        if (typeof currentTeam !== "undefined") {
            return currentTeam;
        }

        return window.currentTeam ?? null;
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

    function normalizeRole(value) {
        return String(value ?? "").toLowerCase();
    }

    function getPermissions() {
        const team = getTeam();
        const user = getUser();

        const userId = String(
            user.id ?? user.userId ?? ""
        );

        const isAuthenticated = Boolean(
            localStorage.getItem("accessToken") &&
            userId
        );

        const isAdmin =
            normalizeRole(user.role) === "admin";

        const isOwner = Boolean(
            team &&
            userId &&
            String(team.ownerId) === userId
        );

        const membership = state.members.find(
            member => String(member.userId) === userId
        );

        const memberRole = normalizeRole(
            membership?.role
        );

        const isManager =
            memberRole === "captain" ||
            memberRole === "coach";

        return {
            userId,
            isAuthenticated,
            isOwner,
            isAdmin,
            isMember: Boolean(membership),
            canManage:
                isAuthenticated &&
                (isOwner || isAdmin || isManager),
            canChangeRoles:
                isAuthenticated &&
                (isOwner || isAdmin),
            canLeave:
                isAuthenticated &&
                Boolean(membership) &&
                !isOwner
        };
    }

    function notify(message, type = "success") {
        if (window.notifications?.show) {
            window.notifications.show(message, type);
        } else if (
            typeof window.showNotification === "function"
        ) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    function setBusy(value) {
        state.busy = value;

        $("#playersList button, #teamManagementPanel button")
            .prop("disabled", value);
    }

    function teamUrl(path = "") {
        return (
            `${window.teamsApi.url}/` +
            encodeURIComponent(state.teamId) +
            path
        );
    }

    async function apiPatch(url, data) {
        return window.teamsApi.request(url, {
            method: "PATCH",
            ...(data === undefined
                ? {}
                : { body: JSON.stringify(data) })
        });
    }

    async function apiDelete(url) {
        return window.teamsApi.request(url, {
            method: "DELETE"
        });
    }

    function memberName(member) {
        return [
            member.name,
            member.surname
        ].filter(Boolean).join(" ") || "Користувач";
    }

    function roleOptions(currentRole) {
        return Object.keys(roleNames)
            .map(role => `
                <option
                    value="${role}"
                    ${normalizeRole(currentRole) ===
                      normalizeRole(role) ? "selected" : ""}>
                    ${roleNames[role]}
                </option>
            `)
            .join("");
    }

    function renderMembers() {
        const container = $("#playersList");
        const permissions = getPermissions();
        const team = getTeam();

        if (!state.members.length) {
            container.html(`
                <div class="col-12 text-center text-muted py-4">
                    <i class="fas fa-users fa-2x mb-2"></i>
                    <p>У команді поки немає учасників</p>
                </div>
            `);
        } else {
            const cards = state.members.map(member => {
                const isOwner =
                    String(member.userId) ===
                    String(team?.ownerId);

                const isSelf =
                    String(member.userId) ===
                    permissions.userId;

                const canChangeRole =
                    permissions.canChangeRoles &&
                    !isOwner &&
                    !isSelf;

                const canRemove =
                    permissions.canManage &&
                    !isOwner &&
                    !isSelf;

                const name = html(memberName(member));
                const userId = html(member.userId);
                const role = String(
                    member.role ?? "Player"
                );

                const roleLabel =
                    roleNames[role] || role;

                const age = Number(member.age);

                const ageText =
                    Number.isFinite(age) && age > 0
                        ? `${age} років`
                        : "Вік не вказано";

                return `
                    <div class="col-md-6 col-xl-4 mb-3">
                        <div class="card h-100 player-card">
                            <div class="card-body text-center">

                                <div class="rounded-circle bg-primary
                                            d-flex align-items-center
                                            justify-content-center
                                            mx-auto mb-3"
                                     style="width:65px;height:65px">
                                    <i class="fas fa-user
                                              fa-2x text-white"></i>
                                </div>

                                <h6 class="card-title">
                                    ${name}
                                </h6>

                                <div class="mb-2">
                                    <span class="badge bg-secondary">
                                        ${html(roleLabel)}
                                    </span>

                                    ${isOwner ? `
                                        <span class="badge
                                                     bg-warning text-dark">
                                            Власник
                                        </span>
                                    ` : ""}

                                    ${isSelf ? `
                                        <span class="badge bg-info">
                                            Ви
                                        </span>
                                    ` : ""}
                                </div>

                                <p class="small text-muted">
                                    ${html(ageText)}
                                </p>

                                <a class="btn btn-outline-secondary
                                          btn-sm mb-2"
                                   href="/pages/player-details.html?id=${
                                       encodeURIComponent(member.userId)
                                   }">
                                    <i class="fas fa-user me-1"></i>
                                    Профіль
                                </a>

                                ${canChangeRole ? `
                                    <div class="mt-3 text-start">
                                        <label class="form-label small">
                                            Роль учасника
                                        </label>

                                        <select
                                            class="form-select form-select-sm
                                                   team-member-role"
                                            data-user-id="${userId}">
                                            ${roleOptions(role)}
                                        </select>

                                        <button
                                            type="button"
                                            class="btn btn-outline-primary
                                                   btn-sm w-100 mt-2"
                                            data-team-action="save-role"
                                            data-user-id="${userId}">
                                            <i class="fas fa-save me-1"></i>
                                            Зберегти роль
                                        </button>
                                    </div>
                                ` : ""}

                                ${canRemove ? `
                                    <button
                                        type="button"
                                        class="btn btn-outline-danger
                                               btn-sm w-100 mt-2"
                                        data-team-action="remove-member"
                                        data-user-id="${userId}">
                                        <i class="fas fa-user-minus me-1"></i>
                                        Видалити з команди
                                    </button>
                                ` : ""}
                            </div>
                        </div>
                    </div>
                `;
            }).join("");

            container.html(cards);
        }

        $("#inviteTeamMemberBtn").toggle(
            permissions.canManage
        );

        renderManagementPanel(permissions);
    }

    function ensureManagementPanel() {
        if ($("#teamManagementPanel").length) return;

        const panel = $(`
            <div id="teamManagementPanel"
                 class="card shadow-sm mt-4">

                <div class="card-header bg-dark text-white
                            d-flex align-items-center
                            justify-content-between gap-2
                            flex-wrap">

                    <h5 class="mb-0">
                        <i class="fas fa-user-shield me-2"></i>
                        Керування командою
                    </h5>

                    <button
                        type="button"
                        id="refreshTeamManagementBtn"
                        class="btn btn-outline-light btn-sm">
                        <i class="fas fa-sync-alt me-1"></i>
                        Оновити
                    </button>
                </div>

                <div class="card-body">

                    <div id="teamLeaveSection"></div>

                    <div id="teamInvitationsSection"></div>

                </div>
            </div>
        `);

        $("#playersTab .card").first().after(panel);
    }

    function renderManagementPanel(permissions) {
        const showPanel =
            permissions.canManage ||
            permissions.canLeave;

        if (!showPanel) {
            $("#teamManagementPanel").remove();
            return;
        }

        ensureManagementPanel();

        const leaveSection = $("#teamLeaveSection");

        if (permissions.canLeave) {
            leaveSection.html(`
                <div class="d-flex justify-content-between
                            align-items-center flex-wrap
                            gap-3 mb-3">

                    <div>
                        <h6 class="mb-1">Участь у команді</h6>
                        <p class="small text-muted mb-0">
                            Ви можете самостійно
                            покинути команду.
                        </p>
                    </div>

                    <button
                        type="button"
                        class="btn btn-outline-danger"
                        data-team-action="leave-team">
                        <i class="fas fa-sign-out-alt me-1"></i>
                        Покинути команду
                    </button>
                </div>
            `);
        } else {
            leaveSection.empty();
        }

        if (!permissions.canManage) {
            $("#teamInvitationsSection").empty();
            $("#refreshTeamManagementBtn").hide();
            return;
        }

        $("#refreshTeamManagementBtn").show();

        const invitations = [...state.invitations]
            .sort((a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
            );

        const rows = invitations.map((invitation, index) => {
            const status = String(
                invitation.status ?? "Pending"
            );

            const isPending =
                status.toLowerCase() === "pending";

            const role = String(
                invitation.role ?? "Player"
            );

            const roleLabel =
                roleNames[role] || role;

            const statusLabel =
                statusNames[status] || status;

            const badgeClass = isPending
                ? "bg-warning text-dark"
                : status === "Accepted"
                    ? "bg-success"
                    : "bg-secondary";

            const date = invitation.createdAt
                ? new Date(invitation.createdAt)
                    .toLocaleDateString("uk-UA")
                : "";

            return `
                <div class="list-group-item
                            d-flex align-items-center
                            justify-content-between gap-3
                            flex-wrap">

                    <div>
                        <div class="fw-semibold">
                            Запрошений користувач
                            <span class="text-muted small">
                                №${index + 1}
                            </span>
                        </div>

                        <div class="small text-muted">
                            Роль: ${html(roleLabel)}
                            ${date ? ` · ${html(date)}` : ""}
                        </div>

                        <span class="badge ${badgeClass} mt-1">
                            ${html(statusLabel)}
                        </span>
                    </div>

                    ${isPending ? `
                        <button
                            type="button"
                            class="btn btn-outline-danger btn-sm"
                            data-team-action="cancel-invitation"
                            data-invitation-id="${
                                html(invitation.id)
                            }">
                            <i class="fas fa-times me-1"></i>
                            Скасувати
                        </button>
                    ` : ""}
                </div>
            `;
        }).join("");

        $("#teamInvitationsSection").html(`
            <h6 class="mb-3">
                <i class="fas fa-envelope me-2"></i>
                Надіслані запрошення
            </h6>

            <div class="list-group">
                ${rows || `
                    <div class="text-center text-muted py-3">
                        Запрошень поки немає
                    </div>
                `}
            </div>
        `);
    }

    async function loadTeamMembers() {
        const team = getTeam();

        if (!team?.id) return;

        state.teamId = team.id;

        $("#playersList").html(`
            <div class="col-12 text-center py-4">
                <div class="spinner-border text-primary"></div>
                <p class="text-muted mt-2">
                    Завантаження складу...
                </p>
            </div>
        `);

        try {
            const members = await window.teamsApi.getMembers(
                state.teamId
            );

            if (!Array.isArray(members)) {
                throw new Error(
                    "Некоректна відповідь API учасників"
                );
            }

            state.members = members;
            state.invitations = [];

            const permissions = getPermissions();

            if (permissions.canManage) {
                try {
                    const invitations =
                        await window.teamsApi
                            .getTeamInvitations(state.teamId);

                    state.invitations = Array.isArray(invitations)
                        ? invitations
                        : [];

                } catch (error) {
                    console.error(
                        "Не вдалося отримати запрошення:",
                        error
                    );

                    notify(
                        "Не вдалося оновити список запрошень",
                        "warning"
                    );
                }
            }

            renderMembers();

        } catch (error) {
            console.error(
                "Помилка завантаження учасників:",
                error
            );

            $("#playersList").html(`
                <div class="col-12">
                    <div class="alert alert-danger">
                        Не вдалося завантажити склад команди.
                    </div>
                </div>
            `);
        }
    }

    async function changeRole(userId) {
        const permissions = getPermissions();

        if (!permissions.canChangeRoles) return;

        const member = state.members.find(
            m => String(m.userId) === String(userId)
        );

        if (!member ||
            String(userId) === String(getTeam().ownerId)) {
            return;
        }

        const select = $(".team-member-role").filter(
            function () {
                return $(this).attr("data-user-id") ===
                    String(userId);
            }
        );

        const role = select.val();

        if (!roleNames[role]) return;

        if (normalizeRole(member.role) ===
            normalizeRole(role)) {
            notify("Роль уже встановлена", "info");
            return;
        }

        if (!confirm(
            `Змінити роль користувача на «${roleNames[role]}»?`
        )) {
            return;
        }

        await apiPatch(
            teamUrl(
                `/members/${encodeURIComponent(userId)}`
            ),
            { role }
        );

        notify("Роль учасника змінено");
    }

    async function removeMember(userId) {
        const permissions = getPermissions();

        if (!permissions.canManage) return;

        const member = state.members.find(
            m => String(m.userId) === String(userId)
        );

        if (!member ||
            String(userId) === String(getTeam().ownerId) ||
            String(userId) === permissions.userId) {
            return;
        }

        if (!confirm(
            `Видалити ${memberName(member)} з команди?`
        )) {
            return;
        }

        await apiDelete(
            teamUrl(
                `/members/${encodeURIComponent(userId)}`
            )
        );

        notify("Учасника видалено з команди");
    }

    async function leaveTeam() {
        const permissions = getPermissions();

        if (!permissions.canLeave) return;

        if (!confirm(
            "Ви впевнені, що хочете покинути команду?"
        )) {
            return;
        }

        await window.teamsApi.post(
            teamUrl("/leave"),
            {}
        );

        notify("Ви покинули команду");

        window.location.href = "/pages/teams.html";
    }

    async function cancelInvitation(invitationId) {
        const permissions = getPermissions();

        if (!permissions.canManage) return;

        const invitation = state.invitations.find(
            i => String(i.id) === String(invitationId)
        );

        if (!invitation ||
            String(invitation.status).toLowerCase() !==
            "pending") {
            return;
        }

        if (!confirm(
            "Скасувати це запрошення?"
        )) {
            return;
        }

        await apiPatch(
            `${window.teamsApi.url}/invitations/${
                encodeURIComponent(invitationId)
            }/cancel`
        );

        notify("Запрошення скасовано");
    }

    async function performAction(action, button) {
        if (state.busy) return;

        const userId = button.attr("data-user-id");
        const invitationId = button.attr(
            "data-invitation-id"
        );

        setBusy(true);

        try {
            switch (action) {
                case "save-role":
                    await changeRole(userId);
                    break;

                case "remove-member":
                    await removeMember(userId);
                    break;

                case "leave-team":
                    await leaveTeam();
                    return;

                case "cancel-invitation":
                    await cancelInvitation(invitationId);
                    break;

                default:
                    return;
            }

            await loadTeamMembers();

        } catch (error) {
            console.error(
                "Помилка керування командою:",
                error
            );

            notify(
                error.message ||
                "Не вдалося виконати операцію",
                "error"
            );
        } finally {
            setBusy(false);
        }
    }

    $(document).ready(function () {
        $(document)
            .off("click.teamManagement", "[data-team-action]")
            .on(
                "click.teamManagement",
                "[data-team-action]",
                function (event) {
                    event.preventDefault();

                    performAction(
                        $(this).attr("data-team-action"),
                        $(this)
                    );
                }
            );

        $(document)
            .off(
                "click.teamManagementRefresh",
                "#refreshTeamManagementBtn"
            )
            .on(
                "click.teamManagementRefresh",
                "#refreshTeamManagementBtn",
                () => loadTeamMembers()
            );
    });

    window.loadTeamMembers = loadTeamMembers;
})();
