
(async () => {
    "use strict";

    const S = SHView;
    let id = S.tournamentId;

    async function load() {
        try {
            const [t, m] = await Promise.all([
                S.loadTournament(),
                matchesApi.getByTournament(id)
            ]);

            S.layout(
                t.tournamentName,
                "Огляд · " +
                (S.labels[t.tournamentType] || t.tournamentType)
            );

            const matches = S.list(m);
            const players = S.list(t.tournamentParticipants);

            S.get("overviewMetrics").innerHTML = [
                ["Учасників", players.length],
                ["Матчів", matches.length],
                [
                    "Завершено",
                    matches.filter(
                        x => x.homeScore != null && x.awayScore != null
                    ).length
                ],
                ["Статус", t.status || "—"]
            ].map(([l, v]) => `
                <div class="sh-metric">
                    <strong>${S.esc(v)}</strong>
                    <span>${S.esc(l)}</span>
                </div>
            `).join("");

            S.get("overviewDescription").textContent =
                `${S.labels[t.tournamentType] || t.tournamentType} · ` +
                `${t.format || ""} · ` +
                `${t.sportName || ""}. ` +
                `${t.tournamentDescription || ""}`;

            S.get("overviewParticipants").innerHTML = players.length
                ? players.map(x => `
                    <span class="sh-pill me-2 mb-2">
                        ${S.esc(x.teamName || x.name || x.id)}
                    </span>
                `).join("")
                : '<div class="sh-empty">Учасників ще немає</div>';

            S.get("overviewMatches").innerHTML = matches.length
                ? matches
                    .slice(-6)
                    .reverse()
                    .map(x => `
                        <div class="sh-match-item">

                            <span class="sh-match-teams">
                                ${S.esc(S.nameOf(x.homeTeamId, t))}
                                —
                                ${S.esc(S.nameOf(x.awayTeamId, t))}
                            </span>

                            <span class="sh-score">
                                ${x.homeScore ?? "—"} : ${x.awayScore ?? "—"}
                            </span>

                            <a href="/pages/match-result-entry.html?id=${encodeURIComponent(id)}&matchId=${encodeURIComponent(x.id)}">
                                Деталі
                            </a>

                        </div>
                    `).join("")
                : '<div class="sh-empty">Матчів поки немає</div>';

        } catch (e) {
            S.alert(e.message);
        }
    }

    S.get("viewReload").onclick = load;

    await load();

})();
