
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
    static refreshPromise = null;

    constructor() {
        this.baseUrl = API_CONFIG.baseUrl;
        this.defaultHeaders = API_CONFIG.defaultHeaders;
    }

    static clearAuth() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiry');
        localStorage.removeItem('user');
    }

    static async refreshToken() {
        if (BaseApi.refreshPromise) {
            return BaseApi.refreshPromise;
        }

        const oldRefreshToken =
            localStorage.getItem('refreshToken');

        if (!oldRefreshToken) {
            return null;
        }

        BaseApi.refreshPromise = (async () => {
            try {
                const response = await fetch(
                    `${API_CONFIG.baseUrl}/api/Auth/refresh`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            refreshToken: oldRefreshToken
                        }),
                        signal: AbortSignal.timeout(
                            API_CONFIG.timeout)
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Refresh failed: ${response.status}`);
                }

                const data = await response.json();

                if (!data.accessToken ||
                    !data.refreshToken) {
                    throw new Error(
                        'Invalid refresh response');
                }

                localStorage.setItem(
                    'accessToken',
                    data.accessToken);

                localStorage.setItem(
                    'refreshToken',
                    data.refreshToken);

                localStorage.setItem(
                    'refreshTokenExpiry',
                    data.refreshTokenExpiry);

                return data.accessToken;
            } catch (error) {
                console.error(
                    'Token refresh failed:', error);
                if (localStorage.getItem('refreshToken')
                    === oldRefreshToken) {
                    BaseApi.clearAuth();
                }

                return null;
            }
        })();

        try {
            return await BaseApi.refreshPromise;
        } finally {
            BaseApi.refreshPromise = null;
        }
    }

    async refreshToken() {
        return BaseApi.refreshToken();
    }

    async request(url, options = {}) {
        const pathname =
            new URL(url, this.baseUrl)
                .pathname.toLowerCase();

        const isAuthRequest = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/refresh',
            '/api/auth/logout'
        ].includes(pathname);

        const send = async (token) => {
            const headers = {
                ...this.defaultHeaders,
                ...options.headers
            };

            if (token && !isAuthRequest) {
                headers.Authorization = `Bearer ${token}`;
            }

            return fetch(url, {
                ...options,
                headers,
                signal: AbortSignal.timeout(
                    API_CONFIG.timeout)
            });
        };

        try {
            if (!isAuthRequest &&
                BaseApi.refreshPromise) {
                await BaseApi.refreshPromise;
            }

            let token =
                localStorage.getItem('accessToken');

            let response = await send(token);

            if (response.status === 401 &&
                !isAuthRequest) {

                const currentToken =
                    localStorage.getItem('accessToken');

                if (currentToken &&
                    currentToken !== token) {
                    token = currentToken;
                } else {
                    token = await this.refreshToken();
                }

                if (!token) {
                    window.location.href =
                        '/pages/login.html';

                    throw new Error(
                        'Session expired');
                }

                response = await send(token);
            }

            if (response.status === 204) {
                return null;
            }

            
if (!response.ok) {
    const responseText = await response.text();

    console.error('API request failed:', {
        url: new URL(url, this.baseUrl).pathname,
        method: options.method || 'GET',
        status: response.status,
        response: responseText
    });

    let message = `HTTP ${response.status}`;

    try {
        const data = JSON.parse(responseText);
        message = data.message || data.title || message;
    } catch {
        if (responseText) {
            message = responseText;
        }
    }

    throw new Error(message);
}


            const contentType =
                response.headers.get('content-type');

            if (contentType?.includes(
                'application/json')) {
                return response.json();
            }

            return null;
        } catch (error) {
            if (error.name === 'TimeoutError' ||
                error.name === 'AbortError') {
                throw new Error(
                    'Запит перевищив час очікування');
            }

            throw error;
        }
    }

    get(url) {
        return this.request(url, {
            method: 'GET'
        });
    }

    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    }

    patch(url, data) {
        return this.request(url, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }
}

window.API_CONFIG = API_CONFIG;
window.BaseApi = BaseApi;
