// logic/pages/register.js
$(document).ready(function() {
    $('#registerForm').on('submit', handleRegister);
});

async function handleRegister(e) {
    e.preventDefault();

    const fullName = $('#fullName').val().trim();
    const email = $('#email').val().trim();
    const password = $('#password').val();
    const confirmPassword = $('#confirmPassword').val();

    // Валідація
    if (!fullName || !email || !password) {
        showError('Будь ласка, заповніть всі поля');
        return;
    }

    if (password.length < 6) {
        showError('Пароль повинен містити мінімум 6 символів');
        return;
    }

    if (password !== confirmPassword) {
        showError('Паролі не співпадають');
        return;
    }

    // Валідація email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Введіть коректний email');
        return;
    }

    try {
        $('#registerBtn').prop('disabled', true).html('<i class="fas fa-spinner fa-spin me-2"></i>Реєстрація...');

        const response = await window.authApi.register(fullName, email, password);

        if (response && response.userId) {
            showSuccess('Реєстрація успішна! Перенаправлення на сторінку входу...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showError(response?.message || 'Помилка реєстрації');
        }

    } catch (error) {
        console.error('Registration error:', error);
        let errorMessage = 'Помилка реєстрації';
        if (error.message) {
            if (error.message.includes('User already exists')) {
                errorMessage = 'Користувач з таким email вже існує';
            } else {
                errorMessage = error.message;
            }
        }
        showError(errorMessage);
    } finally {
        $('#registerBtn').prop('disabled', false).html('<i class="fas fa-user-plus me-2"></i>Зареєструватися');
    }
}

function showError(message) {
    const alert = $(`
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('#registerForm').prepend(alert);
    setTimeout(() => alert.alert('close'), 5000);
}

function showSuccess(message) {
    const alert = $(`
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle me-2"></i>${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `);
    $('#registerForm').prepend(alert);
}