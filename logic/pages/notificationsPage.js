
(() => {
    "use strict";

    const get = id => document.getElementById(id);

    let page = 1;
    const pageSize = 20;
    let total = 0;
    let loading = false;

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function showMessage(message, error = false) {
        const element = get("notificationsAlert");

        element.hidden = false;
        element.className = error
            ? "sh-error mb-3"
            : "alert alert-success mb-3";

        element.textContent = message;
    }

    function formatDate(value) {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return new Intl.DateTimeFormat("uk-UA", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function safeUrl(value) {
        const url = String(value || "");

        if (
            !url.startsWith("/") ||
            url.startsWith("//") ||
            url.includes("\\")
        ) {
            return "";
        }

        try {
            const resolved = new URL(
                url,
                window.location.origin
            );

            if (
                resolved.origin !== window.location.origin ||
                resolved.protocol !== window.location.protocol
            ) {
                return "";
            }

            return resolved.pathname +
                resolved.search +
                resolved.hash;
        } catch {
            return "";
        }
    }

    function renderItem(item) {
        const unread = !item.isRead;
        const id = escapeHtml(item.id);

        const link = safeUrl(item.url);

        return `
            <article
                class="card mb-3"
                data-notification-id="${id}">

                <div class="card-body">
                    <div class="d-flex justify-content-between
                                align-items-start gap-3">

                        <div class="flex-grow-1">
                            <h3 class="h6 fw-bold mb-2">
                                ${unread
                                    ? '<i class="fas fa-circle text-primary me-2" style="font-size:.45rem"></i>'
                                    : ""
                                }
                                ${escapeHtml(item.title)}
                            </h3>

                            <p class="mb-2">
                                ${escapeHtml(item.message)}
                            </p>

                            <div class="small text-muted">
                                ${escapeHtml(
                                    formatDate(item.createdAt)
                                )}
                            </div>
                        </div>

                        <div class="d-flex flex-wrap gap-2">
                            ${unread
                                ? `
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary"
                                    data-mark-read="${id}">
                                    Прочитано
                                </button>`
                                : ""
                            }

                            <button
                                type="button"
                                class="btn btn-sm btn-outline-danger"
                                data-remove="${id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>

                    ${link
                        ? `
                        <a
                            class="btn btn-sm btn-primary mt-3"
                            href="${escapeHtml(link)}">
                            Перейти до матчу
                        </a>`
                        : ""
                    }
                </div>
            </article>
        `;
    }

    async function refreshUnreadCount() {
        const result =
            await window.sportHubNotificationsApi
                .getUnreadCount();

        get("unreadNotificationCount").textContent =
            `Непрочитаних: ${result.unreadCount ?? 0}`;
    }

    async function load(reset = true) {
        if (loading) return;

        if (reset) {
            page = 1;
            total = 0;

            get("notificationsList").innerHTML =
                '<p class="text-muted">Завантаження...</p>';
        }

        loading = true;
        get("loadMoreNotifications").disabled = true;

        try {
            if (!localStorage.getItem("accessToken")) {
                get("notificationsList").innerHTML = `
                    <p>Увійдіть, щоб переглядати повідомлення.</p>
                    <a class="btn btn-primary"
                       href="/pages/login.html">
                        Увійти
                    </a>
                `;

                get("unreadNotificationCount").textContent =
                    "";
                return;
            }

            const result =
                await window.sportHubNotificationsApi
                    .getMyNotifications({
                        unreadOnly:
                            get("unreadOnly").checked,
                        page,
                        pageSize
                    });

            const items = Array.isArray(result?.items)
                ? result.items
                : [];

            total = Number(result?.total || 0);

            if (reset) {
                get("notificationsList").innerHTML = "";
            }

            if (page === 1 && items.length === 0) {
                get("notificationsList").innerHTML = `
                    <div class="sh-empty">
                        Нових повідомлень немає.
                    </div>
                `;
            } else {
                get("notificationsList").insertAdjacentHTML(
                    "beforeend",
                    items.map(renderItem).join("")
                );
            }

            const shown =
                Math.min(page * pageSize, total);

            get("loadMoreNotifications").hidden =
                shown >= total || items.length === 0;

            await refreshUnreadCount();

        } catch (error) {
            console.error(error);

            showMessage(
                error.message ||
                "Не вдалося завантажити повідомлення.",
                true
            );

            if (reset) {
                get("notificationsList").innerHTML =
                    '<p class="text-muted">Помилка завантаження.</p>';
            }

        } finally {
            loading = false;
            get("loadMoreNotifications").disabled = false;
        }
    }

    get("notificationsList").addEventListener(
        "click",
        async event => {
            const markButton = event.target.closest(
                "[data-mark-read]"
            );

            const removeButton = event.target.closest(
                "[data-remove]"
            );

            if (!markButton && !removeButton) {
                return;
            }

            const id = (
                markButton || removeButton
            ).dataset.markRead ||
                removeButton?.dataset.remove;

            if (!id) return;

            try {
                if (markButton) {
                    await window.sportHubNotificationsApi
                        .markAsRead(id);
                }

                if (removeButton) {
                    if (!confirm("Видалити повідомлення?")) {
                        return;
                    }

                    await window.sportHubNotificationsApi
                        .removeNotification(id);
                }

                await load(true);

            } catch (error) {
                showMessage(error.message, true);
            }
        }
    );

    get("unreadOnly").addEventListener(
        "change",
        () => load(true)
    );

    get("reloadNotifications").addEventListener(
        "click",
        () => load(true)
    );

    get("loadMoreNotifications").addEventListener(
        "click",
        () => {
            page++;
            load(false);
        }
    );

    get("readAllNotifications").addEventListener(
        "click",
        async () => {
            try {
                await window.sportHubNotificationsApi
                    .markAllAsRead();

                await load(true);

                showMessage(
                    "Усі повідомлення позначено прочитаними."
                );

            } catch (error) {
                showMessage(error.message, true);
            }
        }
    );

    load(true);
})();
