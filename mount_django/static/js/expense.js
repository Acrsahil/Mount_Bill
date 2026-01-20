document.addEventListener('DOMContentLoaded',async()=>{
    const AddExpenseModal = document.getElementById('AddExpenseModal');
    const addExpensesBtn = document.getElementById('addExpenses');
    const saveExpenseBtn = document.getElementById('saveExpense');
    await renderExpenses()
    //opening the modal
    addExpensesBtn.addEventListener('click',async()=>{
        fillExpenseModal();
        AddExpenseModal.classList.remove('hidden');
    })

    //closing the expense modal
    const closeExpenseModal = document.getElementById('closeExpenseModal');
    closeExpenseModal.addEventListener('click',()=>{
        console.log("clickvaeb")
        AddExpenseModal.classList.add('hidden');
    })

    //close the modal after clicking outside
    AddExpenseModal.addEventListener('click', (e) => {
        if (e.target === AddExpenseModal) {
            AddExpenseModal.classList.add('hidden');
        }
    });

    saveExpenseBtn.addEventListener('click',()=>{
        saveExpenses()
    })
})


async function fillExpenseModal() {
    const response = await fetch(`/dashboard/expense-category/`);
    const data = await response.json();

    const input = document.getElementById('expenseCategory');
    const dropdown = document.getElementById('expenseCategoryDropdown');

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
        Array.from(dropdown.children).forEach(li => {
            li.style.display = li.textContent.toLowerCase().includes(value)
                ? 'block'
                : 'none';
        });
    });

    // hide when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#expenseCategory')) {
            dropdown.classList.add('hidden');
        }
    });
}


async function saveExpenses(){
        const expenseCategory = document.getElementById('expenseCategory')?.value;
        const totalAmount = document.getElementById('totalAmountInput')?.value;
        const expenseRemarks = document.getElementById('expenseRemarks')?.value || '';
    
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
            console.log('Server response:', result.uid);
    
            //immediately load the transactions
            if(result.success === true){
                // fetchTransactions(result.uid)
                // updateClientInfo(result.uid)
                await new Promise(resolve => {setTimeout(resolve,1500)})
                //emptying the modal form
                // document.getElementById('receiptNumber').value ='';
                // document.getElementById('amountInput').value = '';
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

async function renderExpenses(){
    const res = await fetch(`/dashboard/expense-info/`)
    const data = await res.json()
    const expense_data = data.expense_data

    const expensesTableBody = document.getElementById('expensesTableBody')
    if(!expensesTableBody) return;
    expensesTableBody.innerHTML='';

    expense_data.forEach((expense,index) => {loadExpenseDataToTable(index,expense,expensesTableBody)});
}

function loadExpenseDataToTable(index,expense,tableBody){
    const expensesTableBody = document.getElementById('expensesTableBody')

    const row = document.createElement('tr');
    row.innerHTML=`
    <td>${index + 1}</td>
    <td>${expense.category}</td>
    <td>${expense.date.split('T')[0]}</td>
    <td>Cash</td>
    <td>${expense.amount}</td>
    <td>${expense.remarks}</td>
    `
    expensesTableBody.appendChild(row)
}