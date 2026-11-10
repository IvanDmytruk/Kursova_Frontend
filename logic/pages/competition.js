
(function () {
    let busy = false;

    const statusLabels = {
        Draft: 'Чернетка',
        Registration: 'Реєстрація',
        Ready: 'Готовий',
        InProgress: 'Триває',
        Completed: 'Завершено',
        Cancelled: 'Скасовано'
    };

    function getTeamNames(tournament) {
        return new Map(
            (tournament.tournamentParticipants || []).map(team => [
                String(team.id),
                team.teamName || team.name || 'Учасник'
            ])
        );
    }

    function createButton(label, callback, style = 'btn-primary') {
        return $('<button type="button" class="btn btn-sm"></button>')
            .addClass(style)
            .text(label)
            .on('click', callback);
    }

    async function executeAction(callback, confirmation = null) {
        if (busy || (confirmation && !confirm(confirmation))) return;

        busy = true;
        $('#competitionActions button, .save-match-result')
            .prop('disabled', true);

        try {
            await callback();
            showSuccess('Операцію виконано');
            await loadTournamentDetails();
        } catch (error) {
            showError(error.message || 'Помилка виконання операції');
        } finally {
            busy = false;
            $('#competitionActions button, .save-match-result')
                .prop('disabled', false);
        }
    }

    function renderActions(tournament) {
        const panel = $('#competitionOwnerPanel');
        const actions = $('#competitionActions').empty();

        const canManage = isUserAdmin();
        panel.toggle(canManage);

        if (!canManage) return;

        const id = tournament.id;
        const status = tournament.status;
        const type = tournament.tournamentType;

        function addStatusButton(nextStatus, label) {
            actions.append(
                createButton(label, () => executeAction(
                    () => tournamentsApi.changeStatus(id, nextStatus),
                    `Змінити статус на "${statusLabels[nextStatus]}"?`
                ), 'btn-outline-primary')
            );
        }

        if (status === 'Draft') {
            addStatusButton('Registration', 'Відкрити реєстрацію');
        }

        if (status === 'Registration') {
            addStatusButton('Ready', 'Закрити реєстрацію');
        }

        if (status === 'Ready') {
            if (type === 'OlympicSystem') {
                actions.append(createButton(
                    'Згенерувати перший раунд',
                    () => executeAction(
                        () => tournamentsApi.generateOlympicFirstRound(id),
                        'Згенерувати олімпійську сітку?'
                    )
                ));
            }

            if (type === 'SwissSystem') {
                actions.append(createButton(
                    'Згенерувати перший раунд Swiss',
                    () => executeAction(
                        () => matchesApi.generateSwissRound(id),
                        'Згенерувати перший раунд Swiss?'
                    )
                ));
            }

            if (type === 'RoundRobin') {
                actions.append(createButton(
                    'Згенерувати календар',
                    () => executeAction(
                        () => matchesApi.generateRoundRobin(id),
                        'Згенерувати календар матчів?'
                    )
                ));
            }
        }

        if (status === 'InProgress') {
            if (type === 'OlympicSystem') {
                actions.append(createButton(
                    'Наступний раунд Olympic',
                    () => executeAction(
                        () => tournamentsApi.generateOlympicNextRound(id),
                        'Усі результати поточного раунду внесено?'
                    )
                ));
            }

            if (type === 'SwissSystem') {
                actions.append(createButton(
                    'Наступний раунд Swiss',
                    () => executeAction(
                        () => matchesApi.generateSwissRound(id),
                        'Усі результати поточного раунду внесено?'
                    )
                ));
            }

            if (type === 'SwissSystem' || type === 'RoundRobin') {
                addStatusButton('Completed', 'Завершити турнір');
            }
        }

        if (['Draft', 'Registration', 'Ready', 'InProgress']
            .includes(status)) {
            addStatusButton('Cancelled', 'Скасувати турнір');
        }

        if (!actions.children().length) {
            panel.hide();
        }
    }

    function renderMatches(tournament, matches) {
        const container = $('#competitionMatches').empty();
        const teamNames = getTeamNames(tournament);
        const canManage = isUserAdmin();

        if (!matches.length) {
            container.append(
                $('<p class="text-muted"></p>')
                    .text('Матчів поки немає.')
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

        [...rounds.keys()].sort((a, b) => a - b).forEach(round => {
            const section = $('<div class="mb-4"></div>');

            section.append(
                $('<h6 class="mb-3"></h6>')
                    .text(round ? `Раунд ${round}` : 'Матчі')
            );

            rounds.get(round).forEach(match => {
                const homeName = teamNames.get(String(match.homeTeamId))
                    || (match.homeTeamId ? 'Учасник' : 'BYE');

                const awayName = teamNames.get(String(match.awayTeamId))
                    || (match.awayTeamId ? 'Учасник' : 'BYE');

                const card = $('<div class="border rounded p-3 mb-2"></div>');

                const heading = $('<div class="d-flex flex-wrap justify-content-between gap-2"></div>');

                heading.append(
                    $('<strong></strong>')
                        .text(`${homeName} — ${awayName}`)
                );

                heading.append(
                    $('<span class="small text-muted"></span>')
                        .text(
                            `${match.homeScore ?? '—'} : ${match.awayScore ?? '—'} · ${match.status || 'Очікується'}`
                        )
                );

                card.append(heading);

                const canEditResult =
                    canManage &&
                    !['Completed', 'Cancelled'].includes(tournament.status) &&
                    !match.isAutomatic &&
                    match.homeTeamId &&
                    match.awayTeamId;

                if (canEditResult) {
                    const form = $('<div class="d-flex flex-wrap gap-2 align-items-center mt-2"></div>');

                    const homeInput = $('<input type="number" min="0" step="1" class="form-control form-control-sm" style="width:85px" aria-label="Рахунок господарів">')
                        .val(match.homeScore ?? '');

                    const awayInput = $('<input type="number" min="0" step="1" class="form-control form-control-sm" style="width:85px" aria-label="Рахунок гостей">')
                        .val(match.awayScore ?? '');

                    const saveButton = createButton(
                        'Зберегти рахунок',
                        () => {
                            const home = homeInput.val();
                            const away = awayInput.val();

                            if (
                                home === '' || away === '' ||
                                !Number.isInteger(Number(home)) ||
                                !Number.isInteger(Number(away)) ||
                                Number(home) < 0 || Number(away) < 0
                            ) {
                                showError('Введи коректний рахунок');
                                return;
                            }

                            executeAction(() => matchesApi.updateResult(
                                match.id,
                                Number(home),
                                Number(away)
                            ));
                        },
                        'btn-outline-success'
                    ).addClass('save-match-result');

                    form.append(
                        homeInput,
                        $('<span>:</span>'),
                        awayInput,
                        saveButton
                    );

                    card.append(form);
                }

                section.append(card);
            });

            container.append(section);
        });
    }

    async function renderStandings(tournament) {
        const container = $('#competitionStandings').empty();

        if (!['SwissSystem', 'RoundRobin']
            .includes(tournament.tournamentType)) {
            return;
        }

        container.append('<h6>Турнірна таблиця</h6>');

        try {
            const response = await tournamentsApi.getStandings(tournament.id);

            const rows = Array.isArray(response)
                ? response
                : (response?.standings || response?.items || []);

            if (!rows.length) {
                container.append(
                    '<p class="text-muted">Таблиця ще не сформована.</p>'
                );
                return;
            }

            const table = $('<table class="table table-sm table-striped align-middle"></table>');

            table.append(`
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
            `);

            const tbody = $('<tbody></tbody>');
            const names = getTeamNames(tournament);

            rows.forEach((row, index) => {
                const tr = $('<tr></tr>');

                const values = [
                    row.rank ?? row.position ?? index + 1,
                    row.teamName ?? row.participantName ??
                        names.get(String(row.teamId ?? row.participantId)) ??
                        'Учасник',
                    row.played ?? row.matchesPlayed ?? '—',
                    row.wins ?? '—',
                    row.draws ?? '—',
                    row.losses ?? '—',
                    row.points ?? row.totalPoints ?? '—'
                ];

                values.forEach(value => {
                    tr.append($('<td></td>').text(value));
                });

                tbody.append(tr);
            });

            table.append(tbody);

            container.append(
                $('<div class="table-responsive"></div>').append(table)
            );
        } catch (error) {
            container.append(
                $('<p class="text-muted"></p>')
                    .text('Турнірна таблиця зараз недоступна.')
            );
        }
    }

    window.loadCompetition = async function (tournament) {
        if (!tournament) return;

        $('#competitionSection').show();

        const roundInfo = tournament.tournamentType === 'SwissSystem'
            ? ` · Згенеровано раундів: ${tournament.swissLastGeneratedRound ?? 0}`
            : '';

        $('#competitionInfo').text(
            `${tournament.tournamentType} · ${statusLabels[tournament.status] || tournament.status}${roundInfo}`
        );

        $('#competitionMatches').html(
            '<p class="text-muted">Завантаження матчів...</p>'
        );

        $('#competitionStandings').empty();

        try {
            const response = await matchesApi.getByTournament(tournament.id);

            const matches = Array.isArray(response)
                ? response
                : (response?.matches || response?.items || []);

            renderActions(tournament);
            renderMatches(tournament, matches);
            await renderStandings(tournament);
        } catch (error) {
            renderActions(tournament);

            $('#competitionMatches').text(
                `Не вдалося отримати матчі: ${error.message}`
            );
        }
    };

    $(document).on('click', '#reloadCompetitionBtn', function () {
        loadTournamentDetails();
    });
})();
