// logic/utils/dateFormatter.js
const DateFormatter = {
    // Форматування дати
    formatDate(date, locale = 'uk-UA') {
        const d = new Date(date);
        return d.toLocaleDateString(locale, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Форматування часу
    formatTime(date, locale = 'uk-UA') {
        const d = new Date(date);
        return d.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Форматування дати та часу
    formatDateTime(date, locale = 'uk-UA') {
        const d = new Date(date);
        return `${this.formatDate(d, locale)} о ${this.formatTime(d, locale)}`;
    },

    // Перевірка чи сьогодні
    isToday(date) {
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    },

    // Перевірка чи завтра
    isTomorrow(date) {
        const d = new Date(date);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return d.toDateString() === tomorrow.toDateString();
    },

    // Отримати відносну дату (Сьогодні, Завтра, або дата)
    getRelativeDate(date) {
        if (this.isToday(date)) return 'Сьогодні';
        if (this.isTomorrow(date)) return 'Завтра';
        return this.formatDate(date);
    },

    // Перевірка чи матч розпочався
    isLive(matchStartTime, matchEndTime = null) {
        const start = new Date(matchStartTime);
        const now = new Date();
        const end = matchEndTime ? new Date(matchEndTime) : new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2 години за замовчуванням

        return now >= start && now <= end;
    },

    // Перевірка чи матч скоро (менше ніж за годину)
    isStartingSoon(matchStartTime) {
        const start = new Date(matchStartTime);
        const now = new Date();
        const diffMs = start - now;
        const diffHours = diffMs / (1000 * 60 * 60);

        return diffMs > 0 && diffHours <= 1;
    },

    // Отримати статус матчу
    getMatchStatus(matchStartTime, matchEndTime = null, customStatus = null) {
        if (customStatus === 'Finished') return 'finished';
        if (this.isLive(matchStartTime, matchEndTime)) return 'live';
        if (this.isStartingSoon(matchStartTime)) return 'soon';
        if (new Date(matchStartTime) > new Date()) return 'upcoming';
        return 'finished';
    }
};

window.DateFormatter = DateFormatter;