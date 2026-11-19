class TeamsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = API_CONFIG.endpoints.teams;
    }

    get url() {
        return `${this.baseUrl}${this.endpoint}`;
    }

    id(value) {
        return encodeURIComponent(value);
    }

    async getAll() {
        return this.get(this.url);
    }

    async getById(id) {
        return this.get(`${this.url}/${this.id(id)}`);
    }

    async getPlayers(teamId) {
        return this.get(`${this.url}/${this.id(teamId)}/players`);
    }

    async search(term) {
        return this.get(
            `${this.url}/search?term=${encodeURIComponent(term)}`
        );
    }

    async searchByName(name) {
        return this.get(`${this.url}/byname/${this.id(name)}`);
    }

    async exists(name) {
        return this.get(`${this.url}/exists/${this.id(name)}`);
    }

    async getPaged(page = 1, pageSize = 12) {
        return this.get(
            `${this.url}/paged?page=${page}&pageSize=${pageSize}`
        );
    }

    async getBySport(sport) {
        const teams = await this.getAll();

        if (sport === "all") return teams;

        return teams.filter(team =>
            String(team.sportName).toLowerCase() ===
            String(sport).toLowerCase()
        );
    }

    async create(data) {
        return this.post(this.url, data);
    }

    async update(id, data) {
        return this.put(`${this.url}/${this.id(id)}`, data);
    }

    async delete(id) {
        return super.delete(`${this.url}/${this.id(id)}`);
    }

    async getMyTeams() {
        return this.get(`${this.url}/my`);
    }

    async getMembers(teamId) {
        return this.get(
            `${this.url}/${this.id(teamId)}/members`
        );
    }

    async changeMemberRole(teamId, userId, role) {
        return this.patch(
            `${this.url}/${this.id(teamId)}/members/${this.id(userId)}`,
            { role }
        );
    }

    async removeMember(teamId, userId) {
        return super.delete(
            `${this.url}/${this.id(teamId)}/members/${this.id(userId)}`
        );
    }

    async leaveTeam(teamId) {
        return this.post(
            `${this.url}/${this.id(teamId)}/leave`,
            {}
        );
    }

    async inviteMember(teamId, userId, role = "Player") {
        return this.post(
            `${this.url}/${this.id(teamId)}/invitations`,
            { userId, role }
        );
    }

    async getTeamInvitations(teamId) {
        return this.get(
            `${this.url}/${this.id(teamId)}/invitations`
        );
    }

    async getMyInvitations() {
        return this.get(`${this.url}/invitations/my`);
    }

    async acceptInvitation(invitationId) {
        return this.patch(
            `${this.url}/invitations/${this.id(invitationId)}/accept`,
            {}
        );
    }

    async rejectInvitation(invitationId) {
        return this.patch(
            `${this.url}/invitations/${this.id(invitationId)}/reject`,
            {}
        );
    }

    async cancelInvitation(invitationId) {
        return this.patch(
            `${this.url}/invitations/${this.id(invitationId)}/cancel`,
            {}
        );
    }
}

window.teamsApi = new TeamsApi();
