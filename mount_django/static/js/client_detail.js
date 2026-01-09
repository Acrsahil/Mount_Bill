import { loadClients } from "./dom.js";
document.addEventListener('DOMContentLoaded', () => {
    addClientsToList(window.djangoData.clients)
    updateClientInfo(window.djangoData.clients)

    //functional add new client inside the client detail page
    const addNewClientDetailBtn = document.getElementById('addNewClientDetailBtn');
    addNewClientDetailBtn.addEventListener('click',() => {
        const addClientModal = document.getElementById('addClientModal')
        addClientModal.style.display = 'flex';
    })
});

//to get uid from the url
function getUidFromUrl(){
    const urlUid = window.location.pathname.split('/').filter(Boolean);
    const uid = urlUid[urlUid.length - 1]
    return uid
}

//get selected client from url
function getClientFromUid(clients){
    const uid = getUidFromUrl();
    return clients.find(c => String(c.uid) === String(uid)) || null;
}

//now dynamically change the client info 
function updateClientInfo(clients){
    const selectedClients = getClientFromUid(clients)
    const clientName = document.getElementById('clientName');
    const clientPhone = document.getElementById('clientPhone');
    clientName.textContent = selectedClients.name;
    clientPhone.textContent = selectedClients.phone;

}

// updating the client detail in clientsTableBody
async function fetchclients() {
  const res = await fetch('/dashboard/clients-json/', {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  const data = await res.json();
  const clientsTableBody = document.getElementById('clientsTableBody')
  loadClients(data.clients, clientsTableBody) 
}

//BFcache handling 
window.addEventListener('pageshow',() =>{
        fetchclients()
})

const addTransaction = document.getElementById('addTransaction')
//function to add the client to the list
export function renderClient(client) {
    const li = document.createElement('li');

    li.classList.add(
        'clientlists',
        'px-4',
        'py-3',
        'cursor-pointer',
        'transition-colors',
        'duration-150',
        'rounded-lg',
        'mb-1',
        'border',
        'border-gray-100',
        'hover:border-gray-300',
        'hover:bg-gray-50',
        'truncate',
        'text-gray-700'
    );

    li.textContent = client.name;

    li.addEventListener('click', () => {
        fetchclients()
        document.querySelectorAll('.clientlists').forEach(c => {
            c.classList.remove(
                'selected',
                'bg-blue-100',
                'border-blue-200',
                'text-blue-700',
                'font-medium'
            );
            c.classList.add('border-gray-100', 'text-gray-700');
        });

        li.classList.add(
            'selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium'
        );

        history.pushState({}, '', `/dashboard/client-detail/${client.uid}`);

        document.getElementById('clientName').textContent = client.name;
        document.getElementById('clientPhone').textContent = client.phone || '---';
        fetchTransactions(client.uid)
        addTransaction.dataset.clientId = client.id;
        
    });

    return li;
}

export function addClientsToList(clients) {
    const clientdetaillist = document.querySelector('.clientList');
    if (!clientdetaillist) return;

    clientdetaillist.innerHTML = '';
    clients.forEach(client => {
        clientdetaillist.appendChild(renderClient(client));
    });
}


//triggers the backward and forward event of the browser
window.addEventListener('popstate',()=>{
    updateClientInfo(window.djangoData.clients)
})


//Transaction table fill up 
async function fetchTransactions(clientUid){
    const clientTransactionTableBody = document.getElementById('clientTransactionTableBody')
    const res = await fetch(`/dashboard/fetch-transactions/${clientUid}`);
    const data = await res.json()
    console.log("yaa k xa",data)
    clientTransactionTableBody.innerHTML = '';
    data.transactions.reverse().forEach(transaction => loadTransactions(transaction,clientTransactionTableBody))
}

async function loadTransactions(transaction,clientTransactionTableBody){
    if(!clientTransactionTableBody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
    <td>Sales Invoice #${transaction.id}</td>
    <td>${transaction.date.split('T')[0]}</td>
    <td>${transaction.finalAmount}</td>
    <td>Status</td>
    <td>${transaction.remainingAmount}</td>
    <td>${transaction.remarks || "---"}</td>`;
    clientTransactionTableBody.appendChild(row)
}

//add transaction button functions
document.addEventListener('DOMContentLoaded', () => {
  const addTransaction = document.getElementById('addTransaction');
  const paymentTransactions = document.getElementById('paymentTransactions');

  addTransaction.addEventListener('click', (e) => {
    e.stopPropagation()
    const rect = addTransaction.getBoundingClientRect();

    paymentTransactions.style.top = rect.bottom + window.scrollY + 'px';
    paymentTransactions.style.left = rect.left + window.scrollX + 'px';

    paymentTransactions.classList.toggle('hidden');

    document.addEventListener('click', (e)=> {
        if(!paymentTransactions.contains(e.target)&& !addTransaction.contains(e.target)){
            paymentTransactions.classList.add('hidden');
        }
    })
  });

  //for payment in
  const paymentIn = document.getElementById('paymentIn');
  paymentIn.addEventListener('click',() => {

    //to fill up the form 
    paymentIn.dataset.clientId = addTransaction.dataset.clientId
    console.log("id aauna parxa",paymentIn.dataset.clientId)
    paymentTransactions.classList.add('hidden');
    paymentModal.classList.remove('hidden');
  })

  //clicking the close button
    const closeModalBtn = paymentModal.querySelector('button[aria-label="Close"]');

    closeModalBtn.addEventListener('click', () => {
    paymentModal.classList.add('hidden');
    });

    //clicking outside the modal
    paymentModal.addEventListener('click',(e) => {
        if(e.target === paymentModal){
            paymentModal.classList.add('hidden');
        }
    })

});



