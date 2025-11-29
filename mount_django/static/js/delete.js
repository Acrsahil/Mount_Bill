const to_delete=document.getElementById("invoicesTableBody");
to_delete.addEventListener("click",(e)=>{
    console.log(`this is something`);
    deleteBtn=e.target.closest(".action-delete");
    if(!deleteBtn) return;
    let invoiceId=deleteBtn.getAttribute("data-id");
    let csrfToken=deleteBtn.getAttribute("data-token");
    console.log("invoiceId:", invoiceId); 
    console.log("csrfToken:", csrfToken);
    if(confirm("Are you sure you want to delete this invoice? ")){
        fetch(`/bill/delete_invoice/${invoiceId}/`,{
            method:"POST",
            headers:{
                "X-CSRFToken":csrfToken,
                "X-Requested-With": "XMLHttpRequest"
            }
            })
            .then(res=>res.json())
            .then(data=>{
                if(data.success){
                    deleteBtn.closest("tr").remove();
                }
            })
        }
    }
);