// logic/pages/login.js
$(document).ready(function() {
    // Якщо користувач вже авторизований - редирект на головну
    if (localStorage.getItem('accessToken')) {
        window.location.href = '/index.html';
        return;
    }

    $('#loginForm').on('submit', handleLogin);
});

async function handleLogin(e) {
    e.preventDefault();

    const email = $('#email').val().trim();
    const password = $('#password').val();

    if (!email || !password) {
        showError('Будь ласка, заповніть всі поля');
        return;
    }

    try {
        $('#loginBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Вхід...');

        const response = await window.authApi.login(email, password);

        if (response && response.accessToken) {
            // Зберігаємо токени та дані користувача
            localStorage.setItem('accessToken', response.accessToken);
            localStorage.setItem('refreshToken', response.refreshToken);
            localStorage.setItem('refreshTokenExpiry', response.refreshTokenExpiry);
            localStorage.setItem('user', JSON.stringify(response.user));

            showSuccess('Вхід успішний! Перенаправлення...');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        } else {
            showError('Невірний email або пароль');
        }

    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Помилка входу. Перевірте email та пароль';
        if (error.message && error.message.includes('Unauthorized')) {
            errorMessage = 'Невірний email або пароль';
        }
        showError(errorMessage);
    } finally {
        $('#loginBtn').prop('disabled', false).html('<i class="fas fa-sign-in-alt me-2"></i>Увійти');
    }
}

function showError(message) {
    const alert = $(`
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('#loginForm').prepend(alert);
    setTimeout(() => alert.alert('close'), 5000);
}

function showSuccess(message) {
    const alert = $(`
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('#loginForm').prepend(alert);
}