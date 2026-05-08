// logic/api/config.js
const API_CONFIG = {
    baseUrl: 'https://localhost:7171',
    timeout: 30000,
    defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    endpoints: {
        matches: '/api/Matches',
        teams: '/api/Teams',
        tournaments: '/api/Tournaments',
        users: '/api/User',
        statistics: '/api/Statistics',
        search: '/api/Search'
    }
};

class BaseApi {
    constructor() {
        this.baseUrl = API_CONFIG.baseUrl;
        this.defaultHeaders = API_CONFIG.defaultHeaders;
    }

    async request(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        // Додаємо токен до заголовків, якщо він є
        const token = localStorage.getItem('accessToken');
        const headers = { ...this.defaultHeaders, ...options.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers: headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Якщо 401 Unauthorized - пробуємо оновити токен
            if (response.status === 401) {
                const newToken = await this.refreshToken();
                if (newToken) {
                    // Повторюємо запит з новим токеном
                    headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers: headers,
                        signal: controller.signal
                    });
                    return retryResponse.json();
                } else {
                    window.location.href = '/pages/login.html';
                    throw new Error('Session expired');
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            return response.json();
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Запит перевищив час очікування');
            }
            throw error;
        }
    }

    async refreshToken() {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) return null;

        try {
            const response = await fetch(`${this.baseUrl}/api/Auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('accessToken', data.accessToken);
                localStorage.setItem('refreshToken', data.refreshToken);
                localStorage.setItem('refreshTokenExpiry', data.refreshTokenExpiry);
                return data.accessToken;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
        }

        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        return null;
    }

    get(url) { return this.request(url, { method: 'GET' }); }
    post(url, data) { return this.request(url, { method: 'POST', body: JSON.stringify(data) }); }
    put(url, data) { return this.request(url, { method: 'PUT', body: JSON.stringify(data) }); }
    delete(url) { return this.request(url, { method: 'DELETE' }); }
    patch(url, data) { return this.request(url, { method: 'PATCH', body: JSON.stringify(data) }); }
}

window.API_CONFIG = API_CONFIG;
window.BaseApi = BaseApi;