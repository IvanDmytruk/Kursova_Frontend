// logic/api/matchesApi.js
class MatchesApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.matches;
    }

    async getAll() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async getById(id) {
        return this.get(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async getUpcoming() {
        return this.get(`${this.baseUrl}${this.endpoint}/upcoming`);
    }

    async getStartingSoon(hours = 24) {
        return this.get(`${this.baseUrl}${this.endpoint}/startingsoon?hours=${hours}`);
    }

    async getByDateRange(start, end) {
        return this.get(`${this.baseUrl}${this.endpoint}/daterange?start=${start.toISOString()}&end=${end.toISOString()}`);
    }

    async getByTournament(tournamentId) {
        return this.get(`${this.baseUrl}${this.endpoint}/tournament/${tournamentId}`);
    }

    async getByTeam(teamId) {
        return this.get(`${this.baseUrl}${this.endpoint}/team/${teamId}`);
    }

    async searchByName(name) {
        return this.get(`${this.baseUrl}${this.endpoint}/byname/${encodeURIComponent(name)}`);
    }

    async create(matchData) {
        return this.post(`${this.baseUrl}${this.endpoint}`, matchData);
    }

    async update(id, matchData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${id}`, matchData);
    }
 
    async delete(id) {
     return super.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async generateSwissRound(tournamentId) {
    return this.post(
        `${this.baseUrl}${this.endpoint}/tournament/${tournamentId}/generate-swiss-round`
    );
}

async updateResult(matchId, homeScore, awayScore) {
    return this.patch(
        `${this.baseUrl}${this.endpoint}/${matchId}/result`,
        { homeScore, awayScore }
    );
}

    async getStats(matchId) {
        return this.get(`${this.baseUrl}${this.endpoint}/${matchId}/stats`);
    }

    async updateStats(matchId, statsData) {
        return this.put(`${this.baseUrl}${this.endpoint}/${matchId}/stats`, statsData);
    }

    async getEvents(matchId) {
        return this.get(`${this.baseUrl}${this.endpoint}/${matchId}/events`);
    }

    async addEvent(matchId, eventData) {
        return this.post(`${this.baseUrl}${this.endpoint}/${matchId}/events`, eventData);
    }

    async updateScore(matchId, homeScore, awayScore) {
        return this.updateResult(matchId, homeScore, awayScore);
    }
    async updateStatus(matchId, status) {
        return this.put(`${this.baseUrl}${this.endpoint}/${matchId}/status`, { status });
    }
    async getUpcomingBySport(sport) {
        return this.get(`${this.baseUrl}${this.endpoint}/upcoming?sport=${sport}`);
    }

async generateRoundRobin(tournamentId) {
    return this.post(
        `${this.baseUrl}${this.endpoint}/tournament/${tournamentId}/generate-round-robin`
    );
}

}

window.matchesApi = new MatchesApi();