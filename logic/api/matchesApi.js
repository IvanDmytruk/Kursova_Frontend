class MatchesApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.matches;
    }

    get url() {
        return `${this.baseUrl}${this.endpoint}`;
    }

    async getAll() {
        return this.get(this.url);
    }

    async getById(id) {
        return this.get(
            `${this.url}/${encodeURIComponent(id)}`
        );
    }

    async getByTournament(tournamentId) {
        return this.get(
            `${this.url}/tournament/${encodeURIComponent(tournamentId)}`
        );
    }

    async getByTeam(teamId) {
        return this.get(
            `${this.url}/team/${encodeURIComponent(teamId)}`
        );
    }

    async searchByName(name) {
        return this.get(
            `${this.url}/byname/${encodeURIComponent(name)}`
        );
    }

    async exists(name) {
        return this.get(
            `${this.url}/exists/${encodeURIComponent(name)}`
        );
    }

    async getUpcoming() {
        return this.get(`${this.url}/upcoming`);
    }

    async getUpcomingBySport(sport) {
        return this.get(
            `${this.url}/upcoming?sport=${encodeURIComponent(sport)}`
        );
    }

    async getStartingSoon(hours = 24) {
        return this.get(
            `${this.url}/startingsoon?hours=${encodeURIComponent(hours)}`
        );
    }

    async getByDateRange(start, end) {
        const startIso = new Date(start).toISOString();
        const endIso = new Date(end).toISOString();

        return this.get(
            `${this.url}/daterange` +
            `?start=${encodeURIComponent(startIso)}` +
            `&end=${encodeURIComponent(endIso)}`
        );
    }

    async create(matchData) {
        return this.post(this.url, matchData);
    }

    async update(id, matchData) {
        return this.put(
            `${this.url}/${encodeURIComponent(id)}`,
            matchData
        );
    }

    async delete(id) {
        return super.delete(
            `${this.url}/${encodeURIComponent(id)}`
        );
    }

    async updateResult(matchId, homeScore, awayScore) {
        return this.patch(
            `${this.url}/${encodeURIComponent(matchId)}/result`,
            {
                homeScore: Number(homeScore),
                awayScore: Number(awayScore)
            }
        );
    }

    async updateScore(matchId, homeScore, awayScore) {
        return this.updateResult(
            matchId,
            homeScore,
            awayScore
        );
    }

    async setTechnicalResult(matchId, resultData) {

        return this.patch(
            `${this.url}/${encodeURIComponent(matchId)}/technical-result`,
            resultData
        );
    }

    async generateRoundRobin(tournamentId) {
        return this.post(
            `${this.url}/tournament/${encodeURIComponent(tournamentId)}/generate-round-robin`,
            {}
        );
    }

    async generateSwissRound(tournamentId) {
        return this.post(
            `${this.url}/tournament/${encodeURIComponent(tournamentId)}/generate-swiss-round`,
            {}
        );
    }

    async generateGroupStage(tournamentId) {
        return this.post(
            `${this.url}/tournament/${encodeURIComponent(tournamentId)}/generate-group-stage`,
            {}
        );
    }

    async generateDoubleEliminationRound(tournamentId) {
        return this.post(
            `${this.url}/tournament/${encodeURIComponent(tournamentId)}/generate-double-elimination-round`,
            {}
        );
    }
}

window.matchesApi = new MatchesApi();