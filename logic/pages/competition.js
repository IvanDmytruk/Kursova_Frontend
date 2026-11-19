(function () {
    "use strict";

    let busy = false;

    const P = Object.freeze({
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

    const statusNames = {
        Draft: "Чернетка",
        Registration: "Реєстрація",
        Ready: "Готовий",
        InProgress: "Триває",
        Completed: "Завершено",
        Cancelled: "Скасовано"
    };

    const formatNames = {
        OlympicSystem: "Олімпійська система",
        RoundRobin: "Коловий турнір",
        SwissSystem: "Швейцарська система",
        Cs2SwissSystem: "CS2 Swiss",
        GroupStage: "Груповий етап",
        DoubleElimination: "Double Elimination"
    };

    let access = {
        organizer: false,
        permissions: 0
    };

    function currentUser() {
        try {
            return JSON.parse(
                localStorage.getItem("user") || "{}"
            );
        } catch {
            return {};
        }
    }

    function hasPermission(permission) {
        return access.organizer ||
            (access.permissions & permission) === permission;
    }

    function getPermissions(value) {
        if (typeof value === "number") return value;

        if (typeof value === "string") {
            const numeric = Number(value);
            if (Number.isInteger(numeric)) return numeric;

            return value.split(",").reduce((flags, name) => {
                return flags | (P[name.trim()] || 0);
            }, 0);
        }

        return 0;
    }

    async function loadAccess(tournament) {
        access = {
            organizer: false,
            permissions: 0
        };

        const user = currentUser();
        const userId = String(user.id ?? user.Id ?? "");

        const organizerId = String(
            tournament.createdBy ?? tournament.CreatedBy ?? ""
        );

        const authenticated =
            Boolean(localStorage.getItem("accessToken"));

        access.organizer = authenticated &&
            !!userId &&
            userId === organizerId;

        if (access.organizer || !authenticated || !userId) {
            return;
        }

        if (!window.tournamentManagementApi) return;

        try {
            const staff = await window.tournamentManagementApi
                .getManagers(tournament.id);

            const entries = Array.isArray(staff)
                ? staff
                : staff?.items || [];

            const ownRecord = entries.find(item =>
                String(item.userId ?? item.UserId) === userId &&
                item.isActive !== false
            );

            if (ownRecord) {
                access.permissions = getPermissions(
                    ownRecord.permissions ?? ownRecord.Permissions
                );
            }
        } catch (error) {
            console.debug(
                "Неможливо отримати список менеджерів:",
                error.message
            );
        }
    }

    function getTeamMap(tournament) {
        return new Map(
            (tournament.tournamentParticipants || []).map(team => [
                String(team.id),
                team.teamName || team.name || "Учасник"
            ])
        );
    }

    function button(label, callback, className = "btn-primary") {
        return $("<button>", {
            type: "button",
            class: `btn btn-sm ${className}`,
            text: label
        }).on("click", callback);
    }

    async function executeAction(callback, confirmation = null) {
        if (busy) return;

        if (confirmation && !window.confirm(confirmation)) {
            return;
        }

        busy = true;
        $("#competitionActions button, .save-match-result")
            .prop("disabled", true);

        try {
            await callback();
            showSuccess("Операцію виконано");

            if (typeof window.loadTournamentDetails === "function") {
                await window.loadTournamentDetails();
            } else {
                window.location.reload();
            }
        } catch (error) {
            showError(error.message || "Не вдалося виконати дію");
        } finally {
            busy = false;
            $("#competitionActions button, .save-match-result")
                .prop("disabled", false);
        }
    }

    function renderActions(tournament) {
        const panel = $("#competitionOwnerPanel");
        const actions = $("#competitionActions").empty();

        const id = tournament.id;
        const status = tournament.status;
        const type = tournament.tournamentType;

        const canSchedule = hasPermission(P.ManageSchedule);

        function addAction(label, handler, confirmation) {
            actions.append(
                button(label, () => executeAction(
                    handler,
                    confirmation
                ))
            );
        }

        function addStatusAction(nextStatus, label) {
            if (!access.organizer) return;

            actions.append(
                button(
                    label,
                    () => executeAction(
                        () => tournamentsApi.changeStatus(
                            id, nextStatus
                        ),
                        `Змінити статус на "${statusNames[nextStatus]}"?`
                    ),
                    "btn-outline-primary"
                )
            );
        }

        if (status === "Draft") {
            addStatusAction(
                "Registration",
                "Відкрити реєстрацію"
            );
        }

        if (status === "Registration") {
            addStatusAction(
                "Ready",
                "Завершити реєстрацію"
            );
        }

        if (canSchedule && status === "Ready") {
            const generators = {
                OlympicSystem: [
                    "Згенерувати олімпійську сітку",
                    () => tournamentsApi.generateOlympicFirstRound(id)
                ],
                RoundRobin: [
                    "Згенерувати календар",
                    () => matchesApi.generateRoundRobin(id)
                ],
                SwissSystem: [
                    "Згенерувати Swiss раунд",
                    () => matchesApi.generateSwissRound(id)
                ],
                Cs2SwissSystem: [
                    "Згенерувати CS2 Swiss раунд",
                    () => matchesApi.generateSwissRound(id)
                ],
                GroupStage: [
                    "Згенерувати груповий етап",
                    () => matchesApi.generateGroupStage(id)
                ],
                DoubleElimination: [
                    "Згенерувати Double Elimination",
                    () => matchesApi.generateDoubleEliminationRound(id)
                ]
            };

            const generator = generators[type];

            if (generator) {
                addAction(
                    generator[0],
                    generator[1],
                    "Згенерувати матчі турніру?"
                );
            }
        }

        if (canSchedule && status === "InProgress") {
            const nextRound = {
                OlympicSystem: [
                    "Наступний раунд Olympic",
                    () => tournamentsApi.generateOlympicNextRound(id)
                ],
                SwissSystem: [
                    "Наступний раунд Swiss",
                    () => matchesApi.generateSwissRound(id)
                ],
                Cs2SwissSystem: [
                    "Наступний раунд CS2 Swiss",
                    () => matchesApi.generateSwissRound(id)
                ],
                DoubleElimination: [
                    "Наступний раунд Double Elimination",
                    () => matchesApi.generateDoubleEliminationRound(id)
                ]
            };

            if (nextRound[type]) {
                addAction(
                    nextRound[type][0],
                    nextRound[type][1],
                    "Переконайтеся, що результати поточного раунду внесені. Продовжити?"
                );
            }
        }

        if (status === "InProgress") {
            addStatusAction("Completed", "Завершити турнір");
        }

        if (["Draft", "Registration", "Ready", "InProgress"]
            .includes(status)) {
            addStatusAction("Cancelled", "Скасувати турнір");
        }

        panel.toggle(actions.children().length > 0);
    }

    function renderMatches(tournament, matches) {
        const container = $("#competitionMatches").empty();
        const names = getTeamMap(tournament);

        if (!matches.length) {
            container.append(
                $("<p>", {
                    class: "text-muted",
                    text: "Матчів поки немає."
                })
            );
            return;
        }

        const rounds = new Map();

        matches.forEach(match => {
            const round = Number(match.roundNumber) || 0;

            if (!rounds.has(round)) {
                rounds.set(round, []);
            }

            rounds.get(round).push(match);
        });

        const orderedRounds = [...rounds.keys()]
            .sort((a, b) => a - b);

        orderedRounds.forEach(round => {
            const section = $('<section class="mb-4"></section>');

            section.append(
                $("<h6>", {
                    class: "mb-3",
                    text: round ? `Раунд ${round}` : "Матчі"
                })
            );

            const orderedMatches = rounds.get(round).sort(
                (a, b) => {
                    const first = Date.parse(a.startTime || "") || 0;
                    const second = Date.parse(b.startTime || "") || 0;
                    return first - second;
                }
            );

            orderedMatches.forEach(match => {
                const homeName =
                    names.get(String(match.homeTeamId)) ||
                    (match.homeTeamId ? "Учасник" : "BYE");

                const awayName =
                    names.get(String(match.awayTeamId)) ||
                    (match.awayTeamId ? "Учасник" : "BYE");

                const card = $(
                    '<div class="border rounded p-3 mb-2"></div>'
                );

                const heading = $(
                    '<div class="d-flex flex-wrap justify-content-between gap-2"></div>'
                );

                heading.append(
                    $("<strong>").text(
                        `${homeName} — ${awayName}`
                    )
                );

                heading.append(
                    $("<span>", {
                        class: "small text-muted",
                        text:
                            `${match.homeScore ?? "—"} : ` +
                            `${match.awayScore ?? "—"} · ` +
                            `${match.status || "Очікується"}`
                    })
                );

                card.append(heading);

                if (match.startTime) {
                    const time = new Date(match.startTime);

                    if (!Number.isNaN(time.getTime())) {
                        card.append(
                            $("<div>", {
                                class: "small text-muted mt-1",
                                text: time.toLocaleString("uk-UA")
                            })
                        );
                    }
                }

                const canEdit =
                    hasPermission(P.ApproveResults) &&
                    !["Completed", "Cancelled"].includes(
                        tournament.status
                    ) &&
                    !match.isAutomatic &&
                    !!match.homeTeamId &&
                    !!match.awayTeamId;

                if (canEdit) {
                    const controls = $(
                        '<div class="d-flex flex-wrap gap-2 align-items-center mt-3"></div>'
                    );

                    const homeScore = $(
                        '<input type="number" min="0" step="1" ' +
                        'class="form-control form-control-sm" ' +
                        'style="width:85px">'
                    ).val(match.homeScore ?? "");

                    const awayScore = $(
                        '<input type="number" min="0" step="1" ' +
                        'class="form-control form-control-sm" ' +
                        'style="width:85px">'
                    ).val(match.awayScore ?? "");

                    homeScore.attr("aria-label", "Рахунок господарів");
                    awayScore.attr("aria-label", "Рахунок гостей");

                    const save = button(
                        "Зберегти результат",
                        () => {
                            const h = Number(homeScore.val());
                            const a = Number(awayScore.val());

                            if (
                                homeScore.val() === "" ||
                                awayScore.val() === "" ||
                                !Number.isInteger(h) ||
                                !Number.isInteger(a) ||
                                h < 0 || a < 0
                            ) {
                                showError("Введіть коректний рахунок");
                                return;
                            }

                            executeAction(() =>
                                matchesApi.updateResult(
                                    match.id, h, a
                                )
                            );
                        },
                        "btn-outline-success"
                    ).addClass("save-match-result");

                    controls.append(
                        homeScore,
                        $("<span>").text(":"),
                        awayScore,
                        save
                    );

                    card.append(controls);
                }

                section.append(card);
            });

            container.append(section);
        });
    }

    async function renderStandings(tournament) {
        const container = $("#competitionStandings").empty();

        const supported = [
            "RoundRobin",
            "SwissSystem",
            "Cs2SwissSystem",
            "GroupStage"
        ];

        if (!supported.includes(tournament.tournamentType)) {
            return;
        }

        container.append(
            $("<h5>", { text: "Турнірна таблиця" })
        );

        try {
            const response = await tournamentsApi
                .getStandings(tournament.id);

            const rows = Array.isArray(response)
                ? response
                : response?.standings || response?.items || [];

            if (!rows.length) {
                container.append(
                    $("<p>", {
                        class: "text-muted",
                        text: "Таблиця ще не сформована."
                    })
                );
                return;
            }

            const table = $(`
                <table class="table table-striped
                              table-hover align-middle">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Учасник</th>
                            <th>І</th>
                            <th>В</th>
                            <th>Н</th>
                            <th>П</th>
                            <th>Очки</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            `);

            const names = getTeamMap(tournament);
            const tbody = table.find("tbody");

            rows.forEach((row, index) => {
                const tr = $("<tr>");

                const values = [
                    row.rank ?? row.position ?? index + 1,
                    row.teamName ??
                        row.participantName ??
                        names.get(String(
                            row.teamId ?? row.participantId
                        )) ?? "Учасник",
                    row.played ?? row.matchesPlayed ?? "—",
                    row.wins ?? "—",
                    row.draws ?? "—",
                    row.losses ?? "—",
                    row.points ?? row.totalPoints ?? "—"
                ];

                values.forEach(value => {
                    tr.append($("<td>").text(value));
                });

                tbody.append(tr);
            });

            container.append(
                $('<div class="table-responsive"></div>')
                    .append(table)
            );
        } catch (error) {
            container.append(
                $("<p>", {
                    class: "text-muted",
                    text: "Не вдалося завантажити таблицю: " +
                          error.message
                })
            );
        }
    }

    window.loadCompetition = async function (tournament) {
        if (!tournament?.id) return;

        $("#competitionSection").show();

        $("#competitionInfo").text(
            `${formatNames[tournament.tournamentType] ||
               tournament.tournamentType} · ` +
            `${statusNames[tournament.status] ||
               tournament.status}`
        );

        $("#competitionMatches").text("Завантаження матчів...");
        $("#competitionStandings").empty();
        $("#competitionOwnerPanel").hide();

        await loadAccess(tournament);

        renderActions(tournament);

        try {
            const response = await matchesApi
                .getByTournament(tournament.id);

            const matches = Array.isArray(response)
                ? response
                : response?.matches || response?.items || [];

            renderMatches(tournament, matches);
            await renderStandings(tournament);

        } catch (error) {
            $("#competitionMatches").text(
                "Не вдалося завантажити матчі: " +
                error.message
            );
        }
    };

    $(document).on("click", "#reloadCompetitionBtn", function () {
        if (typeof window.loadTournamentDetails === "function") {
            window.loadTournamentDetails();
        }
    });
})();
