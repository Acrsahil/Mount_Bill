// Utility functions for formatting and calculations

// Format date
export function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Helper function to show alerts
export function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    alert.innerHTML = `
<div class="alert-content">
    <span class="alert-message">${message}</span>
    <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
    </button>
</div>
`;

    // Add styles
    alert.style.cssText = `
position: fixed;
top: 20px;
right: 20px;
z-index: 10000;
min-width: 300px;
max-width: 500px;
background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
border-radius: 5px;
padding: 15px;
box-shadow: 0 4px 6px rgba(0,0,0,0.1);
color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
`;

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

// Update item total
export function updateItemTotal(itemId, invoiceItems) {
    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discountPercent = Number(item.discountPercent) || 0;

    const discountAmount = quantity * price * (discountPercent / 100);
    const total = (quantity * price) - discountAmount;

    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`)?.closest('tr');
    if (!row) return;

    const itemTotalCell = row.querySelector('.item-total');
    if (!itemTotalCell) return;

    itemTotalCell.textContent = `Rs. ${total.toFixed(2)}`;
}

// Update totals
// Enhanced updateTotals to include additional charges
export function updateTotals(invoiceItems, globalDiscount, globalTax) {
    let subtotal = 0;
    let subtotalDiscountvalue = 0;
    let subtotalAmountValue = 0;
    console.log("utilko subtotal")
    // Calculate subtotal from all items
    invoiceItems.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discountPercent = Number(item.discountPercent) || 0;

        const itemTotal = quantity * price;
        const discountAmount = itemTotal * (discountPercent / 100);
        const rowTotalAfterDiscount = itemTotal - discountAmount;

        subtotal += itemTotal;
        subtotalDiscountvalue += discountAmount;
        subtotalAmountValue += rowTotalAfterDiscount;
    });
    console.log("aaunu parne subtotal discount pani garisakerw",subtotalAmountValue)


    // **Sum all additional charges dynamically**
    let additionalChargesTotal = 0;
    document.querySelectorAll('#additionalInputsContainer input[type="number"]').forEach(input => {
        additionalChargesTotal += Number(input.value) || 0;
    });
    
    // Update display
    const subtotalAmount = document.getElementById('subtotalAmount');
    const subtotalAmountEl = document.getElementById('subtotalAmounts');
    const subtotalDiscounts = document.getElementById('subtotalDiscount');
    const discountAmountEl = document.getElementById('discountAmount');
    const taxAmountEl = document.getElementById('taxAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    // const pailakototal=document.getElementById('subtotalAmounts');

    //yo chai hamro discount laaerw aako subtotal esma garne sab calculation
    const subtotalValue = Number(subtotalAmountEl.innerText.replace('$', ''));


    //esma hamile subtotal ko value haalexum tyo chai without discount ko value item ko just quantity*price
    // Calculate discount amount (percentage of subtotal)
    const discountValue = (subtotalValue * globalDiscount) / 100;
    // console.log("discount amount yo ho ",discountValue)

    // Calculate taxable amount (after discount)
    const taxableAmount = subtotalValue - discountValue;
    // console.log("tax yo amount ma jodinxa",taxableAmount)


    // Calculate tax amount (percentage of taxable amount)
    const taxValue = (taxableAmount * globalTax) / 100;

     // Calculate final total including additional charges
    const total = taxableAmount + taxValue + additionalChargesTotal;
    window.currentTotalValue=total;
    console.log("yo total chai global total",total);

    if (subtotalAmountEl) subtotalAmountEl.textContent = `$${subtotalAmountValue.toFixed(2)}`;
    if (subtotalAmount) subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    if (subtotalDiscounts) subtotalDiscounts.textContent = `$${subtotalDiscountvalue.toFixed(2)}`;
    if (discountAmountEl) discountAmountEl.textContent = `$${discountValue.toFixed(2)}`;
    if (taxAmountEl) taxAmountEl.textContent = `$${taxValue.toFixed(2)}`;
    if (totalAmountEl) totalAmountEl.value = `$${total.toFixed(2)}`;
}


// Update stats
export function updateStats(invoices) {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');

    const paidAmount = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    const totalInvoicesEl = document.getElementById('totalInvoices');
    const paidAmountEl = document.getElementById('paidAmount');
    const pendingAmountEl = document.getElementById('pendingAmount');
    const overdueAmountEl = document.getElementById('overdueAmount');
    
    if (totalInvoicesEl) totalInvoicesEl.textContent = totalInvoices;
    if (paidAmountEl) paidAmountEl.textContent = `$${paidAmount.toFixed(2)}`;
    if (pendingAmountEl) pendingAmountEl.textContent = `$${pendingAmount.toFixed(2)}`;
    if (overdueAmountEl) overdueAmountEl.textContent = `$${overdueAmount.toFixed(2)}`;
}

// Update client stats
export function updateClientStats(clients) {
    const totalClients = clients.length;
    const activeClients = clients.length;
    const clientInvoices = clients.reduce((sum, client) => sum + (client.totalInvoices || 0), 0);
    const clientRevenue = clients.reduce((sum, client) => sum + (client.totalSpent || 0), 0);

    const totalClientsEl = document.getElementById('totalClients');
    const activeClientsEl = document.getElementById('activeClients');
    const clientInvoicesEl = document.getElementById('clientInvoices');
    const clientRevenueEl = document.getElementById('clientRevenue');
    
    if (totalClientsEl) totalClientsEl.textContent = totalClients;
    if (activeClientsEl) activeClientsEl.textContent = activeClients;
    if (clientInvoicesEl) clientInvoicesEl.textContent = clientInvoices;
    if (clientRevenueEl) clientRevenueEl.textContent = `$${clientRevenue.toFixed(2)}`;
}

