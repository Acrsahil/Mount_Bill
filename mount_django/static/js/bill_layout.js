const modal = document.getElementById("invoiceModal");
const closeBtn = document.querySelector(".close");

    // Close modal when close button is clicked
if (closeBtn) {
    closeBtn.addEventListener("click", function() {
        closeModal();
        });
    }

    // Close modal when clicking outside the modal content
window.addEventListener("click", function(event) {
    if (event.target === modal) {
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

export function openModal() {
    modal.style.display = "none";
    console.log("helloworld i am pressed!!!!!!!!!!!!!!")
    }

function closeModal() {
    modal.style.display = "none";
    }

