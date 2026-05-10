// logic/components/searchBar.js
class SearchBar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.searchTimeout = null;
        this.suggestionsContainer = null;
        if (this.container) this.init();
    }

    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        this.container.innerHTML = `
            <div class="search-wrapper" style="position: relative;">
                <input type="text" id="global-search" class="form-control" style="border-radius: 50px; padding-left: 40px;" placeholder="Пошук матчів, турнірів, команд..." autocomplete="off">
                <i class="fas fa-search" style="position: absolute; left: 15px; top: 12px; color: #6c757d;"></i>
                <div id="search-suggestions" class="search-suggestions"></div>
            </div>
        `;
        this.suggestionsContainer = document.getElementById('search-suggestions');
        this.attachEvents();
    }

    attachEvents() {
        const searchInput = document.getElementById('global-search');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value;
            if (query.length < 2) {
                this.hideSuggestions();
                return;
            }
            this.searchTimeout = setTimeout(() => this.fetchSuggestions(query), 300);
        });

        document.addEventListener('click', (e) => {
            if (this.container && !this.container.contains(e.target)) this.hideSuggestions();
        });
    }

    async fetchSuggestions(query) {
        try {
            const apiUrl = API_CONFIG.baseUrl + API_CONFIG.endpoints.search + `/suggest?q=${encodeURIComponent(query)}&limit=10`;
            console.log('Search URL:', apiUrl);

            const response = await fetch(apiUrl);
            const data = await response.json();
            this.renderSuggestions(data.suggestions);
        } catch (error) {
            console.error('Search error:', error);
            this.hideSuggestions();
        }
    }

    renderSuggestions(suggestions) {
        if (!suggestions || suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.suggestionsContainer.innerHTML = suggestions.map(s => `
            <div class="suggestion-item" data-id="${s.id}" data-type="${s.type}">
                <div class="suggestion-icon">${s.icon || this.getIcon(s.type)}</div>
                <div class="suggestion-info">
                    <div class="suggestion-name">${this.escapeHtml(s.name)}</div>
                    <div class="suggestion-subtitle">${this.escapeHtml(s.subtitle)}</div>
                </div>
                <div class="suggestion-score">⭐ ${s.popularityScore || 0}</div>
            </div>
        `).join('');

        this.suggestionsContainer.classList.add('show');
        this.attachSuggestionEvents();
    }

    getIcon(type) {
        const icons = { team: '⚽', player: '👤', tournament: '🏆', match: '⚡' };
        return icons[type] || '📌';
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m] || m));
    }

    attachSuggestionEvents() {
        document.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = item.dataset.id;
                const type = item.dataset.type;

                try {
                    await fetch(API_CONFIG.baseUrl + API_CONFIG.endpoints.search + '/increment-popularity', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, type })
                    });
                } catch (error) { console.error('Error:', error); }

                const urls = {
                    team: `/pages/team-details.html?id=${id}`,
                    player: `/pages/player-details.html?id=${id}`,
                    tournament: `/pages/tournament-details.html?id=${id}`,
                    match: `/pages/match-details.html?matchId=${id}`
                };
                window.location.href = urls[type] || '#';
            });
        });
    }

    hideSuggestions() {
        if (this.suggestionsContainer) this.suggestionsContainer.classList.remove('show');
    }
}

window.SearchBar = SearchBar;