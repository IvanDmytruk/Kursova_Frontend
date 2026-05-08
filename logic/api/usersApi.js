// logic/api/usersApi.js
class UsersApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.users;
    }

    async getAll() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async getById(id) {
        return this.get(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async search(name, surname) {
        let url = `${this.baseUrl}${this.endpoint}/search?`;
        if (name) url += `name=${encodeURIComponent(name)}&`;
        if (surname) url += `surname=${encodeURIComponent(surname)}`;
        return this.get(url);
    }

    async getByAgeRange(minAge, maxAge) {
        return this.get(`${this.baseUrl}${this.endpoint}/age-range?minAge=${minAge}&maxAge=${maxAge}`);
    }

    async create(userData) {
        return this.post(`${this.baseUrl}${this.endpoint}`, userData);
    }

    async update(id, userData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${id}`, userData);
    }

    async delete(id) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }
}

window.usersApi = new UsersApi();