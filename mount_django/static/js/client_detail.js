document.addEventListener('DOMContentLoaded', () => {
    addClientsToList(window.djangoData.clients)
    updateClientInfo(window.djangoData.clients)

    //functional add new client inside the client detail page
    const addNewClientDetailBtn = document.getElementById('addNewClientDetailBtn');
    addNewClientDetailBtn.addEventListener('click',() => {
        const addClientModal = document.getElementById('addClientModal')
        addClientModal.style.display = 'flex';
        addClientsToList(clients)
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

//function to add the client to the list
function addClientsToList(clients){
    const clientdetaillist = document.querySelector('.clientList');
    if (!clientdetaillist) return;

    clientdetaillist.innerHTML = '';
    clients.forEach(client => {
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
        clientdetaillist.appendChild(li);
        li.addEventListener('click', () =>{
            document.querySelectorAll('.clientlists').forEach(c => {
                // Check if it's NOT the clicked client
                if (c !== li) {
                    c.classList.remove(
                    'selected',
                    'bg-blue-100',
                    'border-blue-200',
                    'text-blue-700',
                    'font-medium'
                    );
                    // Re-add base styling
                    c.classList.add(
                    'border-gray-100',
                    'text-gray-700'
                    );
                }
            });
                
                // Now add selected state to clicked client
            li.classList.add(
                'selected',
                'bg-blue-100',
                'border-blue-200',
                'text-blue-700',
                'font-medium'
                );
            li.classList.remove('text-gray-700', 'border-gray-100');
            history.pushState({}, '', `/dashboard/client-detail/${client.uid}`);

            //updating the client info as we click the list
            const clientName = document.getElementById('clientName');
            const clientPhone = document.getElementById('clientPhone');
            clientName.textContent = client.name;
            if(client.phone){
                clientPhone.textContent = client.phone;
            }
            else{
                clientPhone.textContent = "---";
            }

            })
        });
}

//triggers the backward and forward event of the browser
window.addEventListener('popstate',()=>{
    updateClientInfo(window.djangoData.clients)
})
