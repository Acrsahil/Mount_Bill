document.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('error-popup');
    if (!popup) return;

    // Wait 3 seconds (3000 ms), then fade out
    setTimeout(function () {
      popup.classList.add('hide');

      // Remove from DOM after fade animation (0.5s)
      setTimeout(function () {
        popup.remove();
      }, 500);
    }, 3000); // change to 4000 for 4 seconds
  });
