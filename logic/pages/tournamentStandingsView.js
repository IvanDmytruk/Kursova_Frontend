(async () => {
    "use strict";

    const S = SHView;
    const $ = S.get;

    async function load() {
        try {

            const t = await S.loadTournament();

            S.layout(
                t.tournamentName,
                "Турнірні таблиці · " +
                (S.labels[t.tournamentType] || t.tournamentType)
            );

            const [standings, matches] = await Promise.allSettled([
                tournamentsApi.get(
                    `${tournamentsApi.url}/${encodeURIComponent(t.id)}/standings`
                ),
                matchesApi.getByTournament(t.id)
            ]);

            let result = standings.status === "fulfilled"
                ? standings.value
                : null;

            const sections = S.list(result?.sections);

            $("standingsIntro").textContent = result
                ? `${result.viewType || "Таблиця"} · ${S.labels[t.tournamentType] || t.tournamentType}`
                : "Таблиця для цього формату поки недоступна через API. Позиції не обчислюємо приблизно.";

            $("standingsSections").innerHTML = sections.length
                ? sections.map(s => `
                    <div class="mb-4">

                        <h3>
                            ${S.esc(s.sectionName || "Загальна таблиця")}
                        </h3>

                        <div class="sh-table-wrap">

                            <table class="sh-table">

                                <thead>
                                    <tr>
                                        <th>№</th>
                                        <th>Учасник</th>
                                        <th class="sh-number">І</th>
                                        <th class="sh-number">В</th>
                                        <th class="sh-number">Н</th>
                                        <th class="sh-number">П</th>
                                        <th class="sh-number">Заб.</th>
                                        <th class="sh-number">Проп.</th>
                                        <th class="sh-number">Різ.</th>
                                        <th class="sh-number">Очки</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    ${S.list(s.entries).map(e => `
                                        <tr>

                                            <td>
                                                ${S.esc(e.position)}
                                            </td>

                                            <td>
                                                <strong>
                                                    ${S.esc(e.participantName)}
                                                </strong>

                                                ${e.isDisqualified
                                                    ? ' <span class="sh-pill">Дискваліфікація</span>'
                                                    : ''
                                                }
                                            </td>

                                            ${[
                                                e.played,
                                                e.wins,
                                                e.draws,
                                                e.losses,
                                                e.scoreFor,
                                                e.scoreAgainst,
                                                e.scoreDifference,
                                                e.points
                                            ].map(v => `
                                                <td class="sh-number">
                                                    ${S.esc(v ?? 0)}
                                                </td>
                                            `).join("")}

                                        </tr>
                                    `).join("")}

                                </tbody>

                            </table>

                        </div>

                    </div>
                `).join("")
                : '<div class="sh-empty">Немає сформованих позицій</div>';

            const m = matches.status === "fulfilled"
                ? S.list(matches.value)
                : [];
            const roundMap = new Map();

            for (const match of m) {

                const label = `Раунд ${match.roundNumber ?? 0}` +
                    (match.groupId
                        ? ` · група ${match.groupId}`
                        : ""
                    );
                if (!roundMap.has(label)) {
                    roundMap.set(label, []);
                }
                roundMap.get(label).push(match);
            }
            $("standingsBracket").innerHTML = m.length
                ? `
                    <div class="sh-bracket">

                        ${[...roundMap].map(([label, items]) => `
                            <div class="sh-bracket-column">

                                <h3>
                                    ${S.esc(label)}
                                </h3>

                                ${items.map(x => `
                                    <div class="sh-bracket-match">

                                        <!-- Перший учасник -->
                                        <div>
                                            <span>
                                                ${S.esc(S.nameOf(x.homeTeamId, t))}
                                            </span>

                                            <b>
                                                ${S.esc(x.homeScore ?? "—")}
                                            </b>
                                        </div>

                                        <!-- Другий учасник -->
                                        <div>
                                            <span>
                                                ${S.esc(S.nameOf(x.awayTeamId, t))}
                                            </span>

                                            <b>
                                                ${S.esc(x.awayScore ?? "—")}
                                            </b>
                                        </div>

                                    </div>
                                `).join("")}

                            </div>
                        `).join("")}

                    </div>
                `
                : '<div class="sh-empty">Матчів для сітки поки немає</div>';

        } catch (e) {
            S.alert(e.message);

        }
    }
    $("viewReload").onclick = load;
    await load();

})();
