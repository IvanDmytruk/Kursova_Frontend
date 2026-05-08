// logic/api/tournamentsApi.js
class TournamentsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.tournaments;
    }

    async getAll() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async getById(id) {
        return this.get(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async getActive() {
        return this.get(`${this.baseUrl}${this.endpoint}/active`);
    }

    async searchByName(name) {
        return this.get(`${this.baseUrl}${this.endpoint}/byname/${encodeURIComponent(name)}`);
    }

    async search(term) {
        return this.get(`${this.baseUrl}${this.endpoint}/search?term=${encodeURIComponent(term)}`);
    }

    async create(tournamentData) {
        return this.post(`${this.baseUrl}${this.endpoint}`, tournamentData);
    }

    async update(id, tournamentData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${id}`, tournamentData);
    }

    async delete(id) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async addTeam(tournamentId, teamId) {
        return this.post(`${this.baseUrl}${this.endpoint}/${tournamentId}/teams/${teamId}`, {});
    }

    async removeTeam(tournamentId, teamId) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${tournamentId}/teams/${teamId}`);
    }
    async getActiveBySport(sport) {
        return this.get(`${this.baseUrl}${this.endpoint}/active?sport=${sport}`);
    }
}

window.tournamentsApi = new TournamentsApi();