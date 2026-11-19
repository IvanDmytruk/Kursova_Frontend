
/* SportHub Theme Manager */

(function () {
    "use strict";

    const STORAGE_KEY = "sporthub-theme";

    function getSavedTheme() {
        try {
            return localStorage.getItem(STORAGE_KEY) === "dark"
                ? "dark"
                : "light";
        } catch {
            return "light";
        }
    }

    function saveTheme(theme) {
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            console.warn("Не вдалося зберегти тему:", error);
        }
    }

    function updateToggle(theme) {
        const button = document.getElementById("themeToggle");
        const icon = document.getElementById("themeIcon");

        if (!button || !icon) return;

        if (theme === "dark") {
            icon.className = "fas fa-sun";
            button.setAttribute(
                "aria-label",
                "Увімкнути світлу тему"
            );
            button.title = "Світла тема";
        } else {
            icon.className = "fas fa-moon";
            button.setAttribute(
                "aria-label",
                "Увімкнути темну тему"
            );
            button.title = "Темна тема";
        }
    }

    function applyTheme(theme, persist = true) {
        const normalized = theme === "dark" ? "dark" : "light";

        document.documentElement.dataset.theme = normalized;

        updateToggle(normalized);

        if (persist) {
            saveTheme(normalized);
        }
    }

    function toggleTheme() {
        const currentTheme =
            document.documentElement.dataset.theme;

        applyTheme(
            currentTheme === "dark" ? "light" : "dark"
        );
    }

    function initializeTheme() {
        applyTheme(getSavedTheme(), false);

        const button = document.getElementById("themeToggle");

        if (button) {
            button.addEventListener("click", toggleTheme);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeTheme
        );
    } else {
        initializeTheme();
    }

    window.SportHubTheme = {
        setTheme: applyTheme,
        toggleTheme: toggleTheme,
        getTheme: function () {
            return document.documentElement.dataset.theme;
        }
    };
})();
