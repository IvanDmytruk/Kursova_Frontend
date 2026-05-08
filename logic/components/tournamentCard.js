// logic/components/tournamentCard.js
class TournamentCardComponent {
    static create(tournament) {
        const startDate = new Date(tournament.startDate);
        const endDate = tournament.endDate ? new Date(tournament.endDate) : null;

        const typeConfig = {
            'League': { icon: 'fa-ranking-star', color: 'primary' },
            'Cup': { icon: 'fa-trophy', color: 'warning' },
            'Friendly': { icon: 'fa-handshake', color: 'success' }
        };

        const config = typeConfig[tournament.tournamentType] || typeConfig['League'];

        return `
            <div class="col-md-6 col-lg-12">
                <div class="tournament-card" onclick="window.location.href='pages/tournament-details.html?id=${tournament.id}'">
                    <div class="tournament-header">
                        <h6 class="mb-0">${tournament.tournamentName}</h6>
                        <span class="tournament-prize">
                            <i class="fas fa-coins me-1"></i>${tournament.prizeFund || 0} грн
                        </span>
                    </div>
                    <div class="tournament-body">
                        <span class="tournament-type">
                            <i class="fas ${config.icon} me-1"></i>${tournament.tournamentType || 'Турнір'}
                        </span>
                        <p class="mt-2 small text-muted">${tournament.tournamentDescription || 'Опис відсутній'}</p>
                        <div class="tournament-dates">
                            <i class="far fa-calendar-alt me-1"></i>
                            ${DateFormatter.formatDate(startDate)}
                            ${endDate ? ` - ${DateFormatter.formatDate(endDate)}` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    static createSkeleton() {
        return `
            <div class="col-md-6 col-lg-12">
                <div class="skeleton skeleton-card"></div>
            </div>
        `;
    }
}

window.TournamentCardComponent = TournamentCardComponent;