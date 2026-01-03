import { getData } from './bill_layout.js';

export function editInvoiceSection(orderId){
    document.getElementById('create_new_invoice').innerText = "Edit Sales Invoice"
    document.getElementById("saveInvoiceBtn").style.display = 'none'
    document.getElementById("updateInvoiceBtn").style.display = 'flex'
    document.getElementById("invoiceNumber").removeAttribute('readonly')
    

    console.log("window is ready xa!?")


    const url = `/dashboard/invoice-layout/${orderId}/`;  // Add trailing slash


    
    getData(url).then(data => {
        if (data && data.success) {
            console.log(data)
            console.log("data is loaded",data.invoice.customer.name)
            document.getElementById("clientName").value =  data.invoice.customer.name
            document.getElementById("clientName").setAttribute("disabled","true")

            document.getElementById("invoiceNumber").value = data.invoice.invoice_number
            document.getElementById("invoiceDate").value = data.invoice.dates.invoice_date


            for(let i = 0; i<data.invoice.items.length-1; i++){
                document.getElementById("addItemBtn").click();
            }


            




            for(let i = 0; i<data.invoice.items.length; i++){

                const input = document.getElementsByClassName("product-search-input")[i];
                input.value = data.invoice.items[i].product_name;

                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9 }));




                document.getElementsByClassName("item-quantity")[i].value = data.invoice.items[i].quantity
                document.getElementsByClassName("item-price")[i].value = data.invoice.items[i].rate
                document.getElementsByClassName("discount-percent-input")[i].value = data.invoice.items[i].discount_percent
            }
            document.getElementsByClassName("remove-item-btn")[data.invoice.items.length].click()






        }
    }).catch(error =>{
            console.error("Error fetching invoice:", error);
        })


}

