import { getData } from './bill_layout.js';


function presstab(input){
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', keyCode: 9 }));
}



export function editInvoiceSection(orderId){
    console.log("this is uid section!")
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
                presstab(input)

                const qty = document.getElementsByClassName("item-quantity")[i]
                qty.value = data.invoice.items[i].quantity
                presstab(qty)



                const discount = document.getElementsByClassName("discount-percent-input")[i]
                discount.value = data.invoice.items[i].discount
                presstab(discount)

                document.getElementsByClassName("item-price")[i].value = data.invoice.items[i].rate
                document.getElementsByClassName("discount-percent-input")[i].value = data.invoice.items[i].discount_percent
                console.log("item-quantity ho haii yoooo",data.invoice.items[i].quantity)
            }
            document.getElementsByClassName("remove-item-btn")[data.invoice.items.length].click()

            const input =  document.getElementById("receivedAmount")
            input.value = data.invoice.amounts.received_amount
            presstab(input)



            const balancedue = document.getElementById("balanceDue")
            if(balancedue){
                balancedue.value = data.invoice.amounts.amount_due
                presstab(balancedue)
            }

            const global_discount = data.invoice.amounts.global_discount_percent
            const global_tax = data.invoice.amounts.global_tax_percent
            const notes = data.invoice.remarks
            const additionalcharge = data.invoice.additional_charges

            if(global_discount){
                console.log("discount xa haiiii")
                document.getElementById("addDiscountBtn").click()
                const input = document.getElementById("globalDiscount")
                input.value = data.invoice.amounts.global_discount_percent
                presstab(input)
            }

            if(global_tax){
                document.getElementById("addTaxBtn").click()
                const input = document.getElementById("globalTax")
                input.value = global_tax
                presstab(input)
            }


            if(notes){
                document.getElementById("addnoteBtn").click()
                const note = document.getElementById("note")
                note.value = notes
                presstab(input)
            }


            if(additionalcharge){
                const len = additionalcharge.length
                for(let i = 0; i<len; i++){
                    document.getElementById("addChargeBtn").click()
                    document.getElementsByClassName('form-control additional-chargename-section')[i].value = additionalcharge[i].charge_name;
                    const charge = document.getElementsByClassName('form-control additional-chargeamt-section')[i];
                    charge.value = additionalcharge[i].charge_amount;
                    presstab(charge)
                }
            }










        }
    }).catch(error =>{
            console.error("Error fetching invoice:", error);
        })


}

