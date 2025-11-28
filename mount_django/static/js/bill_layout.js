document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM fully loaded - bill_layout.html");
    
    const modal = document.getElementById("invoiceModal");
    const closeBtn = document.querySelector(".close");
    
    
    // Check if elements exist
    if (!modal) {
        console.error("Modal not found!");
        return;
    }
    
    if (!closeBtn) {
        console.error("Close button not found!");
    }
    
    // Add click event to view buttons using event delegation
    document.addEventListener("click", function(e) {
        if (e.target.classList.contains("action-view")) {
            console.log("Modal element:", modal);
            console.log("Close button:", closeBtn);
            console.log("View button clicked - opening modal");
            openModal();
        }
    });

    // Close modal when close button is clicked
    if (closeBtn) {
        closeBtn.addEventListener("click", function() {
            console.log("Close button clicked");
            closeModal();
        });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener("click", function(event) {
        if (event.target === modal) {
            console.log("Clicked outside modal");
            closeModal();
        }
    });

    // Close modal with Escape key
    document.addEventListener("keydown", function(event) {
        if (event.key === "Escape") {
            console.log("Escape key pressed");
            closeModal();
        }
    });

    function openModal() {
        console.log("Opening modal...");
        modal.style.display = "flex";
        console.log("Modal display style set to:", modal.style.display);
    }

    function closeModal() {
        console.log("Closing modal...");
        modal.style.display = "none";
    }
});
