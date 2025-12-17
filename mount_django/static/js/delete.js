const to_delete = document.getElementById("invoicesTableBody");

to_delete.addEventListener("click", async (e) => {
    const deleteBtn = e.target.closest(".action-delete");
    if (!deleteBtn || !confirm("Are you sure you want to delete this invoice?")) return;
    
    const invoiceId = deleteBtn.getAttribute("data-id");
    const csrfToken = deleteBtn.getAttribute("data-token");
    
    try {
        const response = await fetch(`/dashboard/delete_invoice/${invoiceId}/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken, "X-Requested-With": "XMLHttpRequest" }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.success) deleteBtn.closest("tr").remove();
        else alert('Delete failed: ' + (data.message || 'Unknown error'));
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Network error. Please try again.');
    }
});
