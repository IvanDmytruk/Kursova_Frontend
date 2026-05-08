// logic/utils/notifications.js
class NotificationManager {
    constructor() {
        this.toastContainer = null;
        this.initContainer();
    }

    initContainer() {
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            container.style.zIndex = '1100';
            document.body.appendChild(container);
            this.toastContainer = container;
        } else {
            this.toastContainer = document.querySelector('.toast-container');
        }
    }

    show(message, type = 'info', title = 'Сповіщення', duration = 5000) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const bgColors = {
            success: 'bg-success',
            error: 'bg-danger',
            warning: 'bg-warning',
            info: 'bg-info'
        };

        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" data-bs-autohide="true" data-bs-delay="${duration}">
                <div class="toast-header ${bgColors[type]} text-white">
                    <i class="fas ${icons[type]} me-2"></i>
                    <strong class="me-auto">${title}</strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        this.toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement);
        toast.show();

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    success(message, title = 'Успішно') {
        this.show(message, 'success', title);
    }

    error(message, title = 'Помилка') {
        this.show(message, 'error', title);
    }

    warning(message, title = 'Увага') {
        this.show(message, 'warning', title);
    }

    info(message, title = 'Інформація') {
        this.show(message, 'info', title);
    }

    async checkUpcomingMatches(matchesApi, hours = 24) {
        try {
            const matches = await matchesApi.getStartingSoon(hours);
            if (matches && matches.length > 0) {
                this.info(`Найближчим часом розпочнеться ${matches.length} матч(ів)`, 'Нагадування');
            }
            return matches;
        } catch (error) {
            console.error('Помилка перевірки матчів:', error);
            return [];
        }
    }
}

window.notifications = new NotificationManager();