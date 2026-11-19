(function () {
    "use strict";

    const permissions = [
        { flag: 1, name: "ManageSchedule", label: "Календар" },
        { flag: 2, name: "ManageMatches", label: "Керування матчами" },
        { flag: 4, name: "ApproveResults", label: "Результати" },
        { flag: 8, name: "SetTechnicalResults", label: "Технічні результати" },
        { flag: 16, name: "DisqualifyTeams", label: "Дискваліфікації" },
        { flag: 32, name: "ManageParticipants", label: "Учасники" },
        { flag: 64, name: "ManagePlayerSanctions", label: "Санкції гравців" },
        { flag: 128, name: "ViewAuditLog", label: "Журнал аудиту" },
        { flag: 256, name: "ViewStaff", label: "Перегляд менеджерів" }
    ];

    const api = () => window.tournamentManagementApi;

    function getTournamentId() {
        return new URLSearchParams(
            window.location.search
        ).get("id");
    }

    function getUser() {
        try {
            return JSON.parse(localStorage.getItem("user") || "{}");
        } catch {
            return {};
        }
    }

    function isOrganizer(tournament) {
        const user = getUser();

        return !!localStorage.getItem("accessToken") &&
            String(user.id ?? user.Id ?? "") ===
            String(tournament.createdBy ?? tournament.CreatedBy ?? "");
    }

    function normalizePermissions(value) {
        if (Number.isInteger(value)) return value;

        if (typeof value === "string") {
            const number = Number(value);

            if (Number.isInteger(number)) return number;

            return value.split(",").reduce((total, name) => {
                const found = permissions.find(
                    p => p.name === name.trim()
                );

                return total | (found?.flag || 0);
            }, 0);
        }

        return 0;
    }

    function buildPermissionFields(container, selected = 0) {
        container.empty();

        permissions.forEach(permission => {
            const col = $('<div class="col-md-6"></div>');
            const label = $(
                '<label class="form-check d-flex gap-2"></label>'
            );

            const input = $('<input>', {
                type: "checkbox",
                class: "form-check-input manager-permission",
                value: permission.flag
            });

            input.prop(
                "checked",
                (selected & permission.flag) === permission.flag
            );

            label.append(
                input,
                $("<span>", {
                    class: "form-check-label",
                    text: permission.label
                })
            );

            col.append(label);
            container.append(col);
        });
    }

    function collectPermissions(container) {
        let result = 0;

        container.find("input:checked").each(function () {
            result |= Number(this.value);
        });

        return result;
    }

    function errorMessage(error) {
        return error?.message || "Невідома помилка";
    }

    async function loadManagers() {
        const id = getTournamentId();
        if (!id) return;

        const container = $("#tournamentManagersList");
        container.text("Завантаження...");

        try {
            const response = await api().getManagers(id);

            const managers = Array.isArray(response)
                ? response
                : response?.items || [];

            container.empty();

            const active = managers.filter(
                manager => manager.isActive !== false
            );

            if (!active.length) {
                container.append(
                    $("<p>", {
                        class: "text-muted",
                        text: "Менеджерів поки не призначено."
                    })
                );
                return;
            }

            active.forEach(manager => {
                const userId = String(
                    manager.userId ?? manager.UserId ?? ""
                );

                const currentFlags = normalizePermissions(
                    manager.permissions ?? manager.Permissions
                );

                const card = $(
                    '<div class="border rounded p-3 mb-3"></div>'
                );

                card.append(
                    $("<strong>").text(`Користувач: ${userId}`)
                );

                const fields = $('<div class="row g-2 my-2"></div>');

                buildPermissionFields(fields, currentFlags);
                card.append(fields);

                const actions = $(
                    '<div class="d-flex flex-wrap gap-2"></div>'
                );

                const save = $("<button>", {
                    class: "btn btn-sm btn-outline-primary",
                    type: "button",
                    text: "Зберегти права"
                });

                save.on("click", async function () {
                    const selected = collectPermissions(fields);

                    save.prop("disabled", true);

                    try {
                        await api().updateManagerPermissions(
                            id,
                            userId,
                            selected
                        );

                        await loadManagers();
                    } catch (error) {
                        alert(
                            "Не вдалося змінити права: " +
                            errorMessage(error)
                        );
                    } finally {
                        save.prop("disabled", false);
                    }
                });

                const remove = $("<button>", {
                    class: "btn btn-sm btn-outline-danger",
                    type: "button",
                    text: "Відкликати призначення"
                });

                remove.on("click", async function () {
                    if (!confirm(
                        "Відкликати права цього менеджера?"
                    )) return;

                    remove.prop("disabled", true);

                    try {
                        await api().removeManager(id, userId);
                        await loadManagers();
                    } catch (error) {
                        alert(
                            "Не вдалося відкликати призначення: " +
                            errorMessage(error)
                        );

                        remove.prop("disabled", false);
                    }
                });

                actions.append(save, remove);
                card.append(actions);
                container.append(card);
            });

        } catch (error) {
            container.text(
                "Не вдалося завантажити менеджерів: " +
                errorMessage(error)
            );
        }
    }

    async function initialize() {
        const id = getTournamentId();
        if (!id || !api()) return;

        try {
            const tournament = await window.tournamentsApi
                .getById(id);

            if (!isOrganizer(tournament)) return;

            $("#tournamentStaffSection").show();

            const fields = $("#managerPermissionFields");
            buildPermissionFields(fields, 2 | 4 | 256);

            await loadManagers();

        } catch (error) {
            console.warn(
                "Не вдалося ініціалізувати керування менеджерами:",
                error
            );
        }
    }

    $(document).on(
        "submit",
        "#assignManagerForm",
        async function (event) {
            event.preventDefault();

            const userId = $("#managerUserId").val().trim();
            const selectedPermissions = collectPermissions(
                $("#managerPermissionFields")
            );

            if (!userId) {
                alert("Введіть ID користувача");
                return;
            }

            const submit = $("#assignManagerBtn");
            submit.prop("disabled", true);

            try {
                await api().assignManager(
                    getTournamentId(),
                    userId,
                    selectedPermissions
                );

                $("#managerUserId").val("");

                await loadManagers();
            } catch (error) {
                alert(
                    "Помилка призначення: " +
                    errorMessage(error)
                );
            } finally {
                submit.prop("disabled", false);
            }
        }
    );

    $(document).on(
        "click",
        "#reloadTournamentStaff",
        loadManagers
    );

    $(initialize);
})();
