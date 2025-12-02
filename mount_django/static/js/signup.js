function toggleSignUpPassword(fieldId, buttonId) {
    const passwordField = document.getElementById(fieldId);
    const toggleBtn = document.getElementById(buttonId);

    toggleBtn.addEventListener("click", () => {

        if (passwordField.type === "password") {
            passwordField.type = "text";
            toggleBtn.className = ("fas fa-eye-slash");

        } else {
            passwordField.type = "password";
            toggleBtn.className = ("fas fa-eye");
        }
    });
}


toggleSignUpPassword("id_password1", "toggle_id1");
toggleSignUpPassword("id_password2", "toggle_id2");

function addInputEffects() {
    const inputs = document.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
        // find the nearest .sign-up-form wrapper
        const wrapper = input.closest('.input-with-icon');

        if (!wrapper) return;

        input.addEventListener('focus', () => {
            wrapper.style.transform = 'scale(1.02)';
        });

        input.addEventListener('blur', () => {
            wrapper.style.transform = 'scale(1)';
        });
    });
}

// Run after DOM loads
document.addEventListener("DOMContentLoaded", addInputEffects);
