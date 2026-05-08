// logic/components/matchCard.js
class MatchCardComponent {
    static create(match, homeTeam, awayTeam) {
        const matchDate = new Date(match.startTime);
        const status = DateFormatter.getMatchStatus(match.startTime, null, match.status);

        const statusConfig = {
            live: { class: 'status-live', text: '🔴 LIVE', icon: 'fa-broadcast-tower' },
            soon: { class: 'status-soon', text: '⏰ Скоро', icon: 'fa-hourglass-half' },
            upcoming: { class: 'status-upcoming', text: '📅 Заплановано', icon: 'fa-calendar-day' },
            finished: { class: 'status-finished', text: '✅ Завершено', icon: 'fa-check-circle' }
        };

        const config = statusConfig[status] || statusConfig.upcoming;

        return `
            <div class="match-card" data-match-id="${match.id}" onclick="window.location.href='/pages/match-details.html?matchId=${match.id}'">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <span class="match-status ${config.class}">
                            <i class="fas ${config.icon} me-1"></i>${config.text}
                        </span>
                        <div class="match-info">
                            <span class="match-date">
                                <i class="far fa-calendar-alt me-1"></i>${DateFormatter.getRelativeDate(matchDate)}
                            </span>
                            <span class="match-time">
                                <i class="far fa-clock me-1"></i>${DateFormatter.formatTime(matchDate)}
                            </span>
                            ${match.ticketCost ? `
                                <span class="match-ticket">
                                    <i class="fas fa-ticket-alt me-1"></i>${match.ticketCost} грн
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    <div class="row align-items-center">
                        <div class="col-5 text-end">
                            <div class="team justify-content-end">
                                <span class="team-name fw-bold">${homeTeam?.teamName || 'Команда 1'}</span>
                                <div class="team-logo ms-2">
                                    ${this.getTeamIcon(homeTeam?.teamName)}
                                </div>
                            </div>
                        </div>
                        <div class="col-2 text-center">
                            <div class="vs-circle">
                                <span class="vs-text">VS</span>
                            </div>
                        </div>
                        <div class="col-5">
                            <div class="team">
                                <div class="team-logo me-2">
                                    ${this.getTeamIcon(awayTeam?.teamName)}
                                </div>
                                <span class="team-name fw-bold">${awayTeam?.teamName || 'Команда 2'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static getTeamIcon(teamName) {
        const firstLetter = teamName ? teamName.charAt(0).toUpperCase() : '?';
        return `<span class="d-flex align-items-center justify-content-center w-100 h-100">${firstLetter}</span>`;
    }

    static createSkeleton() {
        return `
            <div class="col-12">
                <div class="skeleton skeleton-card"></div>
            </div>
        `;
    }
}

window.MatchCardComponent = MatchCardComponent;