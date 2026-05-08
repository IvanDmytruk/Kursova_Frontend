// logic/api/savedItemsApi.js
class SavedItemsApi extends BaseApi {
    constructor() {
        super();
        this.endpoint = '/api/SavedItems';
    }

    async getUserSavedItems() {
        return this.get(`${this.baseUrl}${this.endpoint}`);
    }

    async saveMatch(matchId) {
        return this.post(`${this.baseUrl}${this.endpoint}/matches/${matchId}`, {});
    }

    async removeSavedMatch(matchId) {
        return this.delete(`${this.baseUrl}${this.endpoint}/matches/${matchId}`);
    }

    async isMatchSaved(matchId) {
        const items = await this.getUserSavedItems();
        return items?.savedMatches?.includes(matchId) || false;
    }
    async toggleSaveMatch(matchId, isCurrentlySaved) {
        if (isCurrentlySaved) {
            return this.removeSavedMatch(matchId);
        } else {
            return this.saveMatch(matchId);
        }
    }
    async saveTournament(tournamentId) {
        return this.post(`${this.baseUrl}${this.endpoint}/tournaments/${tournamentId}`, {});
    }

    async removeSavedTournament(tournamentId) {
        return this.delete(`${this.baseUrl}${this.endpoint}/tournaments/${tournamentId}`);
    }

    async toggleSaveTournament(tournamentId, isCurrentlySaved) {
        if (isCurrentlySaved) {
            return this.removeSavedTournament(tournamentId);
        } else {
            return this.saveTournament(tournamentId);
        }
    }
}

window.savedItemsApi = new SavedItemsApi();