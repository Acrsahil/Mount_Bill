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


            document.getElementById("companyName").innerText = data.invoice.company_name
            document.getElementById("companyPhone").innerText = data.invoice.company_phone
            document.getElementById("customerName").innerText = data.invoice.customer.name
            document.getElementById("customerAddress").innerText = data.invoice.customer.address
            document.getElementById("customerPhone").innerText = data.invoice.customer.phone
            document.getElementById("customerPAN").innerText = data.invoice.customer.pan_id
            document.getElementById("invoiceNumber").innerText = data.invoice.invoice_number
            document.getElementById("invoiceDate").innerText = data.invoice.dates.invoice_date_formatted

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

            // Append to table


        }
    }).catch(error => {
            console.error("Error fetching invoice:", error);
        });
}
function closeModal() {
    const tablebody = document.getElementById("itemsBody").innerText = "";
    modal.style.display = "none";
}

