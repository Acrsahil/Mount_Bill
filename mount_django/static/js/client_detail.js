import { loadClients } from "./dom.js";
import { selectClientFromHint,saveClient } from "./events.js";
import{ activateTabAll } from "./client.js";
import { showAlert } from "./utils.js";
document.addEventListener('DOMContentLoaded', () => {
    addClientsToList(window.djangoData.clients)
    // updateClientInfo(window.djangoData.clients)
    renderFromUrl()

    //functional add new client inside the client detail page
    const addNewClientDetailBtn = document.getElementById('addNewClientDetailBtn');
    addNewClientDetailBtn.addEventListener('click',() => {
        const addClientModal = document.getElementById('addClientModal')
        resetClientModal()
        addClientModal.style.display = 'flex';
    })
    const closeClientModal = document.getElementById('closeClientModal');
    closeClientModal.addEventListener('click',()=>{
        resetClientModal()
        addClientModal.style.display = 'none';
    })
    const cancelClientBtn = document.getElementById('cancelClientBtn');
    cancelClientBtn.addEventListener('click',()=>{
        resetClientModal()
        addClientModal.style.display = 'none';
    })

    const saveClientBtn = document.getElementById('saveClientBtn');
    saveClientBtn.addEventListener('click',async()=>{
        await saveClient()
        addClientModal.style.display = 'none';

    })
});

export function resetClientModal(){
    document.querySelector('.app-modal-header h3').textContent = "Add New Client";
    document.getElementById('saveClientBtn').style.display = 'block';
    document.getElementById('updateClientBtn').style.display = 'none';
    document.getElementById('additionalInfo').style.display = 'none';
    document.getElementById('additionInfoBtn').style.display = 'block';
    document.getElementById('openingBalance').style.display = 'block';

    //resetting the form field
    document.getElementById('clientNameInput').value = '';
    document.getElementById('clientPhoneInput').value = '';
    document.getElementById('clientAddressInput').value = '';
    document.getElementById('clientPanNoInput').value = '';
    document.getElementById('clientEmailInput').value = '';
}

//deleting the client 
document.addEventListener('DOMContentLoaded',()=>{
    const deleteClientBtn = document.getElementById('deleteClientBtn')
    deleteClientBtn.addEventListener('click',()=>{
        console.log("kun delete hudae xa?",deleteClientBtn.dataset.clientId)
        deleteClient(deleteClientBtn.dataset.clientId)
    })
})

function showEmptyState() {
    document.getElementById('emptyState').classList.remove('hidden');
    document.getElementById('clientDetailContainer').classList.add('hidden');
    document.getElementById('notFound').classList.add('hidden');
}
function showClientState() {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('clientDetailContainer').classList.remove('hidden');
    document.getElementById('notFound').classList.add('hidden');
}
function showNotFound() {
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('clientDetailContainer').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
}

function renderFromUrl(){
    const uid = getUidFromUrl()
    const selectedClient = getClientFromUid(uid,window.djangoData.clients)
    if(!uid){
        showEmptyState()
        return;
    }
    else if(!selectedClient){
        showNotFound()
        return;
    }
    else{
        showClientState()
        return;
    }
}

async function deleteClient(clientId){
    const confirmed = confirm("Are you sure you want to delete this client?")
    if(confirmed){
        const res = await fetch(`/dashboard/delete-client/${clientId}/`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
            });
    const data = await res.json()
    console.log(data.success)

    if(data.success){
        
        window.djangoData.clients = window.djangoData.clients.filter(
        c => String(c.id) !== String(clientId)
    );
        history.replaceState({}, '', `/dashboard/client-detail/`);
        const li = document.querySelector(`.clientlists[data-id="${clientId.toString()}"]`);
        if(li) li.remove()
        
        const row = document.querySelector(`#clientsTableBody-${clientId.toString()}`);
        if (row) row.remove();
        renderFromUrl()        
        showAlert(data.message,'success');
    }
    else {
        showAlert('Error: ' + (data.error || 'Failed to delete client'), 'error');
        }
    }
     
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
    document.getElementById('openingBalance').style.display = 'none';
    activateTabAll();
}

//udpate function for client
async function updateClientFunc(clientId){
    
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
                
                addClientModal.style.display = 'none';
                    
                await new Promise(resolve => setTimeout(resolve,1500));
                // Reset form
                document.getElementById('clientNameInput').value = '';
                document.getElementById('clientPhoneInput').value = '';
                document.getElementById('clientAddressInput').value = '';
                document.getElementById('clientPanNoInput').value = '';
                document.getElementById('clientEmailInput').value = '';
                
    
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
    const parts = window.location.pathname.split('/').filter(Boolean);

    const idx = parts.indexOf('client-detail');
    if (idx === -1) return null;

    // "/dashboard/client-detail/" => no uid
    if (idx === parts.length - 1) return null;

    return parts[idx + 1]; // uid
    
}

//get selected client from url
function getClientFromUid(uid, clients){
    if (!uid) return null;
    return clients.find(c => String(c.uid) === String(uid)) || null;
}

//function to get latest client remaining amount
async function clientLatestRemaining(clientId){
    const res = await fetch(`/dashboard/clients-info/${clientId}/`);
    if (!res.ok) {
        throw new Error("Failed to fetch client info");
    }
    const data = await res.json();
    return data;
}
//now dynamically change the client info 
export async function updateClientInfo(clientId){
    // const selectedClients = getClientFromUid(clients)
    //fetching the remaining amount to update the receivable and payable parts
    const data = await clientLatestRemaining(clientId);
    const clientName = document.getElementById('clientName');
    const clientDetail = document.getElementById('clientDetail');
    const clientBalance = document.getElementById('clientRemaining');
    const clientStatus = document.getElementById('clientStatus')

    clientName.textContent = data.client_name;
    clientDetail.textContent = data.client_address || data.client_phone || "---";
    if(data.remaining == 0){
        clientStatus.textContent = "Settled"
    }
    else if(data.remaining < 0){
        clientStatus.textContent = "Payable"
    }
    else if(data.remaining > 0){
        clientStatus.textContent = "Receivable"
    }
    clientBalance.textContent = data.remaining;

    


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
const deleteClientBtn = document.getElementById('deleteClientBtn')
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
    li.dataset.id = client.id;
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
        deleteClientBtn.dataset.clientId = client.id;

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
        updateClientInfo(client.uid)
        fetchTransactions(client.uid)
        
        addTransaction.dataset.clientId = client.id;
        deleteClientBtn.dataset.clientId = client.id;
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

    //highlight the list again
    const urlUid = getUidFromUrl();
    const selectedClient = getClientFromUid(urlUid,window.djangoData.clients);
    console.log("selected client xa ki xaina??",selectedClient)
    renderFromUrl()
    if (!urlUid || !selectedClient) {
        return;
    }
    updateClientInfo(urlUid);
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
export async function fetchTransactions(clientUid){
    const clientTransactionTableBody = document.getElementById('clientTransactionTableBody');
    const res = await fetch(`/dashboard/fetch-transactions/${clientUid}`);
    const data = await res.json();
    if(!clientTransactionTableBody) return;
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
        <td>Payment In#${transaction.id}</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.payment_in}</td>
        <td>Payment</td>
        <td>${transaction.remainingAmount}</td>
        <td>${transaction.remarks || "---"}</td>`;
    }else if (transaction.type === 'paymentOut') {
        row.innerHTML = `
        <td>Payment Out #${transaction.id}</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.payment_out}</td>
        <td>Payment</td>
        <td>${transaction.remainingAmount}</td>
        <td>${transaction.remarks || "---"}</td>`;
    }else if (transaction.type === 'Opening' && Number(transaction.balance) !== 0 ) {
        row.innerHTML = `
        <td>Opening Balance</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.balance}</td>
        <td>--</td>
        <td>${transaction.balance}</td>
        <td>--</td>`;
    }else if (transaction.type === 'add' ) {
        row.innerHTML = `
        <td>Balance Adjustment(+)</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.amount}</td>
        <td>--</td>
        <td>${transaction.balance}</td>
        <td>${transaction.remarks}</td>`;
    }else if (transaction.type === 'reduce' ) {
        row.innerHTML = `
        <td>Balance Adjustment(-)</td>
        <td>${transaction.date.split('T')[0]}</td>
        <td>${transaction.amount}</td>
        <td>--</td>
        <td>${transaction.balance}</td>
        <td>${transaction.remarks}</td>`;
    }

    tableBody.appendChild(row);
}


// all the add transaction button functions
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
  paymentIn.addEventListener('click',async() => {
    //reset the payment in modal
    resetPaymentModal()
    //to fill up the form 
    paymentIn.dataset.clientId = getUidFromUrl()
    
    //set the id of the save immediately after the paymentIn list is clicked 
    const savePaymentIn = document.getElementById('savePaymentIn');
    savePaymentIn.dataset.clientId = addTransaction.dataset.clientId;

    paymentTransactions.classList.add('hidden');
    paymentModal.classList.remove('hidden');


    //populating the paymentModal 
    const data = await clientLatestRemaining(paymentIn.dataset.clientId);
    
    document.getElementById('partyName').value = data.client_name;
    document.getElementById('receiptNumber').value = data.latest_payment_id + 1
    document.getElementById('amountInput').focus();
    const paymentInDate = document.getElementById('paymentInDate')
    if (paymentInDate) {
        const today = new Date().toISOString().split('T')[0];
        paymentInDate.value = today;
    }

  })

  //clicking the close button
    const closeModalBtn = paymentModal.querySelector('button[aria-label="Close"]');

    closeModalBtn.addEventListener('click', () => {
    //emptying the form
    document.getElementById('receiptNumber').value ='';
    document.getElementById('amountInput').value = '';
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

        await savePaymentInFunc(savePaymentIn.dataset.clientId);
    })

    //for payment out 
    const paymentOut = document.getElementById('paymentOut');
    paymentOut.addEventListener('click',async()=>{

        paymentTransactions.classList.add('hidden');
        //resetting the modal form for payment out
        document.getElementById('paymentHeader').textContent = 'Add Payment Out';
        const savePaymentOut = document.getElementById('savePaymentOut');
        const savePaymentIn = document.getElementById('savePaymentIn');
        savePaymentOut.style.display ='block';
        savePaymentIn.style.display ='none';

        //to fill the form up
        paymentOut.dataset.clientId = getUidFromUrl()
        //populating the paymentModal 
        const data = await clientLatestRemaining(paymentOut.dataset.clientId);
        document.getElementById('partyName').value = data.client_name;
        document.getElementById('receiptNumber').value = data.latest_paymentout_id + 1
        document.getElementById('amountInput').focus();
        const paymentInDate = document.getElementById('paymentInDate')
        if (paymentInDate) {
            const today = new Date().toISOString().split('T')[0];
            paymentInDate.value = today;
        }

        //opening the add payment Out modal
        paymentModal.classList.remove('hidden');

    })

    //saving paymentOut
    const savePaymentOut = document.getElementById('savePaymentOut');
    
    
    savePaymentOut.addEventListener('click',async()=>{
        savePaymentOut.dataset.clientId = addTransaction.dataset.clientId;
        await savePaymentOutFunc(savePaymentOut.dataset.clientId )
    })

     //for sales invoice 
    const salesInvoice = document.getElementById('salesInvoice');
    salesInvoice.addEventListener('click',async()=>{
        salesInvoice.dataset.clientUid = getUidFromUrl()
        
        //go to the create-invoice with this query parameter
        window.location.href = `/dashboard/create-invoice/?clientId=${salesInvoice.dataset.clientUid}`;

})

//for adjust balance 
const adjustBalance = document.getElementById('adjustBalance');

adjustBalance.addEventListener('click',()=>{
    document.getElementById('adjustBalanceModal').classList.remove('hidden');
     const adjustmentDate = document.getElementById('adjustmentDate');
    if (adjustmentDate) {
        const today = new Date().toISOString().split('T')[0];
        adjustmentDate.value = today;
    }
    paymentTransactions.classList.add('hidden');

})

//closing the adjust balance modal
const closeAdjustBalance = document.getElementById('closeAdjustBalance');
const cancelAdjustBalance = document.getElementById('cancelAdjustBalance');
closeAdjustBalance.addEventListener('click',()=>{
    activateButton(addBtn, reduceBtn);
    document.getElementById('adjustBalanceModal').classList.add('hidden');
})
cancelAdjustBalance.addEventListener('click',()=>{
    activateButton(addBtn, reduceBtn);
    document.getElementById('adjustBalanceModal').classList.add('hidden');
})

//add Balance
// Elements
const addAmount = document.getElementById('addAmount');
const reduceAmount = document.getElementById('reduceAmount');
const addBtn = document.getElementById('addBalance');
const reduceBtn = document.getElementById('reduceBalance');

// Function to activate button
function activateButton(selectedBtn, otherBtn) {
    // Selected button: dark blue text & border, light blue background
    selectedBtn.classList.add('border-blue-700', 'text-blue-700', 'bg-blue-100');
    selectedBtn.classList.remove('bg-gray-200', 'text-black', 'border-gray-300');

    // Unselected button: grey background & border, black text
    otherBtn.classList.add('bg-gray-200', 'text-black', 'border-gray-300');
    otherBtn.classList.remove('border-blue-700', 'text-blue-700', 'bg-blue-100');
}

// Default: Add Balance selected
activateButton(addBtn, reduceBtn);
addAmount.classList.remove('hidden');
reduceAmount.classList.add('hidden');


addBtn.addEventListener('click', () => {
    activateButton(addBtn, reduceBtn);
    addAmount.classList.remove('hidden');
    reduceAmount.classList.add('hidden');
    addAmount.value = '';
    reduceAmount.value = '';
});

reduceBtn.addEventListener('click', () => {
    activateButton(reduceBtn, addBtn);
    reduceAmount.classList.remove('hidden');
    addAmount.classList.add('hidden');
    addAmount.value = '';
    reduceAmount.value = '';
});

//after form fill up and confirm adjustment btn clicked 
const balanceAdjustment = document.getElementById('balanceAdjust')
balanceAdjustment.dataset.clientId = addTransaction.dataset.clientId;
balanceAdjustment.addEventListener('click',async()=>{
    await balanceAdjustmentFunc(balanceAdjustment.dataset.clientId);
})
});

//balanceAdjustment function
async function balanceAdjustmentFunc(clientId){
    const addBtn = document.getElementById('addBalance');
    const reduceBtn = document.getElementById('reduceBalance');
    const addAmount = document.getElementById('addAmount')?.value || 0;
    const reduceAmount = document.getElementById('reduceAmount')?.value || 0;
    const adjustmentRemark = document.getElementById('adjustmentRemarks').value;

     const balanceAdjust = document.getElementById('balanceAdjust');
    const originalText = balanceAdjust.innerHTML;
        
    balanceAdjust.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adjusting...';
    balanceAdjust.disabled = true;
    //preparing to send the data
    try{
        const adjustmentAmount = {
                toAddAmount:addAmount,
                toReduceAmount:reduceAmount,
                adjustment_remark:adjustmentRemark,
            }
        // Send AJAX request to Django
            const response = await fetch(`/dashboard/balance-adjustment/${clientId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(adjustmentAmount)
            });
            const data = await response.json()
            if(data.success){
                
                fetchTransactions(data.uid);
                updateClientInfo(data.uid);
                await new Promise(resolve => setTimeout(resolve,1500));

                //resetting the form
                document.getElementById('addAmount').value = '';
                document.getElementById('reduceAmount').value = '';
                document.getElementById('adjustmentRemarks').value = '';
                document.getElementById('adjustBalanceModal').classList.add('hidden');
                activateButton(addBtn, reduceBtn);
            }else {
            showAlert(result.message || "Adjustment failed");
        }

    }catch (error) {
            console.error('Error adjusting amount:', error);
    }finally {
            // Restore button state
            balanceAdjust.innerHTML = originalText;
            balanceAdjust.disabled = false;
        }
}

//footer of the adjust balance
const addAmount = document.getElementById('addAmount');
const reduceAmount = document.getElementById('reduceAmount');
const adjustedBalance = document.getElementById('adjustedBalance');
const currentBalance = document.getElementById('currentBalance');

//dynamic change at the footer
if(addAmount){
    const clientId = getUidFromUrl();
    const data = await clientLatestRemaining(clientId)

    addAmount.addEventListener('input',async()=>{
        adjustedBalance.value = addAmount.value
        currentBalance.value = Number(data.remaining) + Number(adjustedBalance.value)

    })
}
if(reduceAmount){
    const clientId = getUidFromUrl();
    const data = await clientLatestRemaining(clientId)

    reduceAmount.addEventListener('input',async()=>{
        adjustedBalance.value = reduceAmount.value
        currentBalance.value = Number(data.remaining) - Number(adjustedBalance.value)

    })
}

//reset payment modal
function resetPaymentModal(){
    const savePaymentOut = document.getElementById('savePaymentOut');
    const savePaymentIn = document.getElementById('savePaymentIn');

    document.getElementById('paymentHeader').textContent = 'Add Payment In';
    savePaymentOut.style.display ='none';
    savePaymentIn.style.display ='block';
}

//savePaymentIn funcion 
async function savePaymentInFunc(clientId){
    const receivedAmountIn = document.getElementById('amountInput')?.value;
    const paymentInDate = document.getElementById('paymentInDate')?.value;
    const paymentInRemarks = document.getElementById('paymentInRemarks')?.value;
    const paymentModal = document.getElementById('paymentModal');

    if(!receivedAmountIn || receivedAmountIn.trim() === ""){
        showAlert("Please, enter the amount");
        document.getElementById('amountInput').focus();
        return;
    }

    const savePaymentIn = document.getElementById('savePaymentIn');
    const originalText = savePaymentIn.innerHTML;
        
    savePaymentIn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    savePaymentIn.disabled = true;
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
        console.log('Server response:', result.uid);

        //immediately load the transactions
        if(result.success === true){
            fetchTransactions(result.uid)
            updateClientInfo(result.uid)
            await new Promise(resolve => {setTimeout(resolve,1500)})
            //emptying the modal form
            document.getElementById('receiptNumber').value ='';
            document.getElementById('amountInput').value = '';
           
            paymentModal.classList.add('hidden');
            
        
        }else {
            showAlert(result.message || "Payment failed");
        }
        
    }catch (error) {
        console.error('Error receiving amount:', error);
}finally {
            // Restore button state
            savePaymentIn.innerHTML = originalText;
            savePaymentIn.disabled = false;
        }

}

//savePaymentOut funcion 
async function savePaymentOutFunc(clientId){
    
    const paidAmount = document.getElementById('amountInput')?.value;
    const paymentOutDate = document.getElementById('paymentInDate')?.value;
    const paymentOutRemarks = document.getElementById('paymentInRemarks')?.value;
    const paymentModal = document.getElementById('paymentModal');

    if(!paidAmount || paidAmount.trim() === ""){
        showAlert("Please, enter the amount");
        document.getElementById('amountInput').focus();
        return;
    }

    const savePaymentOut = document.getElementById('savePaymentOut');
    const originalText = savePaymentOut.innerHTML;
        
    savePaymentOut.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    savePaymentOut.disabled = true;
    //preparing data to send
    try{
        const paymentOut = {
            payment_out:paidAmount,
            payment_out_date:paymentOutDate,
            payment_out_remark:paymentOutRemarks,
        }
    // Send AJAX request to Django
        const response = await fetch(`/dashboard/payment-out/${clientId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(paymentOut)
        });

        const result = await response.json();

        //immediately load the transactions
        if(result.success === true){
            fetchTransactions(result.uid)
            updateClientInfo(result.uid)
            await new Promise(resolve => setTimeout(resolve,1500))
            //emptying the modal form
            document.getElementById('amountInput').value = '';
            paymentModal.classList.add('hidden');
        
        }else {
            showAlert(result.message || "Payment failed");
        }
        
    }catch (error) {
        console.error('Error receiving amount:', error);
}finally {
            // Restore button state
            savePaymentOut.innerHTML = originalText;
            savePaymentOut.disabled = false;
        }

}

