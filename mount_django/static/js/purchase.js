document.addEventListener('DOMContentLoaded', () => {
    const addPurchase = document.getElementById('addPurchase');
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
        // document.getElementById('create_new_invoice').innerText = "Create Purchase Bill";

        window.location.href = '/dashboard/purchase/create/'; 
    });
});
