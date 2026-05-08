// logic/api/teamsApi.js
class TeamsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.teams;
    }

    async getAll() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async getById(id) {
        return this.get(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async searchByName(name) {
        return this.get(`${this.baseUrl}${this.endpoint}/byname/${encodeURIComponent(name)}`);
    }

    async search(term) {
        return this.get(`${this.baseUrl}${this.endpoint}/search?term=${encodeURIComponent(term)}`);
    }

    async getPaged(page = 1, pageSize = 10) {
        return this.get(`${this.baseUrl}${this.endpoint}/paged?page=${page}&pageSize=${pageSize}`);
    }

    async create(teamData) {
        return this.post(`${this.baseUrl}${this.endpoint}`, teamData);
    }

    async update(id, teamData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${id}`, teamData);
    }

    async delete(id) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }
    // Отримати всіх гравців команди
    async getPlayers(teamId) {
        return this.get(`${this.baseUrl}${this.endpoint}/${teamId}/players`);
    }

    // Отримати склад на матч
    async getLineup(matchId, teamId) {
        return this.get(`${this.baseUrl}${this.endpoint}/${teamId}/lineup/${matchId}`);
    }

    // Встановити склад на матч (основні + запасні)
    async setLineup(matchId, teamId, lineupData) {
        return this.post(`${this.baseUrl}${this.endpoint}/${teamId}/lineup/${matchId}`, lineupData);
    }
    async getBySport(sport) {
        return this.get(`${this.baseUrl}${this.endpoint}?sport=${sport}`);
    }

    async searchBySport(sport, searchTerm) {
        return this.get(`${this.baseUrl}${this.endpoint}/search?sport=${sport}&q=${encodeURIComponent(searchTerm)}`);
    }
}

window.teamsApi = new TeamsApi();