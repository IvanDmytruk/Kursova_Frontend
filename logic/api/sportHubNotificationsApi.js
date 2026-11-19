
"use strict";

class SportHubNotificationsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = "/api/notifications";
    }

    get url() {
        return `${this.baseUrl}${this.endpoint}`;
    }

    async getMyNotifications({
        unreadOnly = false,
        page = 1,
        pageSize = 20
    } = {}) {
        const params = new URLSearchParams({
            unreadOnly: String(unreadOnly),
            page: String(page),
            pageSize: String(pageSize)
        });

        return this.get(`${this.url}?${params}`);
    }

    async getUnreadCount() {
        return this.get(`${this.url}/unread-count`);
    }

    async markAsRead(id) {
        return this.patch(
            `${this.url}/${encodeURIComponent(id)}/read`,
            {}
        );
    }

    async markAllAsRead() {
        return this.patch(
            `${this.url}/read-all`,
            {}
        );
    }

    async removeNotification(id) {
        return this.delete(
            `${this.url}/${encodeURIComponent(id)}`
        );
    }
}

window.sportHubNotificationsApi =
    new SportHubNotificationsApi();
