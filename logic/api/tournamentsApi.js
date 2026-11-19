class TournamentsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.tournaments;
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

    async getActive() {
        return this.get(`${this.url}/active`);
    }

    async getActiveBySport(sport) {
        return this.get(
            `${this.url}/active?sport=${encodeURIComponent(sport)}`
        );
    }

    async searchByName(name) {
        return this.get(
            `${this.url}/byname/${encodeURIComponent(name)}`
        );
    }

    async search(term) {
        return this.get(
            `${this.url}/search?term=${encodeURIComponent(term)}`
        );
    }

    async exists(name) {
        return this.get(
            `${this.url}/exists/${encodeURIComponent(name)}`
        );
    }

    async create(data) {
        return this.post(this.url, data);
    }

    async update(id, data) {
        return this.put(
            `${this.url}/${encodeURIComponent(id)}`,
            data
        );
    }

    async deleteTournament(id) {
        return super.delete(
            `${this.url}/${encodeURIComponent(id)}`
        );
    }

    async changeStatus(id, status) {
        return this.patch(
            `${this.url}/${encodeURIComponent(id)}/status`,
            { status }
        );
    }

    async registerTeam(tournamentId, teamId) {
        return this.post(
            `${this.url}/${encodeURIComponent(tournamentId)}/register`,
            { teamId }
        );
    }

    async registerPlayer(tournamentId) {
        return this.post(
            `${this.url}/${encodeURIComponent(tournamentId)}/register`,
            { teamId: "" }
        );
    }

    async addTeam(tournamentId, teamId) {
        return this.post(
            `${this.url}/${encodeURIComponent(tournamentId)}` +
            `/teams/${encodeURIComponent(teamId)}`,
            {}
        );
    }

    async removeTeam(tournamentId, teamId) {
        return super.delete(
            `${this.url}/${encodeURIComponent(tournamentId)}` +
            `/teams/${encodeURIComponent(teamId)}`
        );
    }

    async generateOlympicFirstRound(tournamentId) {
        return this.post(
            `${this.url}/${encodeURIComponent(tournamentId)}` +
            `/olympic/generate-first-round`,
            {}
        );
    }

    async generateOlympicNextRound(tournamentId) {
        return this.post(
            `${this.url}/${encodeURIComponent(tournamentId)}` +
            `/olympic/generate-next-round`,
            {}
        );
    }

    async getStandings(tournamentId) {
        return this.get(
            `${this.url}/${encodeURIComponent(tournamentId)}/standings`
        );
    }
    async suggestPlan(data) {
        return this.post(
            `${this.baseUrl}/api/tournaments/planning/suggest`,
            data
        );
    }
}

window.tournamentsApi = new TournamentsApi();