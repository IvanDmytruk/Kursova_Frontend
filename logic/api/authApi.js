// logic/api/authApi.js
class AuthApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = '/api/Auth';
    }

    async register(fullName, email, password) {
        return this.post(`${this.baseUrl}${this.endpoint}/register`, {
            fullName,
            email,
            password
        });
    }

    async login(email, password) {
        return this.post(`${this.baseUrl}${this.endpoint}/login`, {
            email,
            password
        });
    }

    async refresh(refreshToken) {
        return this.post(`${this.baseUrl}${this.endpoint}/refresh`, {
            refreshToken
        });
    }

    async logout(refreshToken) {
        return this.post(`${this.baseUrl}${this.endpoint}/logout`, {
            refreshToken
        });
    }
}

window.authApi = new AuthApi();