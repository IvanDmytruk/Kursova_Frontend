
(async () => {
    "use strict";

    const S = window.SHView;
    const get = S.get;

    let tournament = null;
    let matches = [];
    let access = null;
    let saving = false;

    const requestedMatchId = S.qs.get("matchId");

    const emptyAccess = {
        results: false,
        technical: false,
        disqualify: false
    };

    function selectedMatch() {
        return matches.find(
            match => String(match.id) ===
                String(get("entryMatch").value)
        );
    }

    function showMessage(message, isError = false) {
        const alert = get("viewAlert");

        if (!alert) return;

        alert.hidden = false;
        alert.className = isError
            ? "sh-error mb-3"
            : "alert alert-success mb-3";

        alert.textContent = message;
    }

    function parseScore(value) {
        const text = String(value ?? "").trim();

        if (!/^\d+$/.test(text)) {
            return null;
        }

        const number = Number(text);

        if (!Number.isSafeInteger(number) ||
            number < 0 ||
            number > 2147483647) {
            return null;
        }

        return number;
    }

    function updateSelectedMatch() {
        const match = selectedMatch();

        if (!match) {
            get("entryMatchName").textContent =
                "Матч не вибрано";

            get("entryHome").value = "";
            get("entryAway").value = "";
            get("technicalWinner").innerHTML = "";
            return;
        }

        const homeName = S.nameOf(
            match.homeTeamId,
            tournament
        );

        const awayName = S.nameOf(
            match.awayTeamId,
            tournament
        );

        get("entryMatchName").textContent =
            `${homeName} — ${awayName}`;

        get("entryHome").value =
            match.homeScore ?? "";

        get("entryAway").value =
            match.awayScore ?? "";

        const participants = [
            [match.homeTeamId, homeName],
            [match.awayTeamId, awayName]
        ].filter(([id]) => Boolean(id));

        get("technicalWinner").innerHTML =
            participants.map(([id, name]) => `
                <option value="${S.esc(id)}">
                    ${S.esc(name)}
                </option>
            `).join("");
    }

    function setFormAccess() {
        const canEdit = Boolean(access?.results);
        const canTechnical = Boolean(access?.technical);

        get("entryHome").disabled = !canEdit;
        get("entryAway").disabled = !canEdit;

        get("entryActions").innerHTML = canEdit
            ? `
                <button
                    type="submit"
                    id="saveScore"
                    class="btn btn-primary">
                    Зберегти результат
                </button>
            `
            : `
                <p class="sh-muted">
                    Для зміни рахунку потрібен дозвіл
                    ApproveResults.
                </p>
            `;

        const technicalForm = get("technicalForm");

        technicalForm.querySelectorAll(
            "input, select, textarea, button"
        ).forEach(element => {
            element.disabled = !canTechnical;
        });

        updateTechnicalAccess();
    }

    function updateTechnicalAccess() {
        const selectedType = get("technicalType").value;

        const allowed = Boolean(access?.technical) &&
            (
                selectedType !== "Disqualification" ||
                Boolean(access?.disqualify)
            );

        const submit = get("saveTechnical");

        if (submit) {
            submit.disabled = !allowed || saving;
        }
    }

    async function load(preferredId = null) {
        try {
            const previousId =
                preferredId ||
                get("entryMatch").value ||
                requestedMatchId;

            [tournament, matches] = await Promise.all([
                S.loadTournament(),
                window.matchesApi.getByTournament(
                    S.tournamentId
                )
            ]);

            matches = S.list(matches);

            S.layout(
                tournament.tournamentName,
                "Внесення результатів"
            );

            access = await S.permissions(tournament);

            get("entryMatch").innerHTML =
                matches.map(match => `
                    <option value="${S.esc(match.id)}">
                        ${S.esc(
                            S.nameOf(
                                match.homeTeamId,
                                tournament
                            )
                        )}
                        —
                        ${S.esc(
                            S.nameOf(
                                match.awayTeamId,
                                tournament
                            )
                        )}
                        · раунд ${
                            S.esc(match.roundNumber ?? 0)
                        }
                    </option>
                `).join("");

            if (matches.some(match =>
                String(match.id) === String(previousId)
            )) {
                get("entryMatch").value = previousId;
            }

            updateSelectedMatch();
            setFormAccess();

            if (!matches.length) {
                showMessage(
                    "Для цього турніру ще немає матчів.",
                    true
                );
            }

        } catch (error) {
            console.error(error);
            access = emptyAccess;

            showMessage(
                error.message ||
                "Не вдалося завантажити матчі.",
                true
            );

            setFormAccess();
        }
    }

    get("entryMatch").addEventListener(
        "change",
        updateSelectedMatch
    );

    get("technicalType").addEventListener(
        "change",
        updateTechnicalAccess
    );

    get("resultForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (saving || !access?.results) return;

            const match = selectedMatch();
            if (!match) return;

            const home = parseScore(
                get("entryHome").value
            );

            const away = parseScore(
                get("entryAway").value
            );

            if (home === null || away === null) {
                showMessage(
                    "Заповніть обидва поля невід'ємними цілими числами.",
                    true
                );
                return;
            }

            if (!confirm(
                `Зберегти результат ${home}:${away}?`
            )) return;

            saving = true;

            const button = get("saveScore");
            if (button) button.disabled = true;

            try {
                await window.matchesApi.updateResult(
                    match.id,
                    home,
                    away
                );

                await load(match.id);

                showMessage(
                    "Результат матчу збережено."
                );

            } catch (error) {
                showMessage(error.message, true);

            } finally {
                saving = false;

                const currentButton = get("saveScore");

                if (currentButton) {
                    currentButton.disabled =
                        !access?.results;
                }
            }
        }
    );

    get("technicalForm").addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            if (saving || !access?.technical) return;

            const match = selectedMatch();
            if (!match) return;

            const resultType =
                get("technicalType").value;

            if (
                resultType === "Disqualification" &&
                !access.disqualify
            ) {
                showMessage(
                    "Недостатньо прав для дискваліфікації.",
                    true
                );
                return;
            }

            const winnerTeamId =
                get("technicalWinner").value;

            const reason =
                get("technicalReason").value.trim();

            if (reason.length < 5) {
                showMessage(
                    "Причина повинна містити мінімум 5 символів.",
                    true
                );
                return;
            }

            if (!winnerTeamId) {
                showMessage(
                    "Виберіть переможця.",
                    true
                );
                return;
            }

            const home = parseScore(
                get("entryHome").value
            );

            const away = parseScore(
                get("entryAway").value
            );

            if (home === null || away === null) {
                showMessage(
                    "Для технічного результату вкажіть обидва значення рахунку.",
                    true
                );
                return;
            }

            if (!confirm(
                "Підтвердити технічний результат?"
            )) return;

            saving = true;
            updateTechnicalAccess();

            try {
                await window.matchesApi.setTechnicalResult(
                    match.id,
                    {
                        resultType,
                        winnerTeamId,
                        reason,
                        homeScore: home,
                        awayScore: away
                    }
                );

                await load(match.id);

                showMessage(
                    "Технічний результат збережено."
                );

            } catch (error) {
                showMessage(error.message, true);

            } finally {
                saving = false;
                updateTechnicalAccess();
            }
        }
    );

    get("viewReload").addEventListener(
        "click",
        () => load()
    );

    await load();
})();
