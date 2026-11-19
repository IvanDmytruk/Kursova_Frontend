
(function () {
    "use strict";

    function initializeDashboardLayout() {
        const sidebar = document.getElementById("mainSidebar");
        const toggle = document.getElementById("sidebarToggle");
        const backdrop = document.getElementById("sidebarBackdrop");

        if (!sidebar || !toggle || !backdrop) return;

        function setOpen(open) {
            sidebar.classList.toggle("is-open", open);
            backdrop.classList.toggle("is-visible", open);

            toggle.setAttribute("aria-expanded", String(open));
            toggle.setAttribute(
                "aria-label",
                open ? "Закрити навігацію" : "Відкрити навігацію"
            );
        }

        toggle.addEventListener("click", function () {
            setOpen(!sidebar.classList.contains("is-open"));
        });

        backdrop.addEventListener("click", function () {
            setOpen(false);
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth >= 768) {
                setOpen(false);
            }
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initializeDashboardLayout
        );
    } else {
        initializeDashboardLayout();
    }
})();
