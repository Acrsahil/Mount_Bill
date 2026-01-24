//Transaction table fill up 
export async function fetchTransactionForDashboard(){
    const dashboardTableBody = document.getElementById('dashboardTableBody');
    const res = await fetch(`/dashboard/fetch-all-transactions/`);
    const data = await res.json();
    console.log("k k value aaudae xa",data)
    if(dashboardTableBody){
        dashboardTableBody.innerHTML = '';
        // Load each row
        data.transactions.forEach(transaction => loadTransactionInDashboard(transaction, dashboardTableBody));
    }
    
}

function loadTransactionInDashboard(transaction, dashboardTableBody){
    const row = document.createElement('tr');
    
    row.classList.add(
    "cursor-pointer",
    "hover:bg-gray-100",
    "transition"
);
    row.dataset.type = transaction.type;
    row.dataset.id = transaction.id || "";
    if (transaction.type === 'sale') {
        row.innerHTML = `
        <td>${transaction.date.split('T')[0]}</td>
        <td>Sales Invoice #${transaction.id}>
        <td>${transaction.name}</td>
        <td>${transaction.finalAmount}</td>
        <td>${Number(transaction.receivedAmount) === 0 ? '---' : transaction.receivedAmount}</td>
        <td>${Number(transaction.dueAmount) === 0 ? '---' : transaction.dueAmount}</td>
        `;

    }else if (transaction.type === 'paymentIn') {
        row.innerHTML = `
        <td>${transaction.date.split('T')[0]}</td>
        <td>Payment In#${transaction.id}</td>
        <td>${transaction.name}</td>
        <td>${transaction.payment_in}</td>
        <td>${transaction.payment_in}</td>
        <td>---</td>`;
    }else if (transaction.type === 'paymentOut') {
        row.innerHTML = `
        <td>${transaction.date.split('T')[0]}</td>
        <td>Payment Out #${transaction.id}</td>
        <td>${transaction.name}</td>
        <td>${transaction.payment_out}</td>
        <td>${transaction.payment_out}</td>
        <td>---</td>`;
    }else if (transaction.type === 'purchase') {
        row.innerHTML = `
        <td>${transaction.date.split('T')[0]}</td>
        <td>Purchase</td>
        <td>${transaction.name}</td>
        <td>${transaction.total_amount}</td>
        <td>${transaction.receivedAmount}</td>
        <td>${Number(transaction.dueAmount) === 0 ? '---' : transaction.dueAmount}</td>`;
    }
    dashboardTableBody.appendChild(row)
}