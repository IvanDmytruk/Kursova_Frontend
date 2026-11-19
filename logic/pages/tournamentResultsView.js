
(async () => {
    "use strict";

    const S = SHView;
    const $ = S.get;

    let matches = [];
    let tournament;

    function render() {
        let rows = matches;

        const round = $("roundFilter").value;
        const filter = $("statusFilter").value;

        if (round) {
            rows = rows.filter(
                x => String(x.roundNumber ?? 0) === round
            );
        }

        if (filter) {
            rows = rows.filter(
                x => (x.homeScore != null && x.awayScore != null) ===
                    (filter === "done")
            );
        }

        $("resultsMatches").innerHTML = rows.length
            ? rows
                .sort((a, b) =>
                    (a.roundNumber || 0) - (b.roundNumber || 0)
                )
                .map(x => `
                    <div class="sh-match-item">

                        <div>
                            <span class="sh-round-label">
                                Раунд ${S.esc(x.roundNumber ?? 0)}
                                ${x.groupId
                                    ? " · Група " + S.esc(x.groupId)
                                    : ""
                                }
                            </span>

                            <div class="sh-match-teams">
                                ${S.esc(S.nameOf(x.homeTeamId, tournament))}
                                —
                                ${S.esc(S.nameOf(x.awayTeamId, tournament))}
                            </div>
                        </div>

                        <span class="sh-score">
                            ${S.esc(x.homeScore ?? "—")}
                            :
                            ${S.esc(x.awayScore ?? "—")}
                        </span>

                        <a
                            class="btn btn-sm btn-outline-primary"
                            href="/pages/match-result-entry.html?id=${encodeURIComponent(tournament.id)}&matchId=${encodeURIComponent(x.id)}"
                        >
                            Результат
                        </a>

                    </div>
                `).join("")
            : '<div class="sh-empty">Матчів за вибраним фільтром немає</div>';
    }

    async function load() {
        try {
            [tournament, matches] = await Promise.all([
                S.loadTournament(),
                matchesApi.getByTournament(S.tournamentId)
            ]);

            matches = S.list(matches);

            S.layout(
                tournament.tournamentName,
                "Матчі й результати · " +
                (S.labels[tournament.tournamentType] || tournament.tournamentType)
            );

            const rounds = [
                ...new Set(
                    matches.map(x => Number(x.roundNumber ?? 0))
                )
            ].sort((a, b) => a - b);

            $("roundFilter").innerHTML =
                '<option value="">Усі раунди</option>' +
                rounds.map(n => `
                    <option value="${n}">
                        Раунд ${n}
                    </option>
                `).join("");

            render();

        } catch (e) {
            S.alert(e.message);
        }
    }

    $("roundFilter").onchange = render;
    $("statusFilter").onchange = render;
    $("viewReload").onclick = load;

    await load();

})();
