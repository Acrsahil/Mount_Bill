// invoiceTab.js - SUPER SIMPLE
export function setupInvoiceTab() {
    // Just setup click handler
    const invoiceTab = document.querySelector('[data-tab="invoices"]');
    
    if (invoiceTab) {
        invoiceTab.addEventListener('click', function(e) {
            e.preventDefault();
            // Update URL only
            window.history.pushState({}, '', '/dashboard/invoices/');
            // Let Django handle the page reload
            window.location.href = '/dashboard/invoices/';
        });
    }
}
