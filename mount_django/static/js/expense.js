document.addEventListener('DOMContentLoaded',async()=>{
    const AddExpenseModal = document.getElementById('AddExpenseModal');
    const addExpensesBtn = document.getElementById('addExpenses');
    const addNewExpenseBtn = document.getElementById('addNewExpense')
    const saveExpenseBtn = document.getElementById('saveExpense');
    const addCategoryBtn = document.getElementById('addCategory');
    if(!addCategoryBtn) return;
    await showPage()
    await renderExpenses()
    //opening the modal
    if(addExpensesBtn){
    addExpensesBtn.addEventListener('click',async()=>{
        fillExpenseCategory();
        AddExpenseModal.classList.remove('hidden');
    })
    }

    //opening and saving expense inside the page with table
    if(addNewExpenseBtn){
        addNewExpenseBtn.addEventListener('click',async()=>{
        fillExpenseCategory();
        AddExpenseModal.classList.remove('hidden');
    })
    }
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

    //saving the expense
    saveExpenseBtn.addEventListener('click',()=>{
        saveExpenses()
    })

    //adding the category
    addCategoryBtn.onclick = async() => {
        await saveCategory()
    }

});


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
    
            //immediately load the transactions
            if(result.success === true){
                // fetchTransactions(result.uid)
                // updateClientInfo(result.uid)
                await new Promise(resolve => {setTimeout(resolve,1500)})
                console.log("yaa audae xa count",result.expense_count)
                //emptying the modal form
                // document.getElementById('receiptNumber').value ='';
                // document.getElementById('amountInput').value = '';
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
                console.log("successful")
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
    row.innerHTML=`
    <td>${index}</td>
    <td>${expense.category}</td>
    <td>${expense.date.split('T')[0]}</td>
    <td>Cash</td>
    <td>${expense.amount}</td>
    <td>${expense.remarks}</td>
    `
    expensesTableBody.appendChild(row)
}