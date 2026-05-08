// logic/api/statisticsApi.js
class StatisticsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.statistics;
    }

    async getAll() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async getById(id) {
        return this.get(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async getUserStats(userId) {
        return this.get(`${this.baseUrl}${this.endpoint}/user/${userId}`);
    }

    async getTeamStats(teamId) {
        return this.get(`${this.baseUrl}${this.endpoint}/team/${teamId}`);
    }

    async getTournamentStats(tournamentId) {
        return this.get(`${this.baseUrl}${this.endpoint}/tournament/${tournamentId}`);
    }

    async getSeasonStats(season) {
        return this.get(`${this.baseUrl}${this.endpoint}/season/${season}`);
    }

    async getTopStats(limit = 10) {
        return this.get(`${this.baseUrl}${this.endpoint}/top?limit=${limit}`);
    }

    async create(statData) {
        return this.post(`${this.baseUrl}${this.endpoint}`, statData);
    }

    async update(id, statData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${id}`, statData);
    }

    async delete(id) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async updateMatchResult(id, isWin, isDraw) {
        return this.patch(`${this.baseUrl}${this.endpoint}/${id}/match`, { isWin, isDraw });
    }
}

window.statisticsApi = new StatisticsApi();