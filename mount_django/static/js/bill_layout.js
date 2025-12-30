const modal = document.getElementById("invoiceModal");
const closeBtn = document.querySelector(".close");

    // Close modal when close button is clicked
if (closeBtn) {
    closeBtn.addEventListener("click", function() {
        closeModal();
        });
    }

    // Close modal when clicking outside the modal content
window.addEventListener("click", function(event) {
    if (event.target === modal) {
        closeModal();
        }
    });

    // Close modal with Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        console.log("Escape key pressed");
        closeModal();
        }
    });

async function getData(api_url) {
  try {
    const response = await fetch(api_url);
    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Error:', error);
  }
}
export function openModal() {
    modal.style.display = "flex";
    const row = event.target.closest('tr');
    const invoice_id = parseInt(row.cells[0].innerText.split('-')[1]);
    
    const url = `/dashboard/invoice-layout/${invoice_id}/`;  // Add trailing slash


    
    getData(url).then(data => {
        if (data && data.success) {
            console.log("Invoice:", data.invoice);
            console.log("Customer:", data.invoice.customer.name);
            console.log("Total:", data.invoice.amounts.total_amount);


            document.getElementById("invoiceNumbers").innerText = data.invoice.order_id

            document.getElementById("companyName").innerText = data.invoice.company_name
            document.getElementById("companyPhone").innerText = data.invoice.company_phone
            document.getElementById("customerName").innerText = data.invoice.customer.name
            if(data.invoice.customer.address != ""){
                document.getElementById("customerAddress").innerText = data.invoice.customer.address
            }else{
                document.getElementById("customer_add").style.display = "none"
            }
            document.getElementById("customerPhone").innerText = data.invoice.customer.phone


            if(data.invoice.customer.pan_id != "N/A"){
                document.getElementById("customerPAN").innerText = data.invoice.customer.pan_id
            }else{
                document.getElementById("Panid").style.display = "none"
            }
            document.getElementById("invoiceNumber").innerText = data.invoice.invoice_number
            document.getElementById("invoiceDate").innerText = data.invoice.dates.invoice_date_formatted

            if(data.invoice.remarks != ""){
                document.getElementById("remarksText").innerText = data.invoice.remarks
            }else{
                document.getElementById("rem").style.display = "none"
                document.getElementById("remarksText").style.display = "none"
            }

            



            const tablebody = document.getElementById("itemsBody");

            const len = data.invoice.items.length
            console.log("this is length->> ",len)
            // Create the td element

            let son = 1;
            for(let i = 0; i<len; i++){
                const tr = document.createElement("tr")
                tablebody.appendChild(tr)

                let sn = document.createElement("td")
                sn.innerHTML = i+1;  // Or td.innerHTML = "hello"
                tr.appendChild(sn)

                let product_name = document.createElement("td")
                product_name.innerHTML = data.invoice.items[i].product_name
                tr.appendChild(product_name)

                let qty = document.createElement("td")
                qty.innerHTML = data.invoice.items[i].quantity
                tr.appendChild(qty)

                let price = document.createElement("td")
                price.innerHTML = data.invoice.items[i].product_price
                tr.appendChild(price)

                let discount = document.createElement("td")
                discount.innerHTML = data.invoice.items[i].discount_amount
                tr.appendChild(discount)

                let amount = document.createElement("td")
                amount.innerHTML =data.invoice.items[i].line_total 
                tr.appendChild(amount)

            }


            // Bottom total related data


            document.getElementById("subTotal").innerHTML = "Rs. " + data.invoice.amounts.subtotal


            if(data.invoice.amounts.global_discount_percent != '0'){
                document.getElementById("discountLabel").innerHTML = `Discount (${data.invoice.amounts.global_discount_percent}%):`
                document.getElementById("discount").innerHTML ="Rs. " + data.invoice.amounts.global_discount_amount
            }else{
                document.getElementById("dislabel").style.display = "none"
            }

            if(data.invoice.amounts.global_tax_percent != '0'){
                document.getElementById("taxLabel").innerHTML = `Tax (${data.invoice.amounts.global_tax_percent}%):`
                document.getElementById("tax").innerHTML ="Rs. " + data.invoice.amounts.global_tax_amount
            }else{
                document.getElementById("taxlabel").style.display = "none"
            }




            document.getElementById("totalAmount").innerHTML = "Rs. " + data.invoice.amounts.total_amount

            document.getElementById("receivedAmount").innerHTML = "Rs. " + data.invoice.amounts.received_amount


            if(data.invoice.amounts.amount_due != '0'){
            document.getElementById("amountDue").innerHTML = "Rs. " + data.invoice.amounts.amount_due
            }else{
                document.getElementById("dueam").style.display = "none"
            }





        }
    }).catch(error => {
            console.error("Error fetching invoice:", error);
        });
}
function closeModal() {
    const tablebody = document.getElementById("itemsBody").innerText = "";
    modal.style.display = "none";
    document.getElementById("Panid").style.display = "flex"
    document.getElementById("customer_add").style.display = "flex"
    document.getElementById("dislabel").style.display = "flex"
    document.getElementById("taxlabel").style.display = "flex"
    document.getElementById("dueam").style.display = "flex"
    document.getElementById("rem").style.display = "block"
    document.getElementById("remarksText").style.display = "block"
}
