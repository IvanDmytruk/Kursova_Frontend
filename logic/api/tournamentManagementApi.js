class TournamentManagementApi extends BaseApi {
    constructor() {
        super();
        this.root = `${this.baseUrl}/api/tournaments`;
    }

    tournamentUrl(tournamentId) {
        return `${this.root}/${encodeURIComponent(tournamentId)}`;
    }

    administrationUrl(tournamentId) {
        return `${this.tournamentUrl(tournamentId)}/administration`;
    }

    staffUrl(tournamentId) {
        return `${this.tournamentUrl(tournamentId)}/staff`;
    }

    async getManagers(tournamentId) {
        return this.get(this.staffUrl(tournamentId));
    }

    async assignManager(tournamentId, userId, permissions) {
        return this.post(this.staffUrl(tournamentId), {
            userId,
            ...(permissions !== undefined ? { permissions } : {})
        });
    }

    async updateManagerPermissions(tournamentId, userId, permissions) {
        return this.patch(
            `${this.staffUrl(tournamentId)}/${encodeURIComponent(userId)}/permissions`,
            { permissions }
        );
    }

    async removeManager(tournamentId, userId) {
        return super.delete(
            `${this.staffUrl(tournamentId)}/${encodeURIComponent(userId)}`
        );
    }

    async issueSanction(tournamentId, data) {
        return this.post(
            `${this.administrationUrl(tournamentId)}/sanctions`,
            data
        );
    }

    async getPlayerSanctions(tournamentId, playerId) {
        return this.get(
            `${this.administrationUrl(tournamentId)}` +
            `/sanctions/player/${encodeURIComponent(playerId)}`
        );
    }

    async revokeSanction(tournamentId, sanctionId, data) {
        return this.patch(
            `${this.administrationUrl(tournamentId)}` +
            `/sanctions/${encodeURIComponent(sanctionId)}/revoke`,
            data
        );
    }

    async disqualifyTeam(tournamentId, data) {
        return this.post(
            `${this.administrationUrl(tournamentId)}/teams/disqualify`,
            data
        );
    }

    async getAudit(tournamentId) {
        return this.get(
            `${this.administrationUrl(tournamentId)}/audit`
        );
    }
}

window.tournamentManagementApi = new TournamentManagementApi();