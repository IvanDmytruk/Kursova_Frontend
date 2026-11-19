
(async () => {
    "use strict";

    const S = window.SHView;
    const get = S.get;
    const esc = S.esc;

    let tournament = null;
    let matches = [];
    let access = null;
    let busy = false;

    function showMessage(message, error = false) {
        const element = get("viewAlert");

        element.hidden = false;
        element.className = error
            ? "sh-error mb-3"
            : "alert alert-success mb-3";

        element.textContent = String(message);
    }

    function parseInteger(id, min, max) {
        const raw = String(get(id).value).trim();

        if (!/^\d+$/.test(raw)) {
            throw new Error(
                "Вкажіть невід'ємне ціле число."
            );
        }

        const value = Number(raw);

        if (
            !Number.isSafeInteger(value) ||
            value < min ||
            value > max
        ) {
            throw new Error(
                `Допустиме значення: від ${min} до ${max}.`
            );
        }

        return value;
    }

    function toUtc(id) {
        const raw = get(id).value;

        if (!raw) {
            throw new Error("Оберіть дату та час.");
        }

        const date = new Date(raw);

        if (Number.isNaN(date.getTime())) {
            throw new Error("Некоректна дата.");
        }

        if (date <= new Date()) {
            throw new Error(
                "Дата матчу має бути в майбутньому."
            );
        }

        return date.toISOString();
    }

    function toLocalInput(value) {
        if (!value) return "";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        const pad = n => String(n).padStart(2, "0");

        return (
            date.getFullYear() + "-" +
            pad(date.getMonth() + 1) + "-" +
            pad(date.getDate()) + "T" +
            pad(date.getHours()) + ":" +
            pad(date.getMinutes())
        );
    }

    function dateLabel(value) {
        if (!value) {
            return "Час не призначено";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Некоректна дата";
        }

        return new Intl.DateTimeFormat("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function matchName(match) {
        const home = S.nameOf(
            match.homeTeamId,
            tournament
        );

        const away = S.nameOf(
            match.awayTeamId,
            tournament
        );

        return `${home} — ${away}`;
    }

    function canEditMatch(match) {
        if (!match.homeTeamId || !match.awayTeamId) {
            return false;
        }

        const status = String(
            match.status || ""
        ).toLowerCase();

        return status !== "completed" &&
            status !== "cancelled";
    }

    function renderMatches() {
        const filter = get("scheduleFilter").value;

        const search = get("scheduleSearch")
            .value.trim().toLowerCase();

        const filtered = matches
            .filter(match => {
                if (
                    filter === "scheduled" &&
                    !match.startTime
                ) {
                    return false;
                }

                if (
                    filter === "unscheduled" &&
                    match.startTime
                ) {
                    return false;
                }

                return (
                    matchName(match).toLowerCase()
                        .includes(search) ||
                    String(match.matchName || "")
                        .toLowerCase()
                        .includes(search)
                );
            })
            .sort((a, b) => {
                if (a.startTime && b.startTime) {
                    return new Date(a.startTime) -
                        new Date(b.startTime);
                }

                if (a.startTime) return -1;
                if (b.startTime) return 1;

                return (a.roundNumber || 0) -
                    (b.roundNumber || 0);
            });

        const container = get("scheduleMatches");

        if (!filtered.length) {
            container.innerHTML = `
                <div class="sh-empty">
                    Матчів за вибраним фільтром немає.
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(match => {
            const editable = Boolean(
                access?.schedule && canEditMatch(match)
            );

            const hasScore =
                match.homeScore != null &&
                match.awayScore != null;

            return `
                <article class="sh-match-item">
                    <div>
                        <div class="sh-round-label">
                            Раунд ${esc(match.roundNumber ?? 0)}
                            ${
                                match.groupId
                                    ? " · Група " +
                                      esc(match.groupId)
                                    : ""
                            }
                        </div>

                        <div class="sh-match-teams">
                            ${esc(matchName(match))}
                        </div>

                        <div class="small text-muted mt-1">
                            <i class="far fa-clock me-1"></i>
                            ${esc(dateLabel(match.startTime))}
                        </div>
                    </div>

                    <div class="d-flex align-items-center gap-2
                                flex-wrap">

                        <span class="sh-score">
                            ${
                                hasScore
                                    ? esc(match.homeScore) +
                                      " : " +
                                      esc(match.awayScore)
                                    : "— : —"
                            }
                        </span>

                        ${
                            editable
                                ? `
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary"
                                    data-edit-match="${esc(match.id)}">
                                    Змінити час
                                </button>`
                                : ""
                        }
                    </div>
                </article>
            `;
        }).join("");
    }

    function populateMatchSelect() {
        const select = get("scheduleMatchId");

        const previous = select.value;

        const available = matches.filter(
            canEditMatch
        );

        select.innerHTML = available.map(match => `
            <option value="${esc(match.id)}">
                ${esc(matchName(match))}
                · раунд ${esc(match.roundNumber ?? 0)}
            </option>
        `).join("");

        if (available.some(match =>
            String(match.id) === previous
        )) {
            select.value = previous;
        }

        updateSelectedDate();
    }

    function updateSelectedDate() {
        const id = get("scheduleMatchId").value;

        const match = matches.find(
            x => String(x.id) === String(id)
        );

        get("scheduleStartTime").value =
            match?.startTime
                ? toLocalInput(match.startTime)
                : "";
    }

    function setControlsEnabled(enabled) {
        [
            "saveScheduleBtn",
            "generateScheduleBtn"
        ].forEach(id => {
            const element = get(id);
            if (element) {
                element.disabled = !enabled;
            }
        });
    }

    async function load() {
        try {
            if (!S.tournamentId) {
                throw new Error(
                    "Не вказано ID турніру."
                );
            }

            [tournament, matches] =
                await Promise.all([
                    S.loadTournament(),
                    window.matchesApi.getByTournament(
                        S.tournamentId
                    )
                ]);

            matches = S.list(matches);

            S.layout(
                tournament.tournamentName,
                "Календар матчів та управління часом"
            );

            access = await S.permissions(tournament);

            const allowed = Boolean(access?.schedule);

            get("scheduleManagement").hidden = !allowed;

            get("automaticScheduleSection").hidden =
                !allowed;

            get("viewBack").href =
                "/pages/tournament-details.html?id=" +
                encodeURIComponent(tournament.id);

            populateMatchSelect();
            renderMatches();

        } catch (error) {
            console.error(error);

            showMessage(
                error.message ||
                "Не вдалося завантажити календар.",
                true
            );
        }
    }

    get("scheduleFilter").addEventListener(
        "change",
        renderMatches
    );

    get("scheduleSearch").addEventListener(
        "input",
        renderMatches
    );

    get("scheduleMatchId").addEventListener(
        "change",
        updateSelectedDate
    );

    get("scheduleMatches").addEventListener(
        "click",
        event => {
            const button = event.target.closest(
                "[data-edit-match]"
            );

            if (!button || !access?.schedule) {
                return;
            }

            get("scheduleMatchId").value =
                button.dataset.editMatch;

            updateSelectedDate();

            get("scheduleManagement").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    );

    get("setMatchTimeForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (busy || !access?.schedule) return;

            try {
                const matchId =
                    get("scheduleMatchId").value;

                if (!matchId) {
                    throw new Error("Оберіть матч.");
                }

                const match = matches.find(
                    x => String(x.id) === String(matchId)
                );

                if (!match || !canEditMatch(match)) {
                    throw new Error(
                        "Цей матч не можна перепланувати."
                    );
                }

                const data = {
                    startTime: toUtc("scheduleStartTime"),
                    durationMinutes: parseInteger(
                        "scheduleDuration",
                        15,
                        1440
                    ),
                    reason: get("scheduleReason")
                        .value.trim()
                };

                if (data.reason.length > 500) {
                    throw new Error(
                        "Причина занадто довга."
                    );
                }

                if (!confirm(
                    "Зберегти дату та сповістити учасників?"
                )) {
                    return;
                }

                busy = true;
                setControlsEnabled(false);

                await window.tournamentScheduleApi
                    .setMatchTime(matchId, data);

                await load();

                showMessage(
                    "Дату матчу успішно збережено."
                );

            } catch (error) {
                console.error(error);

                showMessage(
                    error.message ||
                    "Не вдалося змінити час.",
                    true
                );

            } finally {
                busy = false;
                setControlsEnabled(true);
            }
        }
    );

    get("automaticScheduleForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (busy || !access?.schedule) return;

            try {
                const data = {
                    firstStartTime: toUtc(
                        "autoFirstStart"
                    ),
                    durationMinutes: parseInteger(
                        "autoDuration",
                        15,
                        1440
                    ),
                    breakMinutes: parseInteger(
                        "autoBreak",
                        0,
                        1440
                    ),
                    overwriteExisting:
                        get("autoOverwrite").checked
                };

                const text = data.overwriteExisting
                    ? "Усі доступні матчі можуть отримати " +
                      "нові дати. Продовжити?"
                    : "Призначити дати матчам без " +
                      "розкладу?";

                if (!confirm(text)) return;

                busy = true;
                setControlsEnabled(false);

                const result =
                    await window.tournamentScheduleApi
                        .generateSchedule(
                            S.tournamentId,
                            data
                        );

                await load();

                showMessage(
                    `Календар оновлено. Змінено матчів: ${
                        result?.updatedMatches ?? 0
                    }.`
                );

            } catch (error) {
                console.error(error);

                showMessage(
                    error.message ||
                    "Не вдалося сформувати календар.",
                    true
                );

            } finally {
                busy = false;
                setControlsEnabled(true);
            }
        }
    );

    get("viewReload").addEventListener(
        "click",
        load
    );

    await load();
})();
