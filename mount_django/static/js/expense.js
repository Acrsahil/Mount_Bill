import { showAlert } from "./utils.js";

document.addEventListener('DOMContentLoaded',async()=>{
    const AddExpenseModal = document.getElementById('AddExpenseModal');
    const addExpensesBtn = document.getElementById('addExpenses');
    const addNewExpenseBtn = document.getElementById('addNewExpense')
    const saveExpenseBtn = document.getElementById('saveExpense');
    const addCategoryBtn = document.getElementById('addCategory');
    const udpateExpenseBtn = document.getElementById('udpateExpense');

    if(!addCategoryBtn) return;
    await showPage()
    await renderExpenses()
    //opening the modal
    if(addExpensesBtn){
    addExpensesBtn.addEventListener('click',async()=>{
        resetExpense()
        fillExpenseModal();
        fillExpenseCategory()
        AddExpenseModal.classList.remove('hidden');
    })
    }

    //opening and saving expense inside the page with table
    if(addNewExpenseBtn){
        addNewExpenseBtn.addEventListener('click',async()=>{
        resetExpense()
        fillExpenseModal();
        fillExpenseCategory()
        AddExpenseModal.classList.remove('hidden');
    })
    }
    //closing the expense modal
    const closeExpenseModal = document.getElementById('closeExpenseModal');
    closeExpenseModal.addEventListener('click',()=>{
        emptyModalForm()
        AddExpenseModal.classList.add('hidden');
    })

    //close the modal after clicking outside
    AddExpenseModal.addEventListener('click', (e) => {
        if (e.target === AddExpenseModal) {
            emptyModalForm()
            AddExpenseModal.classList.add('hidden');
        }
    });

    //saving the expense
    saveExpenseBtn.addEventListener('click',()=>{
        saveExpenses()
    })

    //adding the category
    addCategoryBtn.onclick = async() => {
        await saveCategory()
    }

    //updating the expenses
    udpateExpenseBtn.onclick = () =>{
        console.log("yaa click garda ni aauna paro",udpateExpenseBtn.dataset.id)
        updateExpenseFunc(udpateExpenseBtn.dataset.id)
    }
});

//function to empty the form 
function emptyModalForm(){
    document.getElementById('expenseNumber').value = '';
    document.getElementById('expenseDate').value = '';
    document.getElementById('expenseCategory').value ='';
    document.getElementById('totalAmountInput').value = '';
    document.getElementById('expenseRemarks').value = '';
}

//show empty expense page
function showEmptyPage(){
    const expensesWithTable = document.getElementById('expensesWithTable');
    const emptyExpense = document.getElementById('emptyExpense')
    expensesWithTable.classList.add('hidden');
    emptyExpense.classList.remove('hidden');
}
function showExpenseWithTable(){
    const expensesWithTable = document.getElementById('expensesWithTable');
    const emptyExpense = document.getElementById('emptyExpense')
    expensesWithTable.classList.remove('hidden');
    emptyExpense.classList.add('hidden');
}

//choosing which page to show 
async function showPage(){
    const res = await fetch(`/dashboard/expense-info/`)
    const data = await res.json()
    if(data.expense_count >= 1){
        showExpenseWithTable()
    }
    else{
        showEmptyPage()
    }
}

//fill modal with date and number
async function fillExpenseModal() {
    const response = await fetch(`/dashboard/expense-info/`);
    const data = await response.json();

    const expenseNumber = document.getElementById('expenseNumber');
    //filling the expenseNumber value
    expenseNumber.value = data.expense_count + 1;

    const expenseDate = document.getElementById('expenseDate')
    if (expenseDate) {
        const today = new Date().toISOString().split('T')[0];
        expenseDate.value = today;
    }
}


//fill the expense modal with category
async function fillExpenseCategory() {
    const response = await fetch(`/dashboard/expense-category/`);
    const data = await response.json();

    const input = document.getElementById('expenseCategory');
    const dropdown = document.getElementById('expenseCategoryDropdown');
    const newDropdown = document.getElementById('newExpenseCategoryDropdown');

    dropdown.innerHTML = '';

    data.expense_categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat.name;
        li.className = 'px-3 py-2 cursor-pointer hover:bg-blue-100 text-sm';

        li.addEventListener('click', () => {
            input.value = cat.name;
            dropdown.classList.add('hidden');
        });

        dropdown.appendChild(li);
    });

    // show dropdown when input is focused
    input.addEventListener('focus', () => {
        dropdown.classList.remove('hidden');
    });

    // filter while typing
   input.addEventListener('input', () => {
        const value = input.value.toLowerCase();
        let hasMatch = false;

        Array.from(dropdown.children).forEach(li => {
            const match = li.textContent.toLowerCase().includes(value);
            li.style.display = match ? 'block' : 'none';
            if (match) hasMatch = true;
        });

        if (!value) {
            // empty input → show original dropdown
            dropdown.classList.remove('hidden');
            newDropdown.classList.add('hidden');
        } 
        else if (hasMatch) {
            // matches exist → show filtered dropdown
            dropdown.classList.remove('hidden');
            newDropdown.classList.add('hidden');
        } 
        else {
            // no matches → show "add new category"
            dropdown.classList.add('hidden');
            newDropdown.classList.remove('hidden');
        }
    });


    // hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#expenseCategory')) {
            dropdown.classList.add('hidden');
        }
    });
}

//saving the expenses
async function saveExpenses(){
        const expenseCategory = document.getElementById('expenseCategory')?.value;
        const totalAmount = document.getElementById('totalAmountInput')?.value;
        const expenseRemarks = document.getElementById('expenseRemarks')?.value || '';
        const expenseNumber = document.getElementById('expenseNumber')?.value || '';
    
        if(!totalAmount || totalAmount.trim() === ""){
            showAlert("Please, enter the amount");
            document.getElementById('totalAmountInput').focus();
            return;
        }
    
        const saveExpense = document.getElementById('saveExpense');
        const originalText = saveExpense.innerHTML;
            
        saveExpense.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        saveExpense.disabled = true;
        //preparing data to send
        try{
            const expenses = {
                expenseCategory:expenseCategory,
                totalAmount:totalAmount,
                expenseRemarks:expenseRemarks,
                expenseNumber:expenseNumber,
            }
        // Send AJAX request to Django
            const response = await fetch(`/dashboard/save-expenses/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(expenses)
            });
    
            const result = await response.json();
    
            //immediately load the transactions
            if(result.success === true){
                
                await new Promise(resolve => {setTimeout(resolve,1500)})

                //emptying the modal form
                emptyModalForm()
                showExpenseWithTable()
                renderExpenses();
                AddExpenseModal.classList.add('hidden');
                
            
            }else {
                showAlert(result.message || "Saving Expenses failed");
            }
            
        }catch (error) {
            console.error('Error receiving amount:', error);
    }finally {
                // Restore button state
                saveExpense.innerHTML = originalText;
                saveExpense.disabled = false;
            }
       
}

//save category
async function saveCategory(){
    const expenseCategory = document.getElementById('expenseCategory')?.value;

    try{
            const expense_category = {
                expenseCategory:expenseCategory,
            }
        // Send AJAX request to Django
            const response = await fetch(`/dashboard/save-category/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(expense_category)
            });
    
            const result = await response.json();
            if(result.success){
                document.getElementById('expenseCategory').value=result.category;
                const newDropdown = document.getElementById('newExpenseCategoryDropdown');
                newDropdown.classList.add('hidden');
            }
        }catch (error) {
            console.error('Error saving:', error);
}
}

//getting expenses data to fill the table
async function renderExpenses(){
    const res = await fetch(`/dashboard/expense-info/`)
    const data = await res.json()
    const expense_data = data.expense_data

    const expensesTableBody = document.getElementById('expensesTableBody')
    if(!expensesTableBody) return;
    expensesTableBody.innerHTML='';

    const total_length = expense_data.length
    expense_data.forEach((expense,index) => {loadExpenseDataToTable(total_length-index,expense,expensesTableBody)});
}

//loading expense data to table
function loadExpenseDataToTable(index,expense,tableBody){
    const expensesTableBody = document.getElementById('expensesTableBody')

    const row = document.createElement('tr');
    row.dataset.id = expense.id
    row.innerHTML=`
    <td>${index}</td>
    <td>${expense.category}</td>
    <td>${expense.date.split('T')[0]}</td>
    <td>Cash</td>
    <td>${expense.amount}</td>
    <td>${expense.remarks}</td>
   <td class="action-cell">
    <span class="action-btn action-edit">
        <i class="fas fa-edit"></i>
    </span>
    <span class="action-btn action-delete" data-id="${expense.id}">
        <i class="fas fa-trash"></i>
    </span>
    </td>`
    expensesTableBody.appendChild(row)

    row.addEventListener('click',() =>{
        const udpateExpenseBtn = document.getElementById('udpateExpense')
        udpateExpenseBtn.dataset.id = expense.id
        fillEditExpenseModalFunc(row.dataset.id)
        editExpense()
        fillExpenseCategory()
        AddExpenseModal.classList.remove('hidden');
    })

    const editBtn = row.querySelector('.action-edit');
    const deleteBtn = row.querySelector('.action-delete');

    editBtn.addEventListener('click', (e) => {
        e.stopPropagation(); 
        const udpateExpenseBtn = document.getElementById('udpateExpense')
        udpateExpenseBtn.dataset.id = expense.id
        fillEditExpenseModalFunc(row.dataset.id)
        editExpense()
        fillExpenseCategory()
        AddExpenseModal.classList.remove('hidden');
        
    });
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = deleteBtn.getAttribute("data-id");
        deleteExpenseFunc(id)
    })

}


//function to delete expenses
async function deleteExpenseFunc(expenseId){
const confirmed = confirm("Are you sure you want to delete this expense?")
    if(confirmed){
        const res = await fetch(`/dashboard/delete-expense/${expenseId}/`, {
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
        renderExpenses()
        showAlert(data.message,'success');
    }
    else {
        showAlert('Error: ' + (data.error || 'Failed to delete client'), 'error');
        }
    }
     
}

//function to edit expenses
function editExpense(){
    document.getElementById('expenseHeader').textContent = 'Edit Expense';
    document.getElementById('udpateExpense').classList.remove('hidden');
    document.getElementById('saveExpense').classList.add('hidden');
}
function resetExpense(){
    document.getElementById('expenseHeader').textContent = 'Add Expense';
    document.getElementById('udpateExpense').classList.add('hidden');
    document.getElementById('saveExpense').classList.remove('hidden');
    
}

//filling the editExpense ModalForm
async function fillEditExpenseModalFunc(expenseId){
    const res = await fetch(`/dashboard/expense-info/${expenseId}/`)
    const data = await res.json()

    const dateObj = new Date(data.expense_data.date);
    const formattedDate = dateObj.toISOString().split('T')[0];

    document.getElementById('expenseNumber').value = data.expense_data.expense_number;
    document.getElementById('expenseDate').value = formattedDate
    document.getElementById('expenseCategory').value = data.expense_data.category;
    document.getElementById('totalAmountInput').value = data.expense_data.amount;
    document.getElementById('expenseRemarks').value = data.expense_data.remarks;
    

}

async function updateExpenseFunc(expenseId){
    const expense_amount = document.getElementById('totalAmountInput')?.value;
    const expense_remarks = document.getElementById('expenseRemarks')?.value || '';
    const expenses_category = document.getElementById('expenseCategory')?.value;

    // Show loading state
    const udpateExpenseBtn = document.getElementById('udpateExpense');
    const originalText = udpateExpenseBtn.innerHTML;
            
    udpateExpenseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    udpateExpenseBtn.disabled = true;
        
            try {
                // Prepare data for sending
                const expenseData = {
                    expenses_total: expense_amount,
                    expenses_remarks: expense_remarks,
                    expenses_category: expenses_category,
                };
                // Send AJAX request to Django
                const response = await fetch(`/dashboard/update-expense/${expenseId}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': window.djangoData.csrfToken,
                        'X-Requested-With': 'XMLHttpRequest'
                    },
                    body: JSON.stringify(expenseData)
                });
        
                const result = await response.json();
                console.log('Server response yaa ko ho tw:', result);
        
                if (result.success) {
                    // Show success message
                    showAlert(result.message, 'success');
    
                    // Close modal after short delay
                    renderExpenses()
                    AddExpenseModal.classList.add('hidden');
                        
                    await new Promise(resolve => setTimeout(resolve,1500));
                    // Reset form
                    emptyModalForm()
                    
                } else {
                    showAlert('Error: ' + (result.error || 'Failed to edit expense'), 'error');
                }
        
            } catch (error) {
                console.error('Error updating:', error);
                showAlert('Network error. Please check your connection and try again.', 'error');
            } finally {
                // Restore button state
                udpateExpenseBtn.innerHTML = originalText;
                udpateExpenseBtn.disabled = false;
            }
}