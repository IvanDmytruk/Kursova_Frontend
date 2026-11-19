(function () {
    "use strict";

    let currentSport =
        localStorage.getItem("selectedSport") || "all";

    let allTeams = [];
    let searchTerm = "";

    const $list = () => $("#teamsList");

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function isAuthenticated() {
        return Boolean(localStorage.getItem("accessToken"));
    }

    function normalizeTeams(response) {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.items)) return response.items;
        return [];
    }

    function showMessage(message, type = "secondary") {
        $list().html(`
            <div class="col-12">
                <div class="text-center p-5">
                    <div class="text-${type}">
                        ${escapeHtml(message)}
                    </div>
                </div>
            </div>
        `);
    }

    function updateCreateButton() {
        $("#createTeamBtn").toggle(isAuthenticated());
    }

    function getFilteredTeams() {
        return allTeams.filter(team => {
            const sportMatches =
                currentSport === "all" ||
                String(team.sportName).toLowerCase() ===
                currentSport.toLowerCase();

            const text = [
                team.teamName,
                team.teamDescription,
                team.sportName
            ].join(" ").toLowerCase();

            return sportMatches && text.includes(searchTerm);
        });
    }

    function renderTeams() {
        const teams = getFilteredTeams();

        if (!teams.length) {
            showMessage("Команд за обраними умовами не знайдено");
            return;
        }

        const html = teams.map(team => `
            <div class="col-md-6 col-xl-4">
                <article class="card team-card h-100"
                         data-team-id="${escapeHtml(team.id)}">

                    <div class="card-body">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <div class="team-avatar">
                                <i class="fas fa-users"></i>
                            </div>

                            <div class="flex-grow-1">
                                <h5 class="card-title mb-1">
                                    ${escapeHtml(team.teamName)}
                                </h5>

                                <small class="text-muted">
                                    ${escapeHtml(team.sportName)}
                                </small>
                            </div>
                        </div>

                        <p class="card-text text-muted">
                            ${escapeHtml(
                                team.teamDescription ||
                                "Опис команди відсутній"
                            )}
                        </p>

                        <div class="d-flex justify-content-between
                                    align-items-center mt-3">
                            <span class="small text-muted">
                                Спортивна команда
                            </span>

                            <a class="btn btn-sm btn-outline-primary"
                               href="/pages/team-details.html?id=${encodeURIComponent(team.id)}">
                                Детальніше
                                <i class="fas fa-arrow-right ms-1"></i>
                            </a>
                        </div>
                    </div>
                </article>
            </div>
        `).join("");

        $list().html(html);
    }

    async function loadTeams() {
        showMessage("Завантаження команд...");

        try {
            const response = await window.teamsApi.getAll();

            allTeams = normalizeTeams(response);

            allTeams.sort((a, b) =>
                String(a.teamName).localeCompare(
                    String(b.teamName), "uk"
                )
            );

            renderTeams();
        } catch (error) {
            console.error("Помилка завантаження команд:", error);

            showMessage(
                "Не вдалося завантажити команди. " +
                "Перевірте підключення до Backend.",
                "danger"
            );
        }
    }

    function openCreateModal() {
        if (!isAuthenticated()) {
            window.location.href = "/pages/login.html";
            return;
        }

        const element =
            document.getElementById("createTeamModal");

        bootstrap.Modal
            .getOrCreateInstance(element)
            .show();
    }

    async function createTeam() {
        if (!isAuthenticated()) {
            window.location.href = "/pages/login.html";
            return;
        }

        const form = document.getElementById("createTeamForm");

        if (!form.reportValidity()) return;

        const formData = new FormData(form);

        const data = {
            teamName: String(
                formData.get("teamName") || ""
            ).trim(),

            teamDescription: String(
                formData.get("teamDescription") || ""
            ).trim(),

            sportName: String(
                formData.get("sportName") || ""
            )
        };

        if (data.teamName.length < 3) {
            alert("Назва команди має містити мінімум 3 символи");
            return;
        }

        const button = $("#submitTeamBtn");
        button.prop("disabled", true).text("Створення...");

        try {
            const nameCheck =
                await window.teamsApi.exists(data.teamName);

            if (nameCheck?.exists === true) {
                alert("Команда з такою назвою вже існує");
                return;
            }

            const created = await window.teamsApi.create(data);

            bootstrap.Modal
                .getOrCreateInstance(
                    document.getElementById("createTeamModal")
                )
                .hide();

            form.reset();

            if (created?.id) {
                window.location.href =
                    `/pages/team-details.html?id=` +
                    encodeURIComponent(created.id);
                return;
            }

            await loadTeams();

        } catch (error) {
            console.error("Помилка створення команди:", error);

            alert(
                "Не вдалося створити команду: " +
                (error.message || "Невідома помилка")
            );
        } finally {
            button.prop("disabled", false).text("Створити");
        }
    }

    function bindEvents() {
        $("#createTeamBtn").on("click", openCreateModal);

        $("#submitTeamBtn").on("click", createTeam);

        $("#teamSearchInput").on("input", function () {
            searchTerm = this.value.trim().toLowerCase();
            renderTeams();
        });

        window.addEventListener(
            "sporthub:sport-changed",
            event => {
                currentSport = event.detail.sport;
                renderTeams();
            }
        );

        if (!window.SportHubLayout) {
            $(document).on(
                "click",
                "#sportDropdownMenu [data-sport]",
                function (event) {
                    event.preventDefault();

                    currentSport = this.dataset.sport;

                    localStorage.setItem(
                        "selectedSport",
                        currentSport
                    );

                    $("#selectedSportName").text(
                        $(this).text().trim()
                    );

                    renderTeams();
                }
            );
        }
    }

    $(function () {
        updateCreateButton();
        bindEvents();
        loadTeams();
    });

    window.reloadTeams = loadTeams;
})();
