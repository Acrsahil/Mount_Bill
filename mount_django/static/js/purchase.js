import { openModal} from './bill_layout.js';
document.addEventListener('DOMContentLoaded', async() => {
    const addPurchase = document.getElementById('addPurchase');
    const addNewPurchase = document.getElementById('addNewPurchase');
    await showPage()
    await renderPurchase()
    if(addPurchase){
        addPurchase.addEventListener('click', async () => {
            // try {
            //     const res = await fetch(`/dashboard/purchase/creates/`);
            //     const html = await res.text(); 
            //     history.pushState({}, '', `/dashboard/purchase/create`);
            //     const purchase = document.getElementById('purchase');
            //     purchase.innerHTML = html;
            // } catch (error) {
            //     console.error("Error loading purchase page:", error);
            // }
            window.location.href = '/dashboard/purchase/create/'; 
        });
}
    if(addNewPurchase){
        addNewPurchase.addEventListener('click',async() =>{
            window.location.href = '/dashboard/purchase/create/'; 
        });
    }
   
});

//show empty expense page
function showFirstPage(){
    const purchaseWithTable = document.getElementById('purchaseWithTable');
    const emptyPurchase = document.getElementById('emptyPurchase')
    purchaseWithTable.classList.add('hidden');
    emptyPurchase.classList.remove('hidden');
}
function showPurchaseWithTable(){
    const purchaseWithTable = document.getElementById('purchaseWithTable');
    const emptyPurchase = document.getElementById('emptyPurchase')
    purchaseWithTable.classList.remove('hidden');
    emptyPurchase.classList.add('hidden');
}

//choosing which page to show 
async function showPage(){
    const res = await fetch(`/dashboard/purchase-info/`)
    const data = await res.json()
    if(data.purchase_count >= 1){
        showPurchaseWithTable()
    }
    else{
        showFirstPage()
    }
}

async function renderPurchase(){
    const res = await fetch(`/dashboard/purchase-info/`)
    const data = await res.json()
    const purchase_data = data.purchase_data

    const purchaseTableBody = document.getElementById('purchaseTableBody')
    if(!purchaseTableBody) return;
    purchaseTableBody.innerHTML='';

    const total_length = purchase_data.length;

    purchase_data.forEach((purchase,index) => {loadPurchaseDataToTable(total_length-index,purchase,purchaseTableBody)});
}

//loading expense data to table
function loadPurchaseDataToTable(index,purchase,purchaseTableBody){

    const row = document.createElement('tr');
    row.dataset.uid = purchase.uid;
    row.classList.add(
    "cursor-pointer",
    "hover:bg-gray-100",
    "transition"
);

    row.innerHTML=`
    <td>${index}</td>
    <td>${purchase.name}</td>
    <td>${purchase.date.split('T')[0]}</td>
    <td>Paid/Unpaid</td>
    <td>${purchase.total_amount}</td>
    <td>${purchase.dueAmount}</td>
   <td class="action-cell">
    <span class="action-btn action-edit">
        <i class="fas fa-edit"></i>
    </span>
    <span class="action-btn action-delete">
        <i class="fas fa-trash"></i>
    </span>
    </td>`
    purchaseTableBody.appendChild(row);
    
    row.onclick = () =>{
        openModal(row.dataset.uid ,purchase.type)
    }

}
