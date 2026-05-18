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

    async getActiveBySport(sport) {
        return this.get(`${this.baseUrl}${this.endpoint}/active?sport=${sport}`);
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

    async deleteTournament(id) {
        return this.delete(`${this.baseUrl}${this.endpoint}/${id}`);
    }

    async addTeam(tournamentId, teamId) {
        console.log('📤 addTeam called with:', { tournamentId, teamId });
        console.log('🔑 Token:', localStorage.getItem('accessToken')?.substring(0, 50) + '...');

        try {
            const url = `${this.baseUrl}${this.endpoint}/${tournamentId}/teams/${teamId}`;
            console.log('📍 URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response status text:', response.statusText);

            const responseText = await response.text();
            console.log('📥 Response body:', responseText);

            if (response.ok) {
                console.log('✅ Team added successfully');
                return true;
            }

            let errorMessage = `Failed to add team (${response.status})`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || errorJson.title || errorMessage;
            } catch {
                if (responseText) errorMessage = responseText;
            }

            throw new Error(errorMessage);
        } catch (error) {
            console.error('❌ Add team error:', error);
            throw error;
        }
    }

    async removeTeam(tournamentId, teamId) {
        console.log('📤 removeTeam called with:', { tournamentId, teamId });
        console.log('🔑 Token:', localStorage.getItem('accessToken')?.substring(0, 50) + '...');

        try {
            const url = `${this.baseUrl}${this.endpoint}/${tournamentId}/teams/${teamId}`;
            console.log('📍 URL:', url);

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response status text:', response.statusText);

            const responseText = await response.text();
            console.log('📥 Response body:', responseText);

            if (response.ok) {
                console.log('✅ Team removed successfully');
                return true;
            }

            let errorMessage = `Failed to remove team (${response.status})`;
            try {
                const errorJson = JSON.parse(responseText);
                errorMessage = errorJson.message || errorJson.title || errorMessage;
            } catch {
                if (responseText) errorMessage = responseText;
            }

            throw new Error(errorMessage);
        } catch (error) {
            console.error('❌ Remove team error:', error);
            throw error;
        }
    }

    async registerTeam(tournamentId, teamId) {
        return this.post(`${this.baseUrl}${this.endpoint}/${tournamentId}/register`, { teamId: teamId });
    }

    async registerPlayer(tournamentId) {
        return this.post(`${this.baseUrl}${this.endpoint}/${tournamentId}/register`, {});
    }
}

window.tournamentsApi = new TournamentsApi();