import { loadClients } from "./dom.js";
import { selectClientFromHint } from "./events.js";
import{ activateTabAll } from "./client.js";
import { showAlert } from "./utils.js";
document.addEventListener('DOMContentLoaded', () => {
    addClientsToList(window.djangoData.clients)
    updateClientInfo(window.djangoData.clients)

    //functional add new client inside the client detail page
    const addNewClientDetailBtn = document.getElementById('addNewClientDetailBtn');
    addNewClientDetailBtn.addEventListener('click',() => {
        const addClientModal = document.getElementById('addClientModal')
        resetClientModal()
        addClientModal.style.display = 'flex';
    })
});

export function resetClientModal(){
    document.querySelector('.app-modal-header h3').textContent = "Add New Client";
    document.getElementById('saveClientBtn').style.display = 'block';
    document.getElementById('updateClientBtn').style.display = 'none';
    document.getElementById('additionalInfo').style.display = 'none';
    document.getElementById('additionInfoBtn').style.display = 'block';

    //resetting the form field
    document.getElementById('clientNameInput').value = '';
    document.getElementById('clientPhoneInput').value = '';
    document.getElementById('clientAddressInput').value = '';
    document.getElementById('clientPanNoInput').value = '';
    document.getElementById('clientEmailInput').value = '';
}
//editing the client 

const clientEditBtn = document.getElementById('clientEditBtn')

//calling edit function after the edit button is clicked
document.addEventListener('DOMContentLoaded',() =>{
    clientEditBtn.addEventListener('click',async() => {
        editClientFunc(clientEditBtn.dataset.clientId)
})

//update button inside the edit modal
    const updateClientBtn = document.getElementById('updateClientBtn');
    updateClientBtn.addEventListener('click',async()=>{
        
        await updateClientFunc(clientEditBtn.dataset.clientId);
    })
})

function editClientFunc(clientId){
    const client = window.djangoData.clients.find(c => String(c.id) === String(clientId))
    //populating the form 

    document.getElementById('clientNameInput').value = client.name;
    document.getElementById('clientPhoneInput').value = client.phone || '';
    document.getElementById('clientAddressInput').value = client.address || '';
    document.getElementById('clientPanNoInput').value = client.pan_id || '';
    document.getElementById('clientEmailInput').value = client.email || '';


    //resetting the modal form    
    document.querySelector('.app-modal-header h3').textContent = "Update Client";
    document.getElementById('saveClientBtn').style.display = 'none';
    document.getElementById('updateClientBtn').style.display = 'block';
    addClientModal.style.display = 'flex';
    document.getElementById('additionalInfo').style.display = 'block';
    document.getElementById('additionInfoBtn').style.display = 'none';
    activateTabAll();
}

//udpate function for client
async function updateClientFunc(clientId){
    console.log("ya id aayo tw???????",clientId)
        const clientName= document.getElementById('clientNameInput').value.trim();
        const clientPhone = document.getElementById('clientPhoneInput')?.value;
        const clientAddress = document.getElementById('clientAddressInput')?.value;
        const clientPanNo = document.getElementById('clientPanNoInput')?.value;
        const clientEmail = document.getElementById('clientEmailInput').value.trim();
    
        // Client-side validation
        if (!clientName) {
            showAlert('Please enter client name', 'error');
            document.getElementById('clientNameInput').focus();
            return;
        }
    
        // Show loading state
        const updateClientBtn = document.getElementById('updateClientBtn');
        const originalText = updateClientBtn.innerHTML;
        
        updateClientBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
        updateClientBtn.disabled = true;
    
        try {
            // Prepare data for sending
            const clientData = {
                id: clientId,
                clientName: clientName,
                clientPhone: clientPhone,
                clientAddress: clientAddress,
                clientPan: clientPanNo,
                clientEmail: clientEmail,
    
            };
            // Send AJAX request to Django
            const response = await fetch(`/dashboard/client-update/${clientId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(clientData)
            });
    
            const result = await response.json();
            console.log('Server response yaa ko ho tw:', result);
    
            if (result.success) {
                // Show success message
                showAlert(result.message, 'success');
                //updating the client details instantly
                document.getElementById('clientName').textContent = clientName 
                document.getElementById('clientDetail').textContent = clientAddress || clientPhone || "---" 
    
                //updating instantly on the list of the table
                const clients = await fetchclients()
                addClientsToList(clients)

                // Close modal after short delay
                setTimeout(() => {
                    const closeClientModalFunc = () => {
                        if (addClientModal) {
                            addClientModal.style.display = 'none';
                        }
                    };
                    closeClientModalFunc();
                    
                    // Reset form
                    document.getElementById('clientNameInput').value = '';
                    document.getElementById('clientPhoneInput').value = '';
                    document.getElementById('clientAddressInput').value = '';
                    document.getElementById('clientPanNoInput').value = '';
                    document.getElementById('clientEmailInput').value = '';
                }, 1500);
    
            } else {
                showAlert('Error: ' + (result.error || 'Failed to edit client'), 'error');
            }
    
        } catch (error) {
            console.error('Error updating:', error);
            showAlert('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Restore button state
            updateClientBtn.innerHTML = originalText;
            updateClientBtn.disabled = false;
        }
   
}



//to get uid from the url
function getUidFromUrl(){
    const urlUid = window.location.pathname.split('/').filter(Boolean);
    return urlUid[urlUid.length - 1]
    
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
    const clientDetail = document.getElementById('clientDetail');
    clientName.textContent = selectedClients.name;
    clientDetail.textContent = selectedClients.address || selectedClients.phone || "---";

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
  return data.clients;
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
    li.dataset.clientUid = client.uid;
    //select the list according to the uid
    
    const clientUid = getUidFromUrl()
    if(clientUid && String(clientUid) == client.uid){
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
        fetchTransactions(client.uid)
        addTransaction.dataset.clientId = client.id;

        //client id for editing client
        clientEditBtn.dataset.clientId = client.id;
    }
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
        document.getElementById('clientDetail').textContent = client.address || client.phone || '---';
        fetchTransactions(client.uid)
        addTransaction.dataset.clientId = client.id;

        //client id for editing client
        clientEditBtn.dataset.clientId = client.id;
        
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

    //highlight the list again
    const urlUid = getUidFromUrl();
    document.querySelectorAll('.clientlists').forEach(li => {
    if(String(li.dataset.clientUid) === String(urlUid)){
        li.classList.add('selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium');
    }
    else{
        li.classList.remove('selected',
                'bg-blue-100',
                'border-blue-200',
                'text-blue-700',
                'font-medium');
        li.classList.add('border-gray-100', 'text-gray-700');
    }
})
})


//Transaction table fill up 
async function fetchTransactions(clientUid){
    const clientTransactionTableBody = document.getElementById('clientTransactionTableBody');
    const res = await fetch(`/dashboard/fetch-transactions/${clientUid}`);
    const data = await res.json();
    
    clientTransactionTableBody.innerHTML = '';

    // Load each row
    data.transactions.forEach(transaction => loadTransactions(transaction, clientTransactionTableBody));
}


function loadTransactions(transaction, tableBody) {
    if (!tableBody) return;

    const row = document.createElement('tr');

    if (transaction.type === 'sale') {
        row.innerHTML = `
        <td>Sales Invoice #${transaction.id}>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.finalAmount}</td>
        <td>Sale</td>
        <td>${transaction.remainingAmount}</td>
        <td>${transaction.remarks || "---"}</td>`;

    } else if (transaction.type === 'payment') {
        row.innerHTML = `
        <td>Payment #${transaction.id}</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.payment_in}</td>
        <td>Payment</td>
        <td>${transaction.remainingAmount}</td>
        <td>${transaction.remarks || "---"}</td>`;
    }

    tableBody.appendChild(row);
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

    //set the id of the save immediately after the paymentIn list is clicked 
    const savePaymentIn = document.getElementById('savePaymentIn');
    savePaymentIn.dataset.clientIds = addTransaction.dataset.clientId;

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

    //saving payment in transaction
    const savePaymentIn = document.getElementById('savePaymentIn');
    savePaymentIn.addEventListener('click',async() => {
        console.log("esko id aako xaina po",savePaymentIn.dataset.clientIds)
        await savePaymentInFunc(savePaymentIn.dataset.clientIds);
        paymentModal.classList.add('hidden');
    })
});

//savePaymentIn funcion 
async function savePaymentInFunc(clientId){
    const receivedAmountIn = document.getElementById('receivedAmountIn')?.value;
    const paymentInDate = document.getElementById('paymentInDate')?.value;
    const paymentInRemarks = document.getElementById('paymentInRemarks')?.value;
    
    //preparing data to send
    try{
        const paymentIn = {
            payment_in:receivedAmountIn,
            payment_in_date:paymentInDate,
            payment_in_remark:paymentInRemarks,
        }
    // Send AJAX request to Django
        const response = await fetch(`/dashboard/payment-in/${clientId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(paymentIn)
        });

        const result = await response.json();
        console.log('Server response:', result);

    }catch (error) {
        console.error('Error receiving amount:', error);
}
}

