// Create Invoice Page - Standalone page version
import { updateStats, showAlert } from './utils.js';
import { 
    showProductSuggestions,
    showClientSuggestions,
    hideClientSearchHint,
    fillClientDetails,
    clearClientDetails,
    loadInvoices,
} from './dom.js';
import { 
    handleItemUpdate,
    handleRemoveItem,
    selectClientFromHint,
} from './events.js';

// Track currently selected hint for keyboard navigation
let currentSelectedHintIndex = -1;
let currentSelectedProductHintIndex = -1;

// Initialize data from Django
const invoices = Array.isArray(window.djangoData.invoices) ? window.djangoData.invoices : [];
const products = Array.isArray(window.djangoData.products) ? window.djangoData.products : [];
const productCategories = Array.isArray(window.djangoData.product_cat) ? window.djangoData.product_cat : [];
let clients = Array.isArray(window.djangoData.clients) ? window.djangoData.clients : [];

console.log("heram clients: ",clients)
const csrfToken = window.djangoData.csrfToken || "";

// Make these available globally
window.invoices = invoices;
window.products = products;
window.csrfToken = csrfToken;

// State management
window.invoiceItems = [];
window.nextInvoiceNumber = invoices.length > 0 ? Math.max(...invoices.map(i => parseInt(i.number?.replace('INV-', '') || 0))) + 1 : 1;
window.globalDiscount = 0;
window.globalTax = 0;
window.clients = clients;
window.productCategories = productCategories;

// DOM Elements
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');
const clientNameInput = document.getElementById('clientName');
const clientSearchHint = document.getElementById('client-search-hint');
const invoiceItemsBody = document.getElementById('invoiceItemsBody');
const addItemBtn = document.getElementById('addItemBtn');
const checkAmount = document.getElementById('checkAmount')
console.log(checkAmount);
const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
const cancelInvoiceBtnBottom = document.getElementById('cancelInvoiceBtnBottom');

// get the charge section
const totalCharges = document.getElementById('totalCharges');
// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
    // Save invoice button
    if (saveInvoiceBtn) {
        saveInvoiceBtn.addEventListener('click', () => saveInvoice());
    }
    console.log('Create Invoice Page loaded');
    
    // Set today's date as default
    if (invoiceDate) {
        const today = new Date().toISOString().split('T')[0];
        invoiceDate.value = today;
    }
    
    // Generate next invoice number
    if (invoiceNumber) {
        invoiceNumber.value = `INV-${window.nextInvoiceNumber.toString().padStart(3, '0')}`;
    }
    
    // Setup event listeners
    setupPageEventListeners();
    
    // Setup client search
    setupClientSearch();
    
    // Auto-focus on client name field
    setTimeout(() => {
        if (clientNameInput) {
            clientNameInput.focus();
        }
    }, 100);
});
let is_addnotebtn = false
 //first row on table on first page load

document.addEventListener('DOMContentLoaded',() => {
    addInvoiceItem()
    //for notes or remarks
    
    // console.log(notes.innerText)

    document.getElementById('addnoteBtn').onclick =() =>{
        is_addnotebtn = true
        document.getElementById('additionalNotes').innerHTML=`
        <div class='form-group'>
        <label for='notes'>Notes or Remarks</label>
        <textarea placeholder="Notes here........" id="note" style="resize:none" rows="10" cols="50"></textarea></div>
        `;
        addnoteBtn.style.display ='none';
         
    };

    //for discount charges
    document.getElementById('addDiscountBtn').onclick = () => { 
        document.getElementById('discountContainer').innerHTML = `
            <div class="form-group">
                <label for="globalDiscount">Discount(%)</label>
                <input type="number" id="globalDiscount" class="form-control" value="0" min="0" max="100" step="0.01">
                <input type="number" id="globalDiscountAmount" class="form-control" value="0" readonly>
            </div>
        `;
        addDiscountBtn.style.display='none';
        window.globalDiscountInput = document.getElementById('globalDiscountAmount');
    };

    
    //for tax charges

    addTaxBtn.onclick = () => {
    const taxContainer = document.getElementById('taxContainer');

    taxContainer.innerHTML = `
        <div class="form-group">
        <label for="globalTax">Tax(%)</label>
        <input type="number" id="globalTax" class="form-control"
                value="0" min="0" max="100" step="0.01">
        <input type="number" id="taxAmount" class="form-control"
                value="0" readonly>
        </div>
    `;

    addTaxBtn.style.display = 'none'; 
    window.globalTaxInput = document.getElementById('taxAmount');  
    };


});

//function to show total section
function showTotalSection(){
    totalCharges.style.display = 'block';

}

// Setup all event listeners for the page
function setupPageEventListeners() {
   
    // Add item button
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => addInvoiceItem());
    }
    
    
    // Cancel buttons
    if (cancelInvoiceBtn) {
        cancelInvoiceBtn.addEventListener('click', () => cancelInvoice());
    }
    
    if (cancelInvoiceBtnBottom) {
        cancelInvoiceBtnBottom.addEventListener('click', () => cancelInvoice());
    }
    
    // Global discount and tax listeners
    if (window.globalDiscountInput) {
        globalDiscountInput.addEventListener('input', function(e) {
            const value = Number(e.target.value) || 0;
            window.globalDiscount = value;
            updateTotals(window.invoiceItems, value, window.globalTax);
        });
    }
    
    if (window.globalTaxInput) {
        globalTaxInput.addEventListener('input', function(e) {
            const value = Number(e.target.value) || 0;
            window.globalTax = value;
            updateTotals(window.invoiceItems, window.globalDiscount, value);
        });
    }
}



document.addEventListener("input", function (e) {
    // Read shared values
    const subtotal = Number(document.getElementById("subtotalAmounts")?.textContent.replace("$", "")) || 0;
    const globalDiscount = Number(document.getElementById("globalDiscount")?.value) || 0;
    const globalTax = Number(document.getElementById("globalTax")?.value) || 0;
    const discountAmount = (subtotal * globalDiscount) / 100;

    // Update discount amount field if it exists
    const discountAmountInput = document.getElementById("globalDiscountAmount");
    if (discountAmountInput) discountAmountInput.value = discountAmount.toFixed(2);
    // Recalculate totals
    updateTotals(invoiceItems, globalDiscount, globalTax);

    if (e.target.id === "globalTax") {
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = (taxableAmount * globalTax) / 100;

        // Update tax input field
        const taxAmountInput = document.getElementById("taxAmount");
        if (taxAmountInput) taxAmountInput.value = taxAmount.toFixed(2);
    }
});


//for additional charges
document.addEventListener('DOMContentLoaded', () => {
    const invoiceBody = document.getElementById('invoiceItemsBody'); // tbody containing item rows
    window.additionalContainer = document.getElementById('additionalInputsContainer');
    const addChargeBtn = document.getElementById('addChargeBtn');

    // Helper: recalc totals
    function recalcTotals() {
        const globalDiscount = Number(document.getElementById('globalDiscount')?.value) || 0;
        const globalTax = Number(document.getElementById('globalTax')?.value) || 0;

        updateTotals(invoiceItems, globalDiscount, globalTax);
    }

    

    // **Listen for changes in item rows**
    invoiceBody.addEventListener('input', e => {
        const target = e.target;
        if (!target.matches('input')) return;

        const row = target.closest('tr');
        const index = Array.from(invoiceBody.children).indexOf(row);
        if (index > -1) {
            const item = invoiceItems[index];
            if (target.classList.contains('quantity')) item.quantity = Number(target.value) || 0;
            if (target.classList.contains('price')) item.price = Number(target.value) || 0;
            if (target.classList.contains('discountPercent')) item.discountPercent = Number(target.value) || 0;
        }

        recalcTotals();
    });

    // **Add additional charge**
    addChargeBtn.addEventListener('click', () => {
        const inputDiv = document.createElement('div');
        inputDiv.classList.add('additional-input');

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.classList.add('form-control');
        textInput.placeholder = 'Enter charge name';

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.classList.add('form-control');
        numberInput.value = 0;
        numberInput.min = 0;
        numberInput.step = 0.01;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('remove-charge-btn');
        removeBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        removeBtn.addEventListener('click', () => {
            inputDiv.remove();
            recalcTotals();
        });

        // Recalc total as user types
        numberInput.addEventListener('input', recalcTotals);

        inputDiv.appendChild(textInput);
        inputDiv.appendChild(numberInput);
        inputDiv.appendChild(removeBtn);

        window.additionalContainer.appendChild(inputDiv);

        recalcTotals();
    });

    // **Global discount and tax**
    document.getElementById('globalDiscount')?.addEventListener('input', recalcTotals);
    document.getElementById('globalTax')?.addEventListener('input', recalcTotals);

    // Initial calculation
    recalcTotals();

    
});

//sending additional charges name and amount
function additionalChargeName(){
    const charges = []
    const chargesDiv = window.additionalContainer.querySelectorAll('.additional-input')
    chargesDiv.forEach(div => {
        const chargeName = div.querySelector('input[type="text"]').value.trim()
        const chargeAmount = parseFloat(div.querySelector('input[type="number"]').value) || 0
        charges.push({chargeName,chargeAmount});
    })
    console.log(charges)
    return charges
    }

// CLIENT SEARCH FUNCTIONS
export function setupClientSearch() {
    if (!clientNameInput || !clientSearchHint) return;
    
    // Event listeners for client search
    clientNameInput.addEventListener('focus', () => handleClientSearchFocus());
    clientNameInput.addEventListener('input', (e) => handleClientSearch(e));
    clientNameInput.addEventListener('keydown', (e) => handleClientSearchKeydown(e));
    clientNameInput.addEventListener('blur', handleClientSearchBlur);
}

function handleClientSearchFocus() {
    if (clientSearchHint) {
        console.log("focus chaliraxa?")
        showClientSuggestions(window.clients, '', (hintElement) => selectClientFromHint(hintElement));
        
        // Add click event to hints
        clientSearchHint.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectClientFromHint(this);
            });
        });
    }
}

function handleClientSearch(e) {
    console.log("input jaadaexa?")
    const searchTerm = e.target.value.toLowerCase();
    showClientSuggestions(window.clients, searchTerm, (hintElement) => selectClientFromHint(hintElement));
}

function handleClientSearchKeydown(e) {
    if (!clientSearchHint || clientSearchHint.style.display === 'none') {
        console.log("kei pani client suggestion xaina?")
        return;
    }
    
    const hintItems = clientSearchHint.querySelectorAll('.hint-item');
    const visibleHintItems = Array.from(hintItems).filter(item => item.style.display !== 'none');
    
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        
        if (currentSelectedHintIndex >= 0 && currentSelectedHintIndex < visibleHintItems.length) {
            selectClientFromHint(visibleHintItems[currentSelectedHintIndex]);
        } else {
            const searchTerm = e.target.value.toLowerCase();
            let matchedClient = null;
            
            if (searchTerm === '') {
                matchedClient = window.clients[0];
            } else {
                matchedClient = window.clients.find(c => 
                    c.name.toLowerCase().startsWith(searchTerm)
                );
                
                if (!matchedClient) {
                    matchedClient = window.clients.find(c => 
                        c.name.toLowerCase().includes(searchTerm)
                    );
                }
            }
            
            if (matchedClient) {
                fillClientDetails(matchedClient);
                hideClientSearchHint();
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleHintItems.length > 0) {
            currentSelectedHintIndex = (currentSelectedHintIndex + 1) % visibleHintItems.length;
            updateHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleHintItems.length > 0) {
            currentSelectedHintIndex = (currentSelectedHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        hideClientSearchHint();
    }
}

function updateHintSelection(visibleHintItems) {
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    if (currentSelectedHintIndex >= 0 && currentSelectedHintIndex < visibleHintItems.length) {
        visibleHintItems[currentSelectedHintIndex].style.backgroundColor = '#007bff';
        visibleHintItems[currentSelectedHintIndex].style.color = 'white';
    }
}

function handleClientSearchBlur(e) {
    setTimeout(() => {
        hideClientSearchHint();
    }, 200);
}

// PRODUCT SEARCH HANDLERS (reused from events.js but adapted for this page)
export function setupProductSearchHandlersForPage() {
    document.querySelectorAll('.product-search-input').forEach(input => {
        input.addEventListener('focus', (e) => handleProductSearchFocus(e));
        input.addEventListener('input', (e) => handleProductSearch(e));
        input.addEventListener('keydown', (e) => handleProductSearchKeydown(e));
        input.addEventListener('blur', handleProductSearchBlur);
    });
}

function handleProductSearchFocus(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    
    if (hintContainer) {
        showProductSuggestions(itemId, window.products, '', (itemId, hintElement) => selectProductFromHint(itemId, hintElement));
        
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectProductFromHint(itemId, this);
            });
        });
    }
}

function handleProductSearch(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const searchTerm = e.target.value.toLowerCase();
    showProductSuggestions(itemId, window.products, searchTerm, (itemId, hintElement) => selectProductFromHint(itemId, hintElement));
}

function handleProductSearchKeydown(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    
    if (!hintContainer || hintContainer.style.display === 'none') {
        return;
    }
    
    const hintItems = hintContainer.querySelectorAll('.hint-item');
    const visibleHintItems = Array.from(hintItems).filter(item => item.style.display !== 'none');
    
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        
        if (currentSelectedProductHintIndex >= 0 && currentSelectedProductHintIndex < visibleHintItems.length) {
            selectProductFromHint(itemId, visibleHintItems[currentSelectedProductHintIndex]);
        } else {
            const searchTerm = e.target.value.toLowerCase();
            let matchedProduct = null;
            
            if (searchTerm === '') {
                matchedProduct = window.products[0];
            } else {
                matchedProduct = window.products.find(p => 
                    p.name.toLowerCase().startsWith(searchTerm)
                );
                
                if (!matchedProduct) {
                    matchedProduct = window.products.find(p => 
                        p.name.toLowerCase().includes(searchTerm)
                    );
                }
            }
            
            if (matchedProduct) {
                const searchInput = document.querySelector(`.product-search-input[data-id="${itemId}"]`);
                if (searchInput) {
                    searchInput.value = matchedProduct.name;
                    
                    const item = window.invoiceItems.find(i => i.id === itemId);
                    if (item) {
                        item.productId = matchedProduct.id;
                        item.productName = matchedProduct.name;
                        item.description = matchedProduct.category || 'Product';
                        item.price = Number(matchedProduct.selling_price);
                        
                        const row = searchInput.closest('tr');
                        if (row) {
                            const descriptionInput = row.querySelector('.item-description');
                            const priceInput = row.querySelector('.item-price');
                            
                            if (descriptionInput) descriptionInput.value = matchedProduct.category || 'Product';
                            if (priceInput) priceInput.value = matchedProduct.selling_price;
                        }
                        
                        updateItemTotal(itemId, window.invoiceItems);
                        updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
                        
                        if (hintContainer) {
                            hintContainer.style.display = 'none';
                        }
                        
                        const quantityInput = row.querySelector('.item-quantity');
                        if (quantityInput) {
                            setTimeout(() => {
                                quantityInput.focus();
                                quantityInput.select();
                            }, 50);
                        }
                        //add new row here
                        if(itemId == window.invoiceItems.length){
                            addInvoiceItem();
                        }
                        showTotalSection();
                    }
                }
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleHintItems.length > 0) {
            currentSelectedProductHintIndex = (currentSelectedProductHintIndex + 1) % visibleHintItems.length;
            updateProductHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleHintItems.length > 0) {
            currentSelectedProductHintIndex = (currentSelectedProductHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateProductHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        if (hintContainer) {
            hintContainer.style.display = 'none';
        }
    }
}

function updateProductHintSelection(visibleHintItems) {
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    if (currentSelectedProductHintIndex >= 0 && currentSelectedProductHintIndex < visibleHintItems.length) {
        visibleHintItems[currentSelectedProductHintIndex].style.backgroundColor = '#007bff';
        visibleHintItems[currentSelectedProductHintIndex].style.color = 'white';
    }
}

function handleProductSearchBlur(e) {
    setTimeout(() => {
        const itemId = parseInt(e.target.getAttribute('data-id'));
        const hintContainer = document.getElementById(`search-hint-${itemId}`);
        if (hintContainer) {
            hintContainer.style.display = 'none';
            currentSelectedProductHintIndex = -1;
        }
    }, 200);
}

function selectProductFromHint(itemId, hintElement) {
    const productId = hintElement.getAttribute('data-product-id');
    const productName = hintElement.getAttribute('data-product-name');
    const sellingPrice = hintElement.getAttribute('data-product-selling-price');
    const category = hintElement.getAttribute('data-product-category');
    
    const product = window.products.find(p => p.id === parseInt(productId));
    if (!product) return;
    
    const item = window.invoiceItems.find(i => i.id === itemId);
    if (!item) return;
    
    item.productId = product.id;
    item.productName = product.name;
    item.description = product.category || 'Product';
    item.price = Number(product.selling_price);
    
    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`).closest('tr');
    if (!row) return;
    
    const searchInput = row.querySelector('.product-search-input');
    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');
    
    if (searchInput) searchInput.value = product.name;
    if (descriptionInput) descriptionInput.value = product.category || 'Product';
    if (priceInput) priceInput.value = product.selling_price;
    
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedProductHintIndex = -1;
    }
    
    updateItemTotal(itemId, window.invoiceItems);
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
    
    const quantityInput = row.querySelector('.item-quantity');
    if (quantityInput) {
        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 50);
    }
    if(itemId == window.invoiceItems.length){
        addInvoiceItem();
    }
    showTotalSection();
}

export function renderInvoiceItems(invoiceItems, invoiceItemsBody, setupProductSearchHandlers, handleItemUpdate, handleRemoveItem) {
    invoiceItemsBody.innerHTML = '';

    invoiceItems.forEach((item,index) => {
        const discountAmount = Number(item.price) * Number(item.quantity) * (Number(item.discountPercent) / 100);
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${index+1}</td>
    <td style="position: relative;">

    <input type="text" 
        class="product-search-input" 
        data-id="${item.id}"
        placeholder="Type product name (Tab to complete)..."
        value="${item.productName || ''}"
        style="width: 100%;">
    <div class="search-hint product-search-hint" id="search-hint-${item.id}" style="display: none; position: absolute; background: white; border: 1px solid #ddd; max-height: 150px; overflow-y: auto; z-index: 1000; width: 100%;">
        <!-- Product suggestions will be dynamically added here -->
    </div>
</td>
<td><input type="number" class="item-quantity" data-id="${item.id}" value="${item.quantity}" min="1" style="width: 100%;"></td>
<td><input type="number" class="item-price" data-id="${item.id}" value="${item.price}" min="0" step="0.01" style="width: 100%;"></td>
<!-- DISCOUNT CELL -->
            <td class="discount-cell">
                <input type="number"
                       class="discount-percent-input"
                       data-id="${item.id}"
                       value="${item.discountPercent}"
                       min="0" max="100" step="0.01">
                <span>%</span>
                <span class="discount-amount" data-id="${item.id}">
                    Rs. ${discountAmount.toFixed(2)}
                </span>
            </td>

<td class="item-total" data-id="${item.id}">Rs. ${(Number(item.price) * Number(item.quantity) - discountAmount).toFixed(2)}</td>
<td><button class="remove-item-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>
`;
        invoiceItemsBody.appendChild(row);
    });

    // Add event listeners to the new inputs
    setupProductSearchHandlers();

    document.querySelectorAll('.item-quantity, .item-price').forEach(input => {
        input.addEventListener('input', handleItemUpdate);
    });
    document.querySelectorAll('.discount-percent-input').forEach(input => {
    input.addEventListener('input', handleItemUpdate);
});
    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
    // const tbody = invoiceItemsBody;

    // const lastRow = tbody.rows[tbody.rows.length - 1];
    // console.log(lastRow);
    // const lastItem=invoiceItems[invoiceItems.length-2].id
    // console.log(lastItem)

}

// Add invoice item
function addInvoiceItem() {
    const itemId = window.invoiceItems.length + 1;
    
    const newItem = {
        id: itemId,
        productId: '',
        productName: '',
        description: '',
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        price: 0
    };
    
    window.invoiceItems.push(newItem);
    
    renderInvoiceItems(
        window.invoiceItems,
        invoiceItemsBody,
        () => setupProductSearchHandlersForPage(),
        (e) => handleItemUpdate(e),
        (e) => handleRemoveItemWrapper(e)
    );
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
    
    setTimeout(() => {
        const newSearchInput = document.querySelector(`.product-search-input[data-id="${itemId}"]`);
        if (newSearchInput) {
            setTimeout(() => {
                // newSearchInput.focus();
                newSearchInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 50);
        }
    }, 100);
}

// Handle remove item - wrapper to use page-specific product search handler
function handleRemoveItemWrapper(e) {
    const itemId = parseInt(e.target.closest('button').getAttribute('data-id'));
    window.invoiceItems = window.invoiceItems.filter(i => i.id !== itemId);
    
    if (invoiceItemsBody) {
        renderInvoiceItems(
            window.invoiceItems,
            invoiceItemsBody,
            () => setupProductSearchHandlersForPage(),
            (e) => handleItemUpdate(e),
            (e) => handleRemoveItemWrapper(e)
        );
        updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
    }
}

// Update item total
export function updateItemTotal(itemId, invoiceItems) {
    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const discountPercent = Number(item.discountPercent) || 0;

    const discountAmount = quantity * price * (discountPercent / 100);
    const total = (quantity * price) - discountAmount;

    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`)?.closest('tr');
    if (!row) return;

    const itemTotalCell = row.querySelector('.item-total');
    if (!itemTotalCell) return;

    itemTotalCell.textContent = `Rs. ${total.toFixed(2)}`;
}

// Update totals
// Enhanced updateTotals to include additional charges
export function updateTotals(invoiceItems, globalDiscount, globalTax) {
    let subtotal = 0;
    let subtotalDiscountvalue = 0;
    let subtotalAmountValue = 0;
    console.log("utilko subtotal")
    // Calculate subtotal from all items
    invoiceItems.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const discountPercent = Number(item.discountPercent) || 0;

        const itemTotal = quantity * price;
        const discountAmount = itemTotal * (discountPercent / 100);
        const rowTotalAfterDiscount = itemTotal - discountAmount;

        subtotal += itemTotal;
        subtotalDiscountvalue += discountAmount;
        subtotalAmountValue += rowTotalAfterDiscount;
    });
    console.log("aaunu parne subtotal discount pani garisakerw",subtotalAmountValue)


    // **Sum all additional charges dynamically**
     window.additionalChargesTotal = 0;
    document.querySelectorAll('#additionalInputsContainer input[type="number"]').forEach(input => {
        window.additionalChargesTotal += Number(input.value) || 0;
    });
    
    // Update display
    const subtotalAmount = document.getElementById('subtotalAmount');
    const subtotalAmountEl = document.getElementById('subtotalAmounts');
    const subtotalDiscounts = document.getElementById('subtotalDiscount');
    const discountAmountEl = document.getElementById('discountAmount');
    const taxAmountEl = document.getElementById('taxAmount');
    const totalAmountEl = document.getElementById('totalAmount');
    
    // const pailakototal=document.getElementById('subtotalAmounts');

    //yo chai hamro discount laaerw aako subtotal esma garne sab calculation
    const subtotalValue = Number(subtotalAmountEl.innerText.replace('Rs.', ''));


    //esma hamile subtotal ko value haalexum tyo chai without discount ko value item ko just quantity*price
    // Calculate discount amount (percentage of subtotal)
    const discountValue = (subtotalValue * globalDiscount) / 100;
    // console.log("discount amount yo ho ",discountValue)

    // Calculate taxable amount (after discount)
    const taxableAmount = subtotalValue - discountValue;
    // console.log("tax yo amount ma jodinxa",taxableAmount)


    // Calculate tax amount (percentage of taxable amount)
    const taxValue = (taxableAmount * globalTax) / 100;

     // Calculate final total including additional charges
    const total = taxableAmount + taxValue + additionalChargesTotal;
    window.currentTotalValue=total;
    console.log("yo total chai global total",total);

    if (subtotalAmountEl) subtotalAmountEl.textContent = `Rs.${subtotalAmountValue.toFixed(2)}`;
    if (subtotalAmount) subtotalAmount.textContent = `Rs.${subtotal.toFixed(2)}`;
    if (subtotalDiscounts) subtotalDiscounts.textContent = `Rs.${subtotalDiscountvalue.toFixed(2)}`;
    if (discountAmountEl) discountAmountEl.textContent = `Rs.${discountValue.toFixed(2)}`;
    if (taxAmountEl) taxAmountEl.textContent = `Rs.${taxValue.toFixed(2)}`;
    if (totalAmountEl) totalAmountEl.value = `Rs.${total.toFixed(2)}`;
    console.log(totalAmountEl.readOnly);
    // check box for received amount
   
    const checkAmount = document.getElementById('checkAmount');
    window.receivableAmount = document.getElementById("receivedAmount");
    checkAmount.addEventListener('change', function() {
        
        if(checkAmount.checked){
            window.receivableAmount.value = `${total.toFixed(2)}`;
            window.receivableAmount.readOnly = true;
            console.log("are we inside",receivableAmount.value);
        }
        else{
            window.receivableAmount.value = '';
            window.receivableAmount.readOnly = false;
        }
        
    });


}
// Save invoice
export async function saveInvoice(createInvoicePage,invoiceItemsBody) {
    const clientName = clientNameInput.value.trim();
    const invoiceDateValue = invoiceDate.value;
    // const receiveAmount = document.getElementById("receivedAmount");
    const receivedAmount = window.receivableAmount? parseFloat(window.receivableAmount.value) || 0: 0;
    console.log("yo receivable amount",receivedAmount);
    // console.log(globalDiscountInput)
    // console.log(globalTaxInput)
    // const discount = parseFloat(globalDiscountInput.value) || 0;
     const discount = window.globalDiscountInput
        ? parseFloat(window.globalDiscountInput.value) || 0
        : 0;

    console.log("Discount value:", discount);
    const tax = window.globalTaxInput? parseFloat(globalTaxInput.value) || 0: 0;
    console.log("tax value: ",tax)
    //console.log(tax)
    let noteshere = ""
    if(is_addnotebtn){
        noteshere = document.getElementById('note').value
    }
    const additionalchargeName = additionalChargeName()

    //getting total from updateTotals
    // const totalAmount=window.currentTotalValue;
    // Validation
    if (!clientName) {
        showAlert('Please enter client name', 'error');
        clientNameInput.focus();
        return;
    }
    
    if (window.invoiceItems.length === 0) {
        showAlert('Please add at least one item to the invoice', 'error');
        return;
    }
    
    // Show loading state
    const saveBtn = document.getElementById('saveInvoiceBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Invoice...';
    saveBtn.disabled = true;
    
    //preparing for sending data
    try {
        const invoiceData = {
            clientName: clientName,
            invoiceDate: invoiceDateValue,
            items: window.invoiceItems.map(item => ({
                productName: item.productName || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                discountPercent: item.discountPercent || 0,
            })),
            globalDiscount: discount,
            globalTax: tax,
            additionalCharges: window.additionalChargesTotal,
            additionalchargeName: additionalchargeName,
            noteshere: noteshere,
            receivedAmount: receivedAmount,
            // totalAmount: totalAmount,
        };
        
        const response = await fetch('/dashboard/save-invoice/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(invoiceData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message, 'success');
            
                        // Update the invoices list
                        if (result.invoice) {
                            const newInvoice = {
                                id: result.invoice.id,
                                number: result.invoice.number,
                                client: result.invoice.client,
                                issueDate: result.invoice.date,
                                amount: result.invoice.totalAmount,
                                status: 'pending'
                            };
                            
                            // Update invoices array (this will be handled by main.js state management)
                            if (window.invoices) {
                                window.invoices.unshift(newInvoice);
                                const invoicesTableBody = document.getElementById('invoicesTableBody');
                                if (invoicesTableBody) {
                                    loadInvoices(window.invoices, invoicesTableBody);
                                }
                            }
                        }
            //Redirect to dashboard after short delay
            // setTimeout(() => {
            //     window.location.href = '/dashboard/invoices/';
            // }, 1000);
        } else {
            showAlert('Error: ' + (result.error || 'Failed to save invoice'), 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving invoice:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Cancel invoice
function cancelInvoice() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        window.location.href = '/dashboard/invoices/';
    }
}
