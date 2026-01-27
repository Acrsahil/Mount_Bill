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
const billNumber = document.getElementById('billNumber');
const invoiceDate = document.getElementById('invoiceDate');
const purchaseDate = document.getElementById('purchaseDate');
const clientNameInput = document.getElementById('clientName');
const clientSearchHint = document.getElementById('client-search-hint');
const invoiceItemsBody = document.getElementById('invoiceItemsBody');
const addItemBtn = document.getElementById('addItemBtn');
const checkAmount = document.getElementById('checkAmount');

const cancelInvoiceBtnBottom = document.getElementById('cancelInvoiceBtnBottom');

// get the charge section
const totalCharges = document.getElementById('totalCharges');


//function to fetch the purchase length to fill the create purchase bill
async function purchaseCount(){
    const res = await fetch(`/dashboard/purchase-info/`);
    const data = await res.json();
    return data.purchase_data[0].id;
}

// Initialize the page
document.addEventListener('DOMContentLoaded',async function () {
    if (typeof pageMode !== 'undefined') {
    if(pageMode === 'invoice'){
        const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
        // Save invoice button
        if (saveInvoiceBtn) {
            saveInvoiceBtn.addEventListener('click', () => saveInvoice());
        }
        // Generate next invoice number
    if (invoiceNumber) {
        invoiceNumber.value = `INV-${window.nextInvoiceNumber.toString().padStart(3, '0')}`;
    }
    // Set today's date as default
    if (invoiceDate) {
        const today = new Date().toISOString().split('T')[0];
        invoiceDate.value = today;
    }

    }
    
    if(pageMode === 'purchase'){
        const savePurchaseBtn = document.getElementById('savePurchaseBtn');
        savePurchaseBtn.addEventListener('click',async()=>{
        
        await savePurchase()
    })
    if (billNumber) {
        const purchase_count = await purchaseCount() + 1
        billNumber.value = `Bill - ${purchase_count.toString().padStart(3, '0')}`;
    }
    if (purchaseDate) {
        const today = new Date().toISOString().split('T')[0];
        purchaseDate.value = today;
    }
    }
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

let is_addnotebtn = false;
let is_addDiscountBtn = false;
let is_addTaxBtn = false;

//first row on table on first page load
document.addEventListener('DOMContentLoaded', () => {
    addInvoiceItem();
    //for notes or remarks

    const addNoteBtn = document.getElementById('addnoteBtn');

    if (!addNoteBtn) return;

    addNoteBtn.onclick = () => {
        is_addnotebtn = true;
        document.getElementById('additionalNotes').innerHTML = `
        <div class='form-group'>
        <label for='notes'>Notes or Remarks</label>
        <textarea placeholder="Notes here........" id="note" style="resize:none" rows="10" cols="50"></textarea></div>
        `;
        document.getElementById('addnoteBtn').style.display = 'none';
    };

    //for discount charges
    document.getElementById('addDiscountBtn').onclick = () => {
        is_addDiscountBtn = true;
        document.getElementById('discountContainer').innerHTML = `
            <div class="form-group">
                <label for="globalDiscount">Discount(%)</label>
                <input type="number" id="globalDiscount" class="form-control discount-percentage" 
                       value="0" min="0" max="100" step="0.01">
                <label for="globalDiscountAmount">Discount Amount</label>
                <input type="number" id="globalDiscountAmount" class="form-control discount-amount" 
                       value="0" readonly>
            </div>
        `;
        document.getElementById('addDiscountBtn').style.display = 'none';

        // Add event listener for discount percentage
        const discountPercentageInput = document.getElementById('globalDiscount');
        if (discountPercentageInput) {
            discountPercentageInput.addEventListener('input', function () {
                updateGlobalDiscount();
            });
        }
    };

    //for tax charges
    document.getElementById('addTaxBtn').onclick = () => {
        is_addTaxBtn = true;
        const taxContainer = document.getElementById('taxContainer');

        taxContainer.innerHTML = `
            <div class="form-group">
                <label for="globalTax">Tax(%)</label>
                <input type="number" id="globalTax" class="form-control"
                       value="0" min="0" max="100" step="0.01">
                <label for="taxAmount">Tax Amount</label>
                <input type="number" id="taxAmount" class="form-control"
                       value="0" readonly>
            </div>
        `;

        document.getElementById('addTaxBtn').style.display = 'none';

        // Add event listener for tax percentage
        const taxPercentageInput = document.getElementById('globalTax');
        if (taxPercentageInput) {
            taxPercentageInput.addEventListener('input', function () {
                updateGlobalTax();
            });
        }
    };
});

//function to save customer from invoice
export async function saveCustomer(){
    const clientName = document.getElementById('clientName')?.value;

    try{
            const customer_name = {
                clientName:clientName,
            }
        // Send AJAX request to Django
            const response = await fetch(`/dashboard/save-customer/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': window.djangoData.csrfToken,
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify(customer_name)
            });
    
            const result = await response.json();
            if(result.success){
                document.getElementById('clientName').value=result.name;
                console.log("successfull")
            }
        }catch (error) {
            console.error('Error saving:', error);
}
}

//delete invoice 
export async function deleteInvoice(){
    const deleteBtn = document.querySelector('.action-delete');
    if (!deleteBtn || !confirm("Are you sure you want to delete this invoice?")) return;
    
    const invoiceId = deleteBtn.getAttribute("data-id");
    const csrfToken = deleteBtn.getAttribute("data-token");
    
    try {
        const response = await fetch(`/dashboard/delete_invoice/${invoiceId}/`, {
            method: "POST",
            headers: { "X-CSRFToken": csrfToken, "X-Requested-With": "XMLHttpRequest" }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.success) deleteBtn.closest("tr").remove();
        else alert('Delete failed: ' + (data.message || 'Unknown error'));
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('Network error. Please try again.');
    }
}


//function to show total section
export function showTotalSection() {
    if (totalCharges) {
        totalCharges.style.display = 'block';
    }
}

// Function to update global discount
function updateGlobalDiscount() {
    const discountPercentageInput = document.getElementById('globalDiscount');
    const discountAmountInput = document.getElementById('globalDiscountAmount');
    const subtotalAmountEl = document.getElementById('subtotalAmounts');

    if (!discountPercentageInput || !discountAmountInput || !subtotalAmountEl) return;

    const subtotalValue = parseFloat(subtotalAmountEl.textContent.replace('Rs.', '')) || 0;
    const discountPercentage = parseFloat(discountPercentageInput.value) || 0;

    // Calculate discount amount
    const discountAmount = (subtotalValue * discountPercentage) / 100;

    // Update the discount amount field
    discountAmountInput.value = discountAmount.toFixed(2);

    // Update the window.globalDiscount value
    window.globalDiscount = discountPercentage;

    // Update totals
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
}

// Function to update global tax
function updateGlobalTax() {
    const taxPercentageInput = document.getElementById('globalTax');
    const taxAmountInput = document.getElementById('taxAmount');
    const subtotalAmountEl = document.getElementById('subtotalAmounts');
    const discountAmountInput = document.getElementById('globalDiscountAmount');

    if (!taxPercentageInput || !taxAmountInput || !subtotalAmountEl) return;

    const subtotalValue = parseFloat(subtotalAmountEl.textContent.replace('Rs.', '')) || 0;
    const discountAmount = discountAmountInput ? parseFloat(discountAmountInput.value) || 0 : 0;
    const taxableAmount = subtotalValue - discountAmount;
    const taxPercentage = parseFloat(taxPercentageInput.value) || 0;

    // Calculate tax amount
    const taxAmount = (taxableAmount * taxPercentage) / 100;

    // Update the tax amount field
    taxAmountInput.value = taxAmount.toFixed(2);

    // Update the window.globalTax value
    window.globalTax = taxPercentage;

    // Update totals
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
}

// Setup all event listeners for the page
function setupPageEventListeners() {
    // Add item button
    if (addItemBtn) {
        addItemBtn.addEventListener('click', () => addInvoiceItem());
    }

    if (cancelInvoiceBtnBottom) {
        cancelInvoiceBtnBottom.addEventListener('click', () => cancelInvoice());
    }

    // Global discount input listener
    document.addEventListener('input', function (e) {
        if (e.target && e.target.id === 'globalDiscount') {
            updateGlobalDiscount();
        }
        if (e.target && e.target.id === 'globalTax') {
            updateGlobalTax();
        }
    });
}

//for additional charges
document.addEventListener('DOMContentLoaded', () => {
    const invoiceBody = document.getElementById('invoiceItemsBody');
    window.additionalContainer = document.getElementById('additionalInputsContainer');
    const addChargeBtn = document.getElementById('addChargeBtn');

    // Limit additional charge amount input (dynamic safe)
    if(!window.additionalContainer) return;
    window.additionalContainer.addEventListener('keydown', function (e) {
        const input = e.target;

        if (!input.matches('input[type="number"]')) return;

        const allowedKeys = [
            'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'
        ];

        if (allowedKeys.includes(e.key)) return;

        const value = input.value;
        const hasDecimal = value.includes('.');

        // Allow digits
        if (/^\d$/.test(e.key)) {
            const [intPart] = value.split('.');
            if (intPart.length >= 8 && !hasDecimal) {
                e.preventDefault();
            }
            return;
        }

        // Allow one decimal point
        if (e.key === '.' && !hasDecimal) return;

        e.preventDefault();
    });

    // Block paste (simple + safe)
    window.additionalContainer.addEventListener('paste', function (e) {
        if (e.target.matches('input[type="number"]')) {
            e.preventDefault();
        }
    });


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
        textInput.classList.add('form-control', 'additional-chargename-section');
        textInput.placeholder = 'Enter charge name';
        textInput.required = true;

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.classList.add('form-control', 'additional-chargeamt-section');
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
export function additionalChargeName() {
    const charges = [];
    const chargesDiv = window.additionalContainer.querySelectorAll('.additional-input');
    chargesDiv.forEach(div => {
        const chargeName = div.querySelector('input[type="text"]').value.trim();
        const chargeAmount = parseFloat(div.querySelector('input[type="number"]').value) || 0;
        charges.push({ chargeName, chargeAmount });
    });
    return charges;
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
        const searchHint = document.getElementById('client-search-hint');
        showClientSuggestions(window.clients, '', (hintElement) => selectClientFromHint(hintElement),searchHint);

        // Add click event to hints
        clientSearchHint.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function (e) {
                e.preventDefault();
                selectClientFromHint(this);
            });
        });
    }
}

function handleClientSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const searchHint = document.getElementById('client-search-hint');
    showClientSuggestions(window.clients, searchTerm, (hintElement) => selectClientFromHint(hintElement),searchHint);
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

// PRODUCT SEARCH HANDLERS
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
        console.log("yaa hudae thyo kei")
        showProductSuggestions(itemId, window.products, '', (itemId, hintElement) => selectProductFromHint(itemId, hintElement));

        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function (e) {
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
                        if (itemId == window.invoiceItems.length) {
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

export function selectProductFromHint(itemId, hintElement) {
    const productId = hintElement.getAttribute('data-product-id');

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
    if (itemId == window.invoiceItems.length) {
        addInvoiceItem();
    }
    showTotalSection();
}

export function renderInvoiceItems(invoiceItems, invoiceItemsBody, setupProductSearchHandlers, handleItemUpdate, handleRemoveItem) {
    if(!invoiceItemsBody) return;
    invoiceItemsBody.innerHTML = '';

    invoiceItems.forEach((item, index) => {
        const discountAmount = Number(item.price) * Number(item.quantity) * (Number(item.discountPercent) / 100);
        const row = document.createElement('tr');
        row.innerHTML = `
        <td>${index + 1}</td>
    <td style="position: relative;">
        <input type="text" style="font-size: 13px;"
            class="product-search-input" 
            data-id="${item.id}"
            placeholder="Type product name (Tab to complete)..."
            value="${item.productName || ''}"
            >
        <div  class="search-hint product-search-hint" id="search-hint-${item.id}" style="display: none; position: absolute; background: white; border: 1px solid #ddd; overflow-y: auto; z-index: 1000;">
            <!-- Product suggestions will be dynamically added here -->
        </div>
    </td>
    <td><input type="number" class="item-quantity" data-id="${item.id}" value="${item.quantity}" min="1" ></td>
    <td><input type="number" class="item-price" data-id="${item.id}" value="${item.price}" min="0" step="0.01" ></td>
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
        // Limit quantity to max 8 digits (typing + paste)
        invoiceItemsBody.addEventListener('keydown', function (e) {
            if (!e.target.classList.contains('item-quantity')) return;

            const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];

            if (allowedKeys.includes(e.key)) return;

            // Only digits
            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
                return;
            }

            // Max 8 digits
            if (e.target.value.length >= 8) {
                e.preventDefault();
            }
        });

        invoiceItemsBody.addEventListener('paste', function (e) {
            if (e.target.classList.contains('item-quantity')) {
                e.preventDefault();
            }
        });

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
}

// Add invoice item
export function addInvoiceItem() {
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
export function updateTotals(invoiceItems, globalDiscount, globalTax) {
    let subtotal = 0;
    let subtotalDiscountvalue = 0;
    let subtotalAmountValue = 0;

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

    // **Sum all additional charges dynamically**
    window.additionalChargesTotal = 0;
    if (window.additionalContainer) {
        document.querySelectorAll('#additionalInputsContainer input[type="number"]').forEach(input => {
            window.additionalChargesTotal += Number(input.value) || 0;
        });
    }

    // Update display elements
    const subtotalAmount = document.getElementById('subtotalAmount');
    const subtotalAmountEl = document.getElementById('subtotalAmounts');
    const subtotalDiscounts = document.getElementById('subtotalDiscount');

    // Update discount and tax fields
    const discountPercentageInput = document.getElementById('globalDiscount');
    const discountAmountInput = document.getElementById('globalDiscountAmount');
    const taxPercentageInput = document.getElementById('globalTax');
    const taxAmountInput = document.getElementById('taxAmount');


    let globalDiscountPercent = 0;
    let globalTaxPercent = 0;

    if (discountPercentageInput) {
        globalDiscountPercent = discountPercentageInput ? parseFloat(discountPercentageInput.value) || 0 : 0;
        console.log(globalDiscountPercent)
    }

    if (discountPercentageInput) {
        globalTaxPercent = taxPercentageInput ? parseFloat(taxPercentageInput.value) || 0 : 0;
        console.log(globalTaxPercent)
    }



    // Calculate discount amount
    const discountValue = (subtotalAmountValue * globalDiscountPercent) / 100;

    // Calculate taxable amount (after discount)
    const taxableAmount = subtotalAmountValue - discountValue;

    // Calculate tax amount
    const taxValue = (taxableAmount * globalTaxPercent) / 100;

    // Calculate final total
    const total = taxableAmount + taxValue + window.additionalChargesTotal;
    window.currentTotalValue = total;

    // Update display
    if (subtotalAmountEl) subtotalAmountEl.textContent = `Rs. ${subtotalAmountValue.toFixed(2)}`;
    if (subtotalAmount) subtotalAmount.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (subtotalDiscounts) subtotalDiscounts.textContent = `Rs. ${subtotalDiscountvalue.toFixed(2)}`;

    // Update discount amount field if it exists
    if (discountAmountInput) {
        discountAmountInput.value = discountValue.toFixed(2);
    }

    // Update tax amount field if it exists
    if (taxAmountInput) {
        taxAmountInput.value = taxValue.toFixed(2);
    }

    const totalAmountEl = document.getElementById('totalAmount');
    if (totalAmountEl) totalAmountEl.value = `Rs. ${total.toFixed(2)}`;

    // Update window global values
    window.globalDiscount = globalDiscountPercent;
    window.globalTax = globalTaxPercent;

    // check box for received amount
    const checkAmount = document.getElementById('checkAmount');
    window.receivableAmount = document.getElementById("receivedAmount");

    if (checkAmount && window.receivableAmount) {
        checkAmount.addEventListener('change', function () {
            if (checkAmount.checked) {
                window.receivableAmount.value = `${total.toFixed(2)}`;
                window.receivableAmount.readOnly = true;
            }
            else {
                window.receivableAmount.value = '';
                window.receivableAmount.readOnly = false;
            }
        });
    }

    //for due amount
    const balanceDueAmount = document.getElementById('balanceDueAmount');
    const balanceDue = document.getElementById('balanceDue');
    if(!window.receivableAmount) return;
    window.receivableAmount.addEventListener('input', () => {
        if (window.receivableAmount.value == "" || window.receivableAmount.value >= total) {
            balanceDueAmount.style.display = "none";
        }
        else {
            balanceDueAmount.style.display = "flex";
        }
        balanceDue.value = total - Number(window.receivableAmount.value);
       
    });
}

// Save invoice
export async function saveInvoice() {
    const clientName = clientNameInput.value.trim();
    const invoiceDateValue = invoiceDate.value;
    const receivedAmount = window.receivableAmount ? parseFloat(window.receivableAmount.value) || 0 : 0;

    // Get discount and tax values
    const discountPercentageInput = document.getElementById('globalDiscount');
    const discountAmountInput = document.getElementById('globalDiscountAmount');
    const taxPercentageInput = document.getElementById('globalTax');
    const taxAmountInput = document.getElementById('taxAmount');

    const discountPercent = discountPercentageInput ? parseFloat(discountPercentageInput.value) || 0 : 0;
    const discountAmount = discountAmountInput ? parseFloat(discountAmountInput.value) || 0 : 0;
    const taxPercent = taxPercentageInput ? parseFloat(taxPercentageInput.value) || 0 : 0;
    const taxAmount = taxAmountInput ? parseFloat(taxAmountInput.value) || 0 : 0;
    console.log("global discount ko value",discountPercent)
    let noteshere = "";
    if (is_addnotebtn) {
        noteshere = document.getElementById('note').value;
    }

    const additionalchargeName = additionalChargeName();

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

    try {
        const invoiceData = {
            clientName: clientName,
            invoiceDate: invoiceDateValue,
            items: window.invoiceItems.map(item => ({
                productName: item.productName || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                discount: item.discount || 0,
                discountPercent: item.discountPercent || 0,
            })),
            globalDiscountPercent: Number(globalDiscount).toFixed(2),
            globalDiscountAmount: discountAmount,
            globalTaxPercent: Number(globalTax).toFixed(2),
            globalTaxAmount: taxAmount,
            additionalCharges: window.additionalChargesTotal,
            additionalchargeName: additionalchargeName,
            noteshere: noteshere,
            receivedAmount: receivedAmount,
        };



        console.log('Sending invoice data:->>>>>>>>>>>>>>>>>>>>>>>', invoiceData);

        const response = await fetch('/dashboard/save-invoice/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(invoiceData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.field_errors) {
                const fe = result.field_errors;

                // Prefer total_amount, but fall back to any field/non-field errors.
                const candidate =
                    fe.total_amount ??
                    fe.__all__ ??              // model.clean() often uses __all__
                    fe.non_field_errors ??     // sometimes this key is used
                    Object.values(fe)[0];      // fallback: first field

                const msg = Array.isArray(candidate) ? candidate[0] : candidate || result.error || 'Validation error';
                showAlert(msg, 'error');
            } else {
                showAlert(result.error || 'Something went wrong', 'error');
            }
            return;
        }



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
            setTimeout(() => {
                window.location.href = '/dashboard/invoices/';
            }, 1000);
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


//saving purchase bill
export async function savePurchase() {
    const customerName = document.getElementById('clientName');
    const clientName = customerName.value.trim();
    const purchaseDateValue = purchaseDate.value;
    const receivedAmount = window.receivableAmount ? parseFloat(window.receivableAmount.value) || 0 : 0;

    // Get discount and tax values
    const discountPercentageInput = document.getElementById('globalDiscount');
    const taxPercentageInput = document.getElementById('globalTax');

    const discountPercent = discountPercentageInput ? parseFloat(discountPercentageInput.value) || 0 : 0;
    const taxPercent = taxPercentageInput ? parseFloat(taxPercentageInput.value) || 0 : 0;
    
    let noteshere = "";
    if (is_addnotebtn) {
        noteshere = document.getElementById('note').value;
    }

    const additionalchargeName = additionalChargeName();

    // Validation
    if (!clientName) {
        showAlert('Please enter client name', 'error');
        clientName.focus();
        return;
    }

    if (window.invoiceItems.length === 0) {
        showAlert('Please add at least one item to the purchase', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('savePurchaseBtn');
    const originalText = saveBtn.innerHTML;

    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Invoice...';
    saveBtn.disabled = true;

    try {
        const purchaseData = {
            clientName: clientName,
            purchaseDate: purchaseDateValue,
            items: window.invoiceItems.map(item => ({
                productName: item.productName || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.price || 0,
                discount: item.discount || 0,
                discountPercent: item.discountPercent || 0,
            })),
            globalDiscountPercent: Number(globalDiscount).toFixed(2),
            globalTaxPercent: Number(globalTax).toFixed(2),
            additionalCharges: window.additionalChargesTotal,
            additionalchargeName: additionalchargeName,
            noteshere: noteshere,
            receivedAmount: receivedAmount,
        };



        console.log('Sending purchase data:->>>>>>>>>>>>>>>>>>>>>>>', purchaseData);

        const response = await fetch('/dashboard/save-purchase/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(purchaseData)
        });

        const result = await response.json();

        if (!response.ok) {
            if (result.field_errors) {
                const fe = result.field_errors;

                // Prefer total_amount, but fall back to any field/non-field errors.
                const candidate =
                    fe.total_amount ??
                    fe.__all__ ??              // model.clean() often uses __all__
                    fe.non_field_errors ??     // sometimes this key is used
                    Object.values(fe)[0];      // fallback: first field

                const msg = Array.isArray(candidate) ? candidate[0] : candidate || result.error || 'Validation error';
                showAlert(msg, 'error');
            } else {
                showAlert(result.error || 'Something went wrong', 'error');
            }
            return;
        }



        if (result.success) {
            showAlert(result.message, 'success');

            //Redirect to dashboard after short delay
            setTimeout(() => {
                window.location.href = '/dashboard/purchase/';
            }, 1000);
        } else {
            showAlert('Error: ' + (result.error || 'Failed to save purchase bill'), 'error');
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error saving purchase bill:', error);
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
