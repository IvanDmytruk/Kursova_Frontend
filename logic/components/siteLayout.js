(function () {
    "use strict";

    const THEME_KEY = "sporthub-theme";
    const SPORT_KEY = "selectedSport";

    const sports = [
        ["all", "🌍 Всі види спорту"],
        ["Football", "⚽ Футбол"],
        ["Basketball", "🏀 Баскетбол"],
        ["Volleyball", "🏐 Волейбол"],
        ["Handball", "🤾 Гандбол"],
        ["Tennis", "🎾 Теніс"],
        ["Boxing", "🥊 Бокс"],
        ["Judo", "🥋 Дзюдо"],
        ["Karate", "🥋 Карате"],
        ["Chess", "♟️ Шахи"],
        ["Checkers", "⬛ Шашки"],
        ["Contr_Strike_2", "🎯 CS2"],
        ["Dota_2", "🗡️ Dota 2"],
        ["Mobile_Legends_Bang_Bang", "📱 MLBB"],
        ["Hearts_of_Iron_4", "🌍 Hearts of Iron IV"],
        ["Civilization_6", "🏛️ Civilization VI"]
    ];

    const navigation = [
        ["/index.html", "fa-home", "Головна"],
        ["/pages/matches.html", "fa-calendar-alt", "Матчі"],
        ["/pages/tournaments.html", "fa-trophy", "Турніри"],
        ["/pages/tournament-formats.html", "fa-sitemap", "Формати"],
        ["/pages/teams.html", "fa-users", "Команди"],
        ["/pages/saved.html", "fa-bookmark", "Обране"],
        ["/pages/help.html", "fa-circle-question", "Допомога"]
    ];

    function readStorage(key, fallback = null) {
        try {
            return localStorage.getItem(key) ?? fallback;
        } catch {
            return fallback;
        }
    }

    function readUser() {
        try {
            return JSON.parse(readStorage("user", "{}")) || {};
        } catch {
            return {};
        }
    }

    function currentPage() {
        return window.location.pathname === "/"
            ? "/index.html"
            : window.location.pathname;
    }

    function createHeader() {
        const sportOptions = sports.map(([value, label]) => `
            <li>
                <a class="dropdown-item"
                   href="#"
                   data-sport="${value}">
                    ${label}
                </a>
            </li>
        `).join("");

        return `
            <div class="sh-header-inner">
                <a class="sh-brand" href="/index.html">
                    <img src="/images/logo.jpg"
                         alt=""
                         class="sh-logo">
                    <span>SportHub</span>
                </a>

                <div class="dropdown sh-sport-selector">
                    <button class="sh-sport-button dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown">
                        <i class="fas fa-globe"></i>
                        <span id="selectedSportName">
                            Всі види спорту
                        </span>
                    </button>

                    <ul class="dropdown-menu sh-sport-menu"
                        id="sportDropdownMenu">
                        ${sportOptions}
                    </ul>
                </div>

                <div id="search-container"
                     class="sh-global-search"></div>

                <div class="sh-header-actions">

                    <button id="themeToggle"
                            class="sh-icon-button"
                            type="button"
                            title="Змінити тему"
                            aria-label="Змінити тему">
                        <i id="themeIcon" class="fas fa-moon"></i>
                    </button>

                    <button id="notificationsBtn"
                            class="sh-icon-button"
                            type="button"
                            title="Сповіщення">
                        <i class="far fa-bell"></i>
                        <span id="notificationsCount"
                              class="sh-notification-count">0</span>
                    </button>

                    <div id="guestButtons"
                         class="sh-auth-buttons"
                         style="display:none">
                        <a href="/pages/login.html"
                           class="btn btn-outline-light btn-sm">
                            Увійти
                        </a>
                        <a href="/pages/register.html"
                           class="btn btn-primary btn-sm">
                            Реєстрація
                        </a>
                    </div>

                    <div id="userMenu"
                         class="dropdown"
                         style="display:none">

                        <button class="sh-user-button dropdown-toggle"
                                type="button"
                                id="userDropdown"
                                data-bs-toggle="dropdown">
                            <i class="fas fa-user-circle"></i>
                            <span id="userNameNav">Профіль</span>
                        </button>

                        <ul class="dropdown-menu dropdown-menu-end">
                            <li>
                                <a class="dropdown-item"
                                   href="/pages/profile.html">
                                    Мій профіль
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item"
                                   href="/pages/profile.html?tab=stats">
                                    Моя статистика
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger"
                                   href="#"
                                   id="logoutBtn">
                                    Вийти
                                </a>
                            </li>
                        </ul>
                    </div>

                    <button id="sidebarToggle"
                            class="sh-menu-toggle"
                            type="button"
                            aria-controls="mainSidebar"
                            aria-expanded="false"
                            aria-label="Відкрити навігацію">
                        <i class="fas fa-bars"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function createSidebar() {
        const links = navigation.map(([href, icon, name]) => {
            const active = currentPage() === href;

            return `
                <a href="${href}"
                   class="sh-nav-link ${active ? "active" : ""}"
                   ${active ? 'aria-current="page"' : ""}>
                    <i class="fas ${icon}"></i>
                    <span>${name}</span>
                </a>
            `;
        }).join("");

        return `
            <nav class="sh-sidebar-nav"
                 aria-label="Основна навігація">

                <div class="sh-nav-label">ОСНОВНЕ</div>
                ${links}
                ${window.location.pathname.includes("tournament-") && new URLSearchParams(window.location.search).get("id") ? (() => {
                    const id = encodeURIComponent(new URLSearchParams(window.location.search).get("id"));
                    return `
                        <div class="sh-nav-divider"></div>
                        <div class="sh-nav-label">ПОТОЧНИЙ ТУРНІР</div>
                        <a class="sh-nav-link" href="/pages/tournament-overview.html?id=${id}"><i class="fas fa-gauge"></i><span>Огляд</span></a>
                        <a class="sh-nav-link" href="/pages/tournament-standings.html?id=${id}"><i class="fas fa-table"></i><span>Таблиця</span></a>
                        <a class="sh-nav-link" href="/pages/tournament-results.html?id=${id}"><i class="fas fa-list-check"></i><span>Результати</span></a>
                        <a class="sh-nav-link" href="/pages/match-result-entry.html?id=${id}"><i class="fas fa-pen-to-square"></i><span>Внести результат</span></a>`;
                })() : ""}

                <div class="sh-nav-divider"></div>
                <div class="sh-nav-label">КОРИСТУВАЧ</div>

                <a href="/pages/profile.html"
                   class="sh-nav-link">
                    <i class="fas fa-user-circle"></i>
                    <span>Профіль</span>
                </a>

                <a href="/pages/profile.html?tab=participation"
                   class="sh-nav-link">
                    <i class="fas fa-envelope-open-text"></i>
                    <span>Турнірні заявки</span>
                </a>

                <a href="/pages/profile.html?tab=stats"
                   class="sh-nav-link">
                    <i class="fas fa-chart-line"></i>
                    <span>Моя статистика</span>
                </a>

                <a href="/pages/admin.html"
                   class="sh-nav-link"
                   id="adminPanelBtn"
                   style="display:none">
                    <i class="fas fa-shield-alt"></i>
                    <span>Адмін-панель</span>
                </a>
            </nav>

            <div class="sh-sidebar-footer">
                <div class="sh-sidebar-user">
                    <div class="sh-sidebar-avatar">
                        <i class="fas fa-user"></i>
                    </div>

                    <div class="sh-user-info">
                        <strong id="userName">Гість</strong>
                        <small id="userEmail">Не авторизовано</small>
                    </div>
                </div>
            </div>
        `;
    }

    function buildLayout() {
        if (document.body.dataset.layoutReady === "true") return;

        const main = document.querySelector("main");
        if (!main) return;

        document.body.dataset.layoutReady = "true";
        document.body.classList.add("sporthub-dashboard");


        document.querySelectorAll(
            "body > nav.navbar, body > header.sh-header"
        ).forEach(element => element.remove());


        const header = document.createElement("header");
        header.className = "sh-header sticky-top";
        header.innerHTML = createHeader();
        document.body.prepend(header);

        let layout = document.querySelector(".sh-app-layout");
        let sidebar;

        if (layout) {
            sidebar = layout.querySelector(".sh-sidebar");

            if (!sidebar) {
                sidebar = document.createElement("aside");
                layout.prepend(sidebar);
            }
        } else {
            layout = document.createElement("div");
            layout.className = "sh-app-layout";

            sidebar = document.createElement("aside");

            const oldProfileSidebar =
                document.getElementById("profileSidebar");

            if (oldProfileSidebar) {
                const column = oldProfileSidebar.closest(
                    ".col-lg-3"
                );

                if (column) {
                    column.remove();
                }
            }

            main.parentNode.insertBefore(layout, main);
            layout.append(sidebar);

            main.classList.add("sh-main-content");
            main.classList.remove("container");

            layout.append(main);
        }

        sidebar.id = "mainSidebar";
        sidebar.className = "sh-sidebar";
        sidebar.innerHTML = createSidebar();

        const contentColumn = main.querySelector(
            ":scope > .row > .col-lg-9"
        );

        if (contentColumn && main.querySelector(
            ":scope > .row"
        )?.children.length === 1) {
            contentColumn.classList.remove("col-lg-9");
            contentColumn.classList.add("col-12");
        }

        let backdrop =
            document.getElementById("sidebarBackdrop");

        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.id = "sidebarBackdrop";
            layout.prepend(backdrop);
        }

        backdrop.className = "sh-sidebar-backdrop";
    }

    function updateAuth() {
        const token = readStorage("accessToken");
        const user = readUser();

        const authenticated =
            Boolean(token && (user.id || user.email));

        const guest = document.getElementById("guestButtons");
        const menu = document.getElementById("userMenu");

        if (guest) {
            guest.style.display = authenticated ? "none" : "flex";
        }

        if (menu) {
            menu.style.display = authenticated ? "block" : "none";
        }

        const fullName = [
            user.surname,
            user.name
        ].filter(Boolean).join(" ");

        document.getElementById("userNameNav").textContent =
            authenticated ? (fullName || "Профіль") : "Профіль";

        document.getElementById("userName").textContent =
            authenticated ? (fullName || "Користувач") : "Гість";

        document.getElementById("userEmail").textContent =
            authenticated
                ? (user.email || user.contactInfo?.email || "")
                : "Не авторизовано";

        const isAdmin = authenticated &&
            String(user.role || "").toLowerCase() === "admin";

        const adminButton =
            document.getElementById("adminPanelBtn");

        if (adminButton) {
            adminButton.style.display =
                isAdmin ? "flex" : "none";
        }

        return authenticated;
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById("themeIcon");
        const button = document.getElementById("themeToggle");

        if (!icon || !button) return;

        icon.className =
            theme === "dark" ? "fas fa-sun" : "fas fa-moon";

        button.title =
            theme === "dark" ? "Світла тема" : "Темна тема";
    }

    function applyTheme(theme) {
        const value = theme === "dark" ? "dark" : "light";

        document.documentElement.dataset.theme = value;
        updateThemeIcon(value);

        try {
            localStorage.setItem(THEME_KEY, value);
        } catch {

        }
    }

    function setupTheme() {
        applyTheme(readStorage(THEME_KEY, "light"));

        document.getElementById("themeToggle")
            ?.addEventListener("click", function () {
                const current =
                    document.documentElement.dataset.theme;

                applyTheme(
                    current === "dark" ? "light" : "dark"
                );
            });
    }

    function setupSidebar() {
        const sidebar = document.getElementById("mainSidebar");
        const backdrop =
            document.getElementById("sidebarBackdrop");
        const toggle =
            document.getElementById("sidebarToggle");

        function closeSidebar() {
            sidebar.classList.remove("is-open");
            backdrop.classList.remove("is-visible");
            toggle.setAttribute("aria-expanded", "false");
        }

        toggle.addEventListener("click", function () {
            const open = sidebar.classList.toggle("is-open");
            backdrop.classList.toggle("is-visible", open);
            toggle.setAttribute("aria-expanded", String(open));
        });

        backdrop.addEventListener("click", closeSidebar);

        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape") closeSidebar();
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth >= 768) {
                closeSidebar();
            }
        });
    }

    function setupSport() {
        const selected = readStorage(SPORT_KEY, "all");

        const updateLabel = sport => {
            const found = sports.find(item => item[0] === sport);

            document.getElementById("selectedSportName")
                .textContent = found?.[1] || "Всі види спорту";
        };

        updateLabel(selected);

        if (currentPage() === "/index.html") return;

        document.getElementById("sportDropdownMenu")
            ?.addEventListener("click", function (e) {
                const link = e.target.closest("[data-sport]");
                if (!link) return;

                e.preventDefault();

                const sport = link.dataset.sport;

                try {
                    localStorage.setItem(SPORT_KEY, sport);
                } catch {}

                updateLabel(sport);

                window.dispatchEvent(new CustomEvent(
                    "sporthub:sport-changed",
                    { detail: { sport } }
                ));
            });
    }

    function setupSearch() {
        if (typeof window.SearchBar !== "function") return;
        if ([
            "/index.html",
            "/pages/matches.html"
        ].includes(currentPage())) {
            return;
        }

        if (!document.getElementById("global-search")) {
            new window.SearchBar("search-container");
        }
    }
    
    function setupLogout() {
        if (currentPage() === "/index.html") return;

        document.getElementById("logoutBtn")
            ?.addEventListener("click", async function (e) {
                e.preventDefault();

                const refreshToken =
                    readStorage("refreshToken");

                try {
                    if (refreshToken && window.authApi?.logout) {
                        await window.authApi.logout(refreshToken);
                    }
                } catch (error) {
                    console.warn("Logout request failed:", error);
                }

                [
                    "accessToken",
                    "refreshToken",
                    "refreshTokenExpiry",
                    "user",
                    "currentUser"
                ].forEach(key => {
                    try {
                        localStorage.removeItem(key);
                    } catch {}
                });

                window.location.href = "/index.html";
            });
    }

    function initialize() {
        buildLayout();

        if (document.body.dataset.layoutReady !== "true") return;

        setupTheme();
        setupSidebar();
        setupSport();
        setupSearch();
        setupLogout();
        updateAuth();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }

    window.SportHubLayout = {
        refreshAuth: updateAuth,
        setTheme: applyTheme
    };

/* SportHub — Notification Center
 * Uses existing #notificationsBtn from siteLayout.
 */
(() => {
    "use strict";

    let loading = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function asList(value) {
        return Array.isArray(value)
            ? value
            : Array.isArray(value?.items)
                ? value.items
                : [];
    }

    function isPending(item) {
        return String(
            item?.status ?? ""
        ).toLowerCase() === "pending";
    }

    function ensurePanel() {
        let panel = document.getElementById(
            "shNotificationsPanel"
        );

        if (panel) return panel;

        panel = document.createElement("section");

        panel.id = "shNotificationsPanel";
        panel.className = "sh-notifications-panel";
        panel.hidden = true;

        panel.setAttribute(
            "aria-label",
            "Центр сповіщень"
        );

        panel.innerHTML = `
            <div class="sh-notifications-header">
                <strong>Сповіщення</strong>

                <button
                    type="button"
                    id="closeShNotifications"
                    class="sh-notifications-close"
                    aria-label="Закрити">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div
                id="shNotificationsBody"
                class="sh-notifications-body">
                Завантаження...
            </div>

            <div class="sh-notifications-footer">
                <a href="/pages/profile.html?tab=invitations">
                    Команди
                </a>

                <a href="/pages/profile.html?tab=participation">
                    Турніри
                </a>
            </div>
        `;

        document.body.appendChild(panel);

        return panel;
    }

    function setCount(count) {
        const badge = document.getElementById(
            "notificationsCount"
        );

        if (!badge) return;

        badge.textContent = count > 99
            ? "99+"
            : String(count);

        badge.style.display =
            count > 0 ? "inline-flex" : "none";
    }

    async function loadNotifications() {
        if (loading) return;

        const body = document.getElementById(
            "shNotificationsBody"
        );

        if (!body) return;

        const token = localStorage.getItem(
            "accessToken"
        );

        if (!token) {
            setCount(0);

            body.innerHTML = `
                <p>Увійдіть у свій акаунт,
                   щоб переглядати сповіщення.</p>

                <a class="btn btn-primary btn-sm"
                   href="/pages/login.html">
                    Увійти
                </a>
            `;

            return;
        }

        if (typeof BaseApi === "undefined") {
            body.textContent =
                "Сервіс повідомлень недоступний.";
            return;
        }

        loading = true;

        body.textContent = "Завантаження...";

        try {
            const api = new BaseApi();
            const base = API_CONFIG.baseUrl;

            const responses = await Promise.allSettled([
                api.get(
                    `${base}/api/Teams/invitations/my`
                ),
                api.get(
                    `${base}/api/Tournaments/requests/my`
                )
            ]);

            const teamInvitations =
                responses[0].status === "fulfilled"
                    ? asList(responses[0].value)
                        .filter(isPending)
                    : [];

            const tournamentInvitations =
                responses[1].status === "fulfilled"
                    ? asList(responses[1].value).filter(
                        item =>
                            isPending(item) &&
                            String(item.type).toLowerCase()
                                === "invitation"
                    )
                    : [];

            const count =
                teamInvitations.length +
                tournamentInvitations.length;

            setCount(count);

            if (responses.every(
                response => response.status === "rejected"
            )) {
                body.textContent =
                    "Не вдалося завантажити сповіщення.";
                return;
            }

            if (count === 0) {
                body.innerHTML = `
                    <div class="sh-notification-empty">
                        <i class="far fa-bell"></i>
                        <p>Нових запрошень немає</p>
                    </div>
                `;
                return;
            }

            const teamItems = teamInvitations.map(item => `
                <a
                    class="sh-notification-item"
                    href="/pages/profile.html?tab=invitations">

                    <i class="fas fa-users"></i>

                    <span>
                        <strong>Запрошення до команди</strong>
                        <small>
                            Роль:
                            ${escapeHtml(item.role || "Учасник")}
                        </small>
                    </span>
                </a>
            `);

            const tournamentItems =
                tournamentInvitations.map(item => `
                    <a
                        class="sh-notification-item"
                        href="/pages/profile.html?tab=participation">

                        <i class="fas fa-trophy"></i>

                        <span>
                            <strong>Запрошення на турнір</strong>
                            <small>
                                Перейдіть до профілю,
                                щоб відповісти
                            </small>
                        </span>
                    </a>
                `);

            body.innerHTML = [
                ...teamItems,
                ...tournamentItems
            ].join("");

        } catch (error) {
            console.error(
                "Помилка центра сповіщень:",
                error
            );

            body.textContent =
                "Не вдалося отримати сповіщення.";

        } finally {
            loading = false;
        }
    }

    function initialize() {
        const button = document.getElementById(
            "notificationsBtn"
        );

        if (!button) return;

        const panel = ensurePanel();

        setCount(0);

        button.addEventListener("click", event => {
            event.stopPropagation();

            panel.hidden = !panel.hidden;

            if (!panel.hidden) {
                loadNotifications();
            }
        });

        document.getElementById(
            "closeShNotifications"
        ).addEventListener("click", () => {
            panel.hidden = true;
        });

        document.addEventListener("click", event => {
            if (
                !panel.hidden &&
                !panel.contains(event.target) &&
                !button.contains(event.target)
            ) {
                panel.hidden = true;
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                panel.hidden = true;
            }
        });

        if (localStorage.getItem("accessToken")) {
            loadNotifications();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );
    } else {
        initialize();
    }
})();

})();
