"use strict";
let currentSport =
    localStorage.getItem("selectedSport") || "all";

let allTeams = [];

$(document).ready(function () {
    updateAuthUI();
    bindEvents();
    bindSportChanges();
    loadTeams();
});

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function updateAuthUI() {
    const token = localStorage.getItem("accessToken");

    let user = {};

    try {
        user = JSON.parse(
            localStorage.getItem("user") || "{}"
        );
    } catch {
        user = {};
    }

    const loggedIn = Boolean(
        token && (user.id || user.email)
    );

    $("#createTeamBtn").toggle(loggedIn);
}

function bindSportChanges() {
    window.addEventListener(
        "sporthub:sport-changed",
        async event => {
            currentSport =
                event.detail?.sport || "all";

            await loadTeams();
        }
    );

    window.addEventListener("storage", event => {
        if (event.key !== "selectedSport") return;

        currentSport = event.newValue || "all";
        loadTeams();
    });
}

async function loadTeams() {
    const container = $("#teamsList");

    container.html(`
        <div class="col-12 text-center text-muted py-5">
            <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
            <p>Завантаження команд...</p>
        </div>
    `);

    try {
        const response = currentSport === "all"
            ? await window.teamsApi.getAll()
            : await window.teamsApi.getBySport(currentSport);

        allTeams = Array.isArray(response)
            ? response
            : Array.isArray(response?.items)
                ? response.items
                : [];

        filterAndDisplayTeams();

    } catch (error) {
        console.error(
            "Error loading teams:",
            error
        );

        container.html(`
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-triangle
                          fa-2x text-danger mb-3"></i>
                <p>Не вдалося завантажити команди.</p>
                <button
                    type="button"
                    class="btn btn-outline-primary"
                    id="retryTeamsBtn">
                    Повторити
                </button>
            </div>
        `);

        $("#retryTeamsBtn").on("click", loadTeams);
    }
}

function filterAndDisplayTeams() {
    const search = String(
        $("#teamSearchInput").val() || ""
    ).trim().toLowerCase();

    const filtered = allTeams.filter(team => {
        const name = String(
            team.teamName || ""
        ).toLowerCase();

        return name.includes(search);
    });

    displayTeams(filtered);
}

function displayTeams(teams) {
    const container = $("#teamsList");

    if (!teams.length) {
        container.html(`
            <div class="col-12 text-center text-muted py-5">
                <i class="fas fa-users fa-2x mb-3"></i>
                <p>Команд не знайдено</p>
            </div>
        `);
        return;
    }

    container.html(
        teams.map(team => `
            <div class="col-md-6 col-xl-4">
                <article
                    class="card team-card h-100"
                    data-id="${escapeHtml(team.id)}"
                    tabindex="0"
                    role="link"
                    aria-label="Переглянути команду ${escapeHtml(team.teamName)}">

                    <div class="card-body text-center">

                        <div class="team-logo rounded-circle
                                    d-flex align-items-center
                                    justify-content-center
                                    mx-auto mb-3"
                             style="width:76px;height:76px">

                            <i class="fas fa-users fa-2x text-white"></i>
                        </div>

                        <div class="d-flex justify-content-between
                                    align-items-start gap-2 mb-2">

                            <h2 class="h5 card-title mb-0">
                                ${escapeHtml(
                                    team.teamName || "Без назви"
                                )}
                            </h2>

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-warning
                                       save-team-btn"
                                data-id="${escapeHtml(team.id)}"
                                aria-label="Додати або видалити з обраного">

                                <i class="far fa-bookmark"></i>
                            </button>
                        </div>

                        <p class="card-text small text-muted">
                            ${escapeHtml(
                                String(team.teamDescription || "")
                                    .substring(0, 110)
                            )}
                        </p>

                        <div class="d-flex justify-content-between
                                    align-items-center mt-3">

                            <span class="badge bg-secondary">
                                ${escapeHtml(
                                    team.sportName || "Спорт"
                                )}
                            </span>

                            <small class="text-warning">
                                <i class="fas fa-star me-1"></i>
                                ${escapeHtml(
                                    team.popularityScore || 0
                                )}
                            </small>
                        </div>
                    </div>
                </article>
            </div>
        `).join("")
    );
}

function bindEvents() {
    $("#teamSearchInput").on(
        "input",
        filterAndDisplayTeams
    );

    $("#createTeamBtn").on("click", function () {
        const modalElement =
            document.getElementById("createTeamModal");

        bootstrap.Modal.getOrCreateInstance(
            modalElement
        ).show();
    });

    $("#submitTeamBtn").on(
        "click",
        createTeam
    );

    $("#teamsList").on(
        "click",
        ".team-card",
        function (event) {
            if ($(event.target).closest(
                ".save-team-btn"
            ).length) {
                return;
            }

            const id = $(this).attr("data-id");

            if (id) {
                window.location.href =
                    `/pages/team-details.html?id=${
                        encodeURIComponent(id)
                    }`;
            }
        }
    );

    $("#teamsList").on(
        "keydown",
        ".team-card",
        function (event) {
            if (
                event.target !== this ||
                !["Enter", " "].includes(event.key)
            ) {
                return;
            }

            event.preventDefault();

            const id = $(this).attr("data-id");

            if (id) {
                window.location.href =
                    `/pages/team-details.html?id=${
                        encodeURIComponent(id)
                    }`;
            }
        }
    );

    $("#teamsList").on(
        "click",
        ".save-team-btn",
        async function (event) {
            event.stopPropagation();

            const id = $(this).attr("data-id");

            if (!id) return;

            await toggleSaveTeam(id, $(this));
        }
    );
}

async function toggleSaveTeam(id, button) {
    if (!localStorage.getItem("accessToken")) {
        showNotification(
            "Увійдіть, щоб зберігати команди",
            "warning"
        );
        window.location.href = "/pages/login.html";
        return;
    }

    button.prop("disabled", true);

    try {
        const saved =
            await window.savedItemsApi.getUserSavedItems();

        const isSaved = (
            saved?.savedTeams || []
        ).some(item =>
            String(typeof item === "object" ? item.id : item)
            === String(id)
        );

        if (isSaved) {
            await window.savedItemsApi.removeSavedTeam(id);

            button.html(
                '<i class="far fa-bookmark"></i>'
            );

            showNotification(
                "Команду видалено з обраного",
                "info"
            );
        } else {
            await window.savedItemsApi.saveTeam(id);

            button.html(
                '<i class="fas fa-bookmark"></i>'
            );

            showNotification(
                "Команду додано до обраного",
                "success"
            );
        }

    } catch (error) {
        console.error(error);

        showNotification(
            "Не вдалося оновити обране",
            "error"
        );

    } finally {
        button.prop("disabled", false);
    }
}

async function createTeam() {
    const form = $("#createTeamForm");

    const teamName = String(
        form.find('[name="teamName"]').val() || ""
    ).trim();

    const teamDescription = String(
        form.find('[name="teamDescription"]').val() || ""
    ).trim();

    const sportName =
        $("#teamSportSelect").val();

    if (!teamName) {
        showNotification(
            "Введіть назву команди",
            "warning"
        );
        return;
    }

    const data = {
        teamName,
        teamDescription,
        sportName
    };

    const button = $("#submitTeamBtn");

    button.prop("disabled", true).html(`
        <i class="fas fa-spinner fa-spin me-2"></i>
        Створення...
    `);

    try {
        await window.teamsApi.create(data);

        const modalElement =
            document.getElementById("createTeamModal");

        bootstrap.Modal.getOrCreateInstance(
            modalElement
        ).hide();

        form[0].reset();

        showNotification(
            "Команду успішно створено",
            "success"
        );

        await loadTeams();

    } catch (error) {
        console.error(error);

        showNotification(
            "Не вдалося створити команду: " +
            error.message,
            "error"
        );

    } finally {
        button.prop("disabled", false)
            .html("Створити");
    }
}
