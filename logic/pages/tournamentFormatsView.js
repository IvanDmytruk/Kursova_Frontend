(async () => {
    "use strict";

    const S = SHView;
    const $ = S.get;

    const formats = [
        [
            "olympic",
            "OlympicSystem",
            "Олімпійська система",
            "Матчі на вибування",
            "fa-code-branch"
        ],
        [
            "round-robin",
            "RoundRobin",
            "Кругова система",
            "Всі проти всіх, очки й місця",
            "fa-table-list"
        ],
        [
            "swiss",
            "SwissSystem",
            "Швейцарська система",
            "Парування за результатами раундів",
            "fa-layer-group"
        ],
        [
            "cs2-swiss",
            "Cs2SwissSystem",
            "CS2 Swiss",
            "Баланс перемог і поразок",
            "fa-crosshairs"
        ],
        [
            "groups",
            "GroupStage",
            "Груповий етап",
            "Окремі групи й таблиці",
            "fa-people-group"
        ],
        [
            "double-elimination",
            "DoubleElimination",
            "Подвійне вибування",
            "Верхня та нижня сітки",
            "fa-diagram-project"
        ]
    ];

    const slug = location.pathname.match(
        /format-([a-z0-9-]+)\.html$/
    )?.[1];

    const chosen = formats.find(f => f[0] === slug);
    const id = S.tournamentId;

    S.layout(
        chosen ? chosen[2] : "Формати турнірів",
        chosen ? chosen[3] : "Огляд усіх форматів",
        id
    );

    if ($("formatCatalog")) {
        $("formatCatalog").innerHTML = formats
            .map(([slug, key, title, desc, icon]) => `
                <a
                    class="sh-format-card"
                    href="/pages/format-${slug}.html${id ? `?id=${encodeURIComponent(id)}` : ""}"
                >
                    <i class="fas ${icon}"></i>

                    <h2>${S.esc(title)}</h2>

                    <p>${S.esc(desc)}</p>

                    <span class="sh-pill">
                        Детальніше
                    </span>
                </a>
            `).join("");
    }

    if ($("formatSpecific")) {
        $("formatSpecific").innerHTML = `
            <div class="sh-view-actions">

                <a
                    class="btn btn-outline-primary"
                    href="/pages/tournament-standings.html${id ? `?id=${encodeURIComponent(id)}` : ""}"
                >
                    Переглянути таблицю
                </a>

                <a
                    class="btn btn-outline-primary"
                    href="/pages/tournament-results.html${id ? `?id=${encodeURIComponent(id)}` : ""}"
                >
                    Матчі й раунди
                </a>

            </div>
        `;
    }

    async function load() {
        try {
            const ts = S.list(
                await tournamentsApi.getAll()
            ).filter(t =>
                !chosen ||
                String(t.tournamentType) === chosen[1]
            );

            $("formatTournaments").innerHTML = ts.length
                ? ts.map(t => `
                    <div class="sh-match-item">

                        <div>
                            <strong>
                                ${S.esc(t.tournamentName)}
                            </strong>

                            <div class="sh-muted small">
                                ${S.esc(S.labels[t.tournamentType] || t.tournamentType)}
                                ·
                                ${S.esc(t.status || "")}
                            </div>
                        </div>

                        <a
                            class="btn btn-sm btn-outline-primary"
                            href="/pages/tournament-overview.html?id=${encodeURIComponent(t.id)}"
                        >
                            Відкрити
                        </a>

                    </div>
                `).join("")
                : '<div class="sh-empty">Турнірів цього формату ще немає</div>';

        } catch (e) {
            S.alert(e.message);
        }
    }

    $("viewReload").onclick = load;

    await load();

})();
