class TournamentParticipationApi extends BaseApi {
    constructor() {
        super();
        this.root = `${this.baseUrl}/api/Tournaments`;
    }

    tournamentUrl(id) {
        return `${this.root}/${encodeURIComponent(id)}`;
    }

    requestUrl(id) {
        return `${this.root}/requests/${encodeURIComponent(id)}`;
    }

    async applyTeam(tournamentId, teamId) {
        return this.post(
            `${this.tournamentUrl(tournamentId)}/applications`,
            { teamId, playerId: "" }
        );
    }

    async applyPlayer(tournamentId, playerId) {
        return this.post(
            `${this.tournamentUrl(tournamentId)}/applications`,
            { teamId: "", playerId }
        );
    }

    async inviteTeam(tournamentId, teamId) {
        return this.post(
            `${this.tournamentUrl(tournamentId)}/invitations`,
            { teamId, playerId: "" }
        );
    }

    async invitePlayer(tournamentId, playerId) {
        return this.post(
            `${this.tournamentUrl(tournamentId)}/invitations`,
            { teamId: "", playerId }
        );
    }

    async getTournamentRequests(tournamentId) {
        return this.get(
            `${this.tournamentUrl(tournamentId)}/requests`
        );
    }

    async getMyRequests() {
        return this.get(`${this.root}/requests/my`);
    }

    async accept(id) {
        return this.patch(`${this.requestUrl(id)}/accept`, {});
    }

    async reject(id) {
        return this.patch(`${this.requestUrl(id)}/reject`, {});
    }

    async cancel(id) {
        return this.patch(`${this.requestUrl(id)}/cancel`, {});
    }
}

window.tournamentParticipationApi =
    new TournamentParticipationApi();
