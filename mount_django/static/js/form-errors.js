document.addEventListener("DOMContentLoaded", function () {
    const errorContainer = document.getElementById("error-container");

    // Get all hidden errors from the HTML
    const errors = document.querySelectorAll(".hidden-error");

    errors.forEach(errorEl => {
        const alert = document.createElement("div");
        alert.className = "toast-alert";
        alert.innerText = errorEl.innerText;
        errorContainer.appendChild(alert);

        // Remove after 3 seconds
        setTimeout(() => {
            alert.remove();
        }, 3000);
    });
});
