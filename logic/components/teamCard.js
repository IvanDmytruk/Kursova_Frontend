// logic/components/teamCard.js
class TeamCardComponent {
    static create(team) {
        return `
            <div class="col-md-4 col-lg-3">
                <div class="team-card" onclick="window.location.href='pages/team-details.html?id=${team.id}'">
                    <div class="team-card-logo">
                        ${this.getTeamIcon(team.teamName)}
                    </div>
                    <h6 class="team-card-name">${team.teamName}</h6>
                    <div class="team-card-stats">
                        <span><i class="fas fa-trophy me-1"></i>0 турнірів</span>
                    </div>
                </div>
            </div>
        `;
    }

    static getTeamIcon(teamName) {
        const firstLetter = teamName ? teamName.charAt(0).toUpperCase() : '?';
        return `<span class="display-6">${firstLetter}</span>`;
    }

    static createSkeleton() {
        return `
            <div class="col-md-4 col-lg-3">
                <div class="skeleton skeleton-card" style="height: 180px;"></div>
            </div>
        `;
    }
}

window.TeamCardComponent = TeamCardComponent;