document.addEventListener('DOMContentLoaded',()=>{
    const AddExpenseModal = document.getElementById('AddExpenseModal');
    const addExpensesBtn = document.getElementById('addExpenses');
    addExpensesBtn.addEventListener('click',()=>{
        AddExpenseModal.classList.remove('hidden');
    })

    //closing the expense modal
    const closeExpenseModal = document.getElementById('closeExpenseModal');
    closeExpenseModal.addEventListener('click',()=>{
        console.log("clickvaeb")
        AddExpenseModal.classList.add('hidden');
    })

    AddExpenseModal.addEventListener('click', (e) => {
        if (e.target === AddExpenseModal) {
            AddExpenseModal.classList.add('hidden');
        }
    });
})