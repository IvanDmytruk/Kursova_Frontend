// logic/api/searchApi.js

async function searchSuggestions(query, limit = 10) {
    try {
        // Правильно: використовуємо baseUrl з API_CONFIG + ендпоінт search
        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.search}/suggest?q=${encodeURIComponent(query)}&limit=${limit}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Search error:', error);
        return { query, suggestions: [] };
    }
}

async function incrementPopularity(id, type) {
    try {
        const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoints.search}/increment-popularity`;
        await fetch(url, {
            method: 'POST',
            headers: API_CONFIG.defaultHeaders,
            body: JSON.stringify({ id, type })
        });
    } catch (error) {
        console.error('Failed to increment popularity:', error);
    }
}

// Глобальний доступ
window.searchSuggestions = searchSuggestions;
window.incrementPopularity = incrementPopularity;