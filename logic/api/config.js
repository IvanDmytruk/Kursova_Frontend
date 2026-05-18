// logic/api/config.js
const API_CONFIG = {
    baseUrl: 'https://kursova-beckend.onrender.com',
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

        const token = localStorage.getItem('accessToken');
        const headers = {...this.defaultHeaders, ...options.headers};

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

            if (response.status === 401) {
                const newToken = await this.refreshToken();
                if (newToken) {
                    headers['Authorization'] = `Bearer ${newToken}`;
                    const retryResponse = await fetch(url, {
                        ...options,
                        headers: headers,
                        signal: controller.signal
                    });
                    const contentType = retryResponse.headers.get('content-type');
                    if (retryResponse.status !== 204 && contentType && contentType.includes('application/json')) {
                        return retryResponse.json();
                    }
                    return null;
                } else {
                    window.location.href = '/pages/login.html';
                    throw new Error('Session expired');
                }
            }

            if (response.status === 204) {
                return null;
            }

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorData.title || errorMessage;
                } catch (e) {
                    errorMessage = await response.text().catch(() => errorMessage);
                }
                throw new Error(errorMessage);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const text = await response.text();
                if (!text) return null;
                return JSON.parse(text);
            }

            return null;

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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({refreshToken})
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

    get(url) {
        return this.request(url, {method: 'GET'});
    }

    post(url, data) {
        return this.request(url, {method: 'POST', body: JSON.stringify(data)});
    }

    put(url, data) {
        return this.request(url, {method: 'PUT', body: JSON.stringify(data)});
    }

    delete(url) {
        return this.request(url, {method: 'DELETE'});
    }

    patch(url, data) {
        return this.request(url, {method: 'PATCH', body: JSON.stringify(data)});
    }
}
window.API_CONFIG = API_CONFIG;
window.BaseApi = BaseApi;