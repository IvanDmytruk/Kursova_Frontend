//  pages/sportConfig.js
const SPORTS_CONFIG = {
    // Командні види спорту
    'Football': { icon: '⚽', name: 'Футбол', type: 'Team', endpoint: 'football' },
    'Basketball': { icon: '🏀', name: 'Баскетбол', type: 'Team', endpoint: 'basketball' },
    'Volleyball': { icon: '🏐', name: 'Волейбол', type: 'Team', endpoint: 'volleyball' },
    'Handball': { icon: '🤾', name: 'Гандбол', type: 'Team', endpoint: 'handball' },

    // Індивідуальні види спорту
    'Tennis': { icon: '🎾', name: 'Теніс', type: 'Individual', endpoint: 'tennis' },

    // Єдиноборства
    'Boxing': { icon: '🥊', name: 'Бокс', type: 'MartialArts', endpoint: 'boxing' },
    'Judo': { icon: '🥋', name: 'Дзюдо', type: 'MartialArts', endpoint: 'judo' },
    'Karate': { icon: '🥋', name: 'Карате', type: 'MartialArts', endpoint: 'karate' },

    // Настільні ігри
    'Chess': { icon: '♟️', name: 'Шахи', type: 'Board', endpoint: 'chess' },
    'Checkers': { icon: '⬛', name: 'Шашки', type: 'Board', endpoint: 'checkers' }
};