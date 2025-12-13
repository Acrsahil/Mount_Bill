// Event listeners and UI interaction handlers
import { updateTotals, updateItemTotal, updateStats, updateClientStats, showAlert } from './utils.js';
import { 
    renderInvoiceItems, 

    loadProducts, 
    loadClients, 
    loadInvoices, 
    filterInvoices, 
    filterProducts, 
    filterClients,
    showProductSuggestions,
    showClientSuggestions,
    showProductNameSuggestions,
    showCategorySuggestions,
    hideClientSearchHint,
    hideProductNameSearchHint,
    hideCategorySearchHint,
    hideSearchHints,
    fillClientDetails,
    clearClientDetails,
    fillProductDetails
} from './dom.js';
import { saveInvoice, saveProduct } from './api.js';

// Track currently selected hint for keyboard navigation
let currentSelectedHintIndex = -1;
let currentSelectedProductHintIndex = -1;
let currentSelectedProductNameHintIndex = -1;
let currentSelectedCategoryHintIndex = -1;

// Export functions to be used by main.js
export function setupEventListeners(
    createInvoiceBtn,
    addProductBtn,
    addNewProductBtn,
    addClientBtn,
    closeInvoiceModal,
    closeProductModal,
    closeClientModal,
    cancelInvoiceBtn,
    cancelProductBtn,
    cancelClientBtn,
    saveInvoiceBtn,
    saveProductBtn,
    saveClientBtn,
    addItemBtn,
    searchInput,
    productSearchInput,
    clientSearchInput,
    globalDiscountInput,
    globalTaxInput,
    menuItems,
    tabContents,
    invoiceItemsBody,
    productList,
    invoicesTableBody,
    clientsTableBody,
    invoiceNumber,
    invoiceDate,
    createInvoiceModal,
    addProductModal,
    addClientModal
) {
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', () => {
            openCreateInvoiceModal(invoiceNumber, invoiceDate, createInvoiceModal, globalDiscountInput, globalTaxInput, invoiceItemsBody);
        });
    }
    if (addProductBtn) addProductBtn.addEventListener('click', () => openAddProductModal(addProductModal));
    if (addNewProductBtn) addNewProductBtn.addEventListener('click', () => openAddProductModal(addProductModal));
    if (addClientBtn) addClientBtn.addEventListener('click', () => openClientModal(addClientModal));
    if (closeInvoiceModal) closeInvoiceModal.addEventListener('click', () => closeInvoiceModalFunc(createInvoiceModal));
    if (closeProductModal) closeProductModal.addEventListener('click', () => closeProductModalFunc(addProductModal));
    if (closeClientModal) closeClientModal.addEventListener('click', () => closeClientModalFunc(addClientModal));
    if (cancelInvoiceBtn) cancelInvoiceBtn.addEventListener('click', () => closeInvoiceModalFunc(createInvoiceModal));
    if (cancelProductBtn) cancelProductBtn.addEventListener('click', () => closeProductModalFunc(addProductModal));
    if (cancelClientBtn) cancelClientBtn.addEventListener('click', () => closeClientModalFunc(addClientModal));
    if (saveInvoiceBtn) saveInvoiceBtn.addEventListener('click', () => saveInvoice(createInvoiceModal, invoiceItemsBody));
    if (saveProductBtn) saveProductBtn.addEventListener('click', () => saveProduct(addProductModal));
    if (saveClientBtn) saveClientBtn.addEventListener('click', () => saveClient(addClientModal, clientsTableBody));
    if (addItemBtn) addItemBtn.addEventListener('click', () => addInvoiceItem(invoiceItemsBody));
    if (searchInput) searchInput.addEventListener('input', () => filterInvoices(window.invoices, searchInput, invoicesTableBody));
    if (productSearchInput) productSearchInput.addEventListener('input', () => filterProducts(window.products, productSearchInput, productList, editProduct, deleteProduct));
    if (clientSearchInput) clientSearchInput.addEventListener('input', () => filterClients(window.clients, clientSearchInput, clientsTableBody));

    // Global discount and tax listeners
    if (globalDiscountInput) {
        globalDiscountInput.addEventListener('input', function(e) {
            const value = Number(e.target.value) || 0;
            window.globalDiscount = value;
            updateTotals(window.invoiceItems, value, window.globalTax);
        });
    }

    if (globalTaxInput) {
        globalTaxInput.addEventListener('input', function(e) {
            const value = Number(e.target.value) || 0;
            window.globalTax = value;
            updateTotals(window.invoiceItems, window.globalDiscount, value);
        });
    }

    // Tab navigation
    menuItems.forEach(item => {
        if (item.dataset.tab) {
            item.addEventListener('click', function() {
                menuItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');

                const tabId = this.dataset.tab;
                tabContents.forEach(tab => {
                    tab.classList.remove('active');
                    if (tab.id === tabId) {
                        tab.classList.add('active');
                    }
                });
            });
        }
    });
}

// CLIENT MANAGEMENT FUNCTIONS
export function openClientModal(addClientModal) {
    console.log('Opening client modal');
    
    if (!addClientModal) {
        console.error('Client modal not found!');
        return;
    }
    
    // Reset only the fields that exist in the simplified modal
    document.getElementById('clientNameInput').value = '';
    document.getElementById('clientPhoneInput').value = '';
    
    // Show the modal
    addClientModal.style.display = 'flex';
    
    // Auto-focus on the first input field
    setTimeout(() => {
        const firstInput = document.getElementById('clientNameInput');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
}

export function closeClientModalFunc(addClientModal) {
    if (addClientModal) {
        addClientModal.style.display = 'none';
    }
}

// Save client to database via AJAX
export async function saveClient(addClientModal, clientsTableBody) {
    // Only get fields that exist in the simplified modal
    const clientName = document.getElementById('clientNameInput').value.trim();
    const clientPhone = document.getElementById('clientPhoneInput').value.trim();
    const clientAddress = document.getElementById("clientAddressInput").value.trim();
    const clientEmail = document.getElementById('clientEmailInput').value.trim();
    const clientPanNo = document.getElementById('clientPanNoInput').value.trim();
    // Validation
    if (!clientName || !clientPhone) {
        showAlert('Please fill in all required fields (Name, Phone)', 'error');
        return;
    }


    // Show loading state
    const saveBtn = document.getElementById('saveClientBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        // Prepare data for sending to database
        const clientData = {
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            address: clientAddress,
            pan_id: clientPanNo,
        };

        console.log('Saving client to database:', clientData);

        // Send AJAX request to Django backend
        const response = await fetch('/dashboard/save-client/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(clientData)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            // Add the new client to the local clients array with the ID from database
            const newClient = {
                id: result.client.id,
                name: result.client.name,
                email: result.client.email,
                phone: result.client.phone,
                address: result.client.address,
                totalInvoices: 0,
                totalSpent: 0
            };

            // Update the global clients array
            window.clients.push(newClient);
            
            // Update the nextClientId to avoid conflicts
            window.nextClientId = Math.max(window.nextClientId, result.client.id + 1);

            // Update UI
            loadClients(window.clients, clientsTableBody);
            updateClientStats(window.clients);

            // Show success message
            showAlert(result.message, 'success');

            // Close modal after short delay
            setTimeout(() => {
                closeClientModalFunc(addClientModal);
            }, 1500);

        } else {
            showAlert('Error: ' + (result.error || 'Failed to save client'), 'error');
        }

    } catch (error) {
        console.error('Error saving client:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// INVOICE MODAL FUNCTIONS
export function openCreateInvoiceModal(invoiceNumber, invoiceDate, createInvoiceModal, globalDiscountInput, globalTaxInput, invoiceItemsBody) {
    // Generate next invoice number
    invoiceNumber.value = `INV-${window.nextInvoiceNumber.toString().padStart(3, '0')}`;

    // Reset form
    clearClientDetails();

    // Clear invoice items
    window.invoiceItems = [];
    invoiceItemsBody.innerHTML = '';

    // Reset global discount and tax
    window.globalDiscount = 0;
    window.globalTax = 0;

    // Reset discount and tax inputs
    if (globalDiscountInput) globalDiscountInput.value = '0';
    if (globalTaxInput) globalTaxInput.value = '0';

    // Reset totals
    updateTotals([], 0, 0);

    // Show modal
    createInvoiceModal.style.display = 'flex';

    // Auto-focus on client name field
    setTimeout(() => {
        const clientNameInput = document.getElementById('clientName');
        if (clientNameInput) {
            clientNameInput.focus();
        }
    }, 100);
}

export function closeInvoiceModalFunc(createInvoiceModal) {
    createInvoiceModal.style.display = 'none';
    hideSearchHints();
}

export function openAddProductModal(addProductModal) {
    // Reset form
    document.getElementById('productName').value = '';
    document.getElementById('productCostPrice').value = '';
    document.getElementById('productSellingPrice').value = '';
    document.getElementById('productCategory').value = '';

    // Show modal
    addProductModal.style.display = 'flex';

    // Auto-focus on product name field
    setTimeout(() => {
        const productNameInput = document.getElementById('productName');
        if (productNameInput) {
            productNameInput.focus();
        }
    }, 100);
}

export function closeProductModalFunc(addProductModal) {
    addProductModal.style.display = 'none';
    hideSearchHints();
}

export function addInvoiceItem(invoiceItemsBody) {
    const itemId = window.invoiceItems.length + 1;

    const newItem = {
        id: itemId,
        productId: '',
        productName: '',
        description: '',
        quantity: 1,
        price: 0
    };

    window.invoiceItems.push(newItem);
    
    renderInvoiceItems(
        window.invoiceItems,
        invoiceItemsBody,
        () => setupProductSearchHandlers(),
        (e) => handleItemUpdate(e),
        (e) => handleRemoveItem(e)
    );
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);

    // GENTLE SCROLLING - FIXED VERSION
    setTimeout(() => {
        // Only scroll the modal content, not the entire page
        const modalBody = document.querySelector('.modal-body');
        const invoiceTable = document.querySelector('.invoice-items-table');
        
        if (modalBody) {
            // Smoothly scroll modal body to bottom
            modalBody.scrollTo({
                top: modalBody.scrollHeight,
                behavior: 'smooth'
            });
        } else if (invoiceTable) {
            // Alternative: scroll the table container
            invoiceTable.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'end',
                inline: 'nearest'
            });
        }
        
        // Focus on the new input WITHOUT aggressive scrolling
        const newSearchInput = document.querySelector(`.product-search-input[data-id="${itemId}"]`);
        if (newSearchInput) {
            setTimeout(() => {
                newSearchInput.focus();
                // Use a more gentle scroll into view
                newSearchInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'nearest'
                });
            }, 50);
        }
    }, 100); // Increased delay for smoother experience
}


// PRODUCT SEARCH HANDLERS
export function setupProductSearchHandlers() {
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
        
        // Add click event to hints
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
            // Select the currently highlighted hint
            selectProductFromHint(itemId, visibleHintItems[currentSelectedProductHintIndex]);
        } else {
            // Select the first matching product
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
                        item.price = Number(matchedProduct.selling_price); // Use selling price

                        const row = searchInput.closest('tr');
                        if (row) {
                            const descriptionInput = row.querySelector('.item-description');
                            const priceInput = row.querySelector('.item-price');

                            if (descriptionInput) descriptionInput.value = matchedProduct.category || 'Product';
                            if (priceInput) priceInput.value = matchedProduct.selling_price; // Use selling price
                        }

                        updateItemTotal(itemId, window.invoiceItems);
                        updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);

                        const hintContainer = document.getElementById(`search-hint-${itemId}`);
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
                    }
                }
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Navigate down through hints
        if (visibleHintItems.length > 0) {
            currentSelectedProductHintIndex = (currentSelectedProductHintIndex + 1) % visibleHintItems.length;
            updateProductHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up through hints
        if (visibleHintItems.length > 0) {
            currentSelectedProductHintIndex = (currentSelectedProductHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateProductHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        const hintContainer = document.getElementById(`search-hint-${itemId}`);
        if (hintContainer) {
            hintContainer.style.display = 'none';
        }
    }
}

function updateProductHintSelection(visibleHintItems) {
    // Remove selection from all items
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    // Add selection to current item
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
    const costPrice = hintElement.getAttribute('data-product-cost-price');
    // const category = hintElement.getAttribute('data-product-category');

    const product = window.products.find(p => p.id === parseInt(productId));
    if (!product) return;

    const item = window.invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    // Update the item with product details - USE SELLING PRICE for invoices
    item.productId = product.id;
    item.productName = product.name;
    // item.description = product.category || 'Product';
    item.price = Number(product.selling_price); // Use selling price

    // Update the row inputs
    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`).closest('tr');
    if (!row) return;

    const searchInput = row.querySelector('.product-search-input');
    // const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');

    if (searchInput) searchInput.value = product.name;
    // if (descriptionInput) descriptionInput.value = product.category || 'Product';
    if (priceInput) priceInput.value = product.selling_price; // Use selling price

    // Hide hints
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedProductHintIndex = -1;
    }

    // Update calculations
    updateItemTotal(itemId, window.invoiceItems);
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);

    // Move focus to quantity field for quick editing
    const quantityInput = row.querySelector('.item-quantity');
    if (quantityInput) {
        setTimeout(() => {
            quantityInput.focus();
            quantityInput.select();
        }, 50);
    }
}

// Handle item updates
export function handleItemUpdate(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const field = e.target.classList[0];
    const value = e.target.value;

    const item = window.invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    if (field === 'item-quantity') {
        item.quantity = Number(value) || 1;
    } else if (field === 'item-price') {
        item.price = Number(value) || 0;
    }
    else if (field === 'discount-percent-input') {
     item.discountPercent = Number(value) || 0;
    }

// Recalculate discount on change
    item.discountAmount = Number(item.price) * Number(item.quantity) * (Number(item.discountPercent) / 100);

     // Update discount amount in UI
    const discountAmountCell = document.querySelector(`.discount-amount[data-id="${itemId}"]`);
    if (discountAmountCell) {
        discountAmountCell.textContent = `Rs. ${item.discountAmount.toFixed(2)}`;
    }

    updateItemTotal(itemId, window.invoiceItems);
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
}

// Handle remove item
export function handleRemoveItem(e) {
    const itemId = parseInt(e.target.closest('button').getAttribute('data-id'));
    window.invoiceItems = window.invoiceItems.filter(i => i.id !== itemId);
    const invoiceItemsBody = document.getElementById('invoiceItemsBody');
    if (invoiceItemsBody) {
        renderInvoiceItems(
            window.invoiceItems,
            invoiceItemsBody,
            () => setupProductSearchHandlers(),
            (e) => handleItemUpdate(e),
            (e) => handleRemoveItem(e)
        );
        updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
    }
}

// CLIENT SEARCH FUNCTIONS
export function setupClientSearch() {
    const clientNameInput = document.getElementById('clientName');
    const clientSearchHint = document.getElementById('client-search-hint');
    
    if (!clientNameInput || !clientSearchHint) return;
    
    // Event listeners for client search
    clientNameInput.addEventListener('focus', () => handleClientSearchFocus());
    clientNameInput.addEventListener('input', (e) => handleClientSearch(e));
    clientNameInput.addEventListener('keydown', (e) => handleClientSearchKeydown(e));
    clientNameInput.addEventListener('blur', handleClientSearchBlur);
}

function handleClientSearchFocus() {
    const hintContainer = document.getElementById('client-search-hint');
    if (hintContainer) {
        showClientSuggestions(window.clients, '', (hintElement) => selectClientFromHint(hintElement));
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectClientFromHint(this);
            });
        });
    }
}

function handleClientSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    showClientSuggestions(window.clients, searchTerm, (hintElement) => selectClientFromHint(hintElement));
}

function handleClientSearchKeydown(e) {
    const hintContainer = document.getElementById('client-search-hint');
    if (!hintContainer || hintContainer.style.display === 'none') {
        return;
    }

    const hintItems = hintContainer.querySelectorAll('.hint-item');
    const visibleHintItems = Array.from(hintItems).filter(item => item.style.display !== 'none');
    
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        
        if (currentSelectedHintIndex >= 0 && currentSelectedHintIndex < visibleHintItems.length) {
            // Select the currently highlighted hint
            selectClientFromHint(visibleHintItems[currentSelectedHintIndex]);
        } else {
            // Select the first matching client
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
        // Navigate down through hints
        if (visibleHintItems.length > 0) {
            currentSelectedHintIndex = (currentSelectedHintIndex + 1) % visibleHintItems.length;
            updateHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up through hints
        if (visibleHintItems.length > 0) {
            currentSelectedHintIndex = (currentSelectedHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        hideClientSearchHint();
    }
}

function updateHintSelection(visibleHintItems) {
    // Remove selection from all items
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    // Add selection to current item
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

//removed the client id to client name and worked fine
export function selectClientFromHint(hintElement) {
    const clientName = hintElement.getAttribute('data-client-name');
    const client = window.clients.find(c => c.name === (clientName));
    if (client) {
        fillClientDetails(client);
        hideClientSearchHint();
        
        // Move focus to next field for better UX
        setTimeout(() => {
            const addItemBtn = document.getElementById('addItemBtn');
            if (addItemBtn) {
                addItemBtn.focus();
            }
        }, 100);
    }
}

// PRODUCT NAME SEARCH FUNCTIONS
export function setupProductNameSearch() {
    const productNameInput = document.getElementById('productName');
    const productNameSearchHint = document.getElementById('product-name-search-hint');
    
    if (!productNameInput || !productNameSearchHint) return;
    
    // Event listeners for product name search
    productNameInput.addEventListener('focus', () => handleProductNameSearchFocus());
    productNameInput.addEventListener('input', (e) => handleProductNameSearch(e));
    productNameInput.addEventListener('keydown', (e) => handleProductNameSearchKeydown(e));
    productNameInput.addEventListener('blur', handleProductNameSearchBlur);
}

function handleProductNameSearchFocus() {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (hintContainer) {
        showProductNameSuggestions(window.products, '', fillProductDetails);
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                const productName = item.getAttribute('data-product-name');
                const productCostPrice = item.getAttribute('data-product-cost-price');
                const productSellingPrice = item.getAttribute('data-product-selling-price');
                const productCategory = item.getAttribute('data-product-category');
                document.getElementById('productName').value = productName;
                document.getElementById('productCostPrice').value = productCostPrice;
                document.getElementById('productSellingPrice').value = productSellingPrice;
                document.getElementById('productCategory').value = productCategory;
                hideProductNameSearchHint();
            });
        });
    }
}

function handleProductNameSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    showProductNameSuggestions(window.products, searchTerm, fillProductDetails);
}

function handleProductNameSearchKeydown(e) {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (!hintContainer || hintContainer.style.display === 'none') {
        return;
    }

    const hintItems = hintContainer.querySelectorAll('.hint-item');
    const visibleHintItems = Array.from(hintItems).filter(item => item.style.display !== 'none');
    
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        
        if (currentSelectedProductNameHintIndex >= 0 && currentSelectedProductNameHintIndex < visibleHintItems.length) {
            // Select the currently highlighted hint
            const item = visibleHintItems[currentSelectedProductNameHintIndex];
            const productName = item.getAttribute('data-product-name');
            const productCostPrice = item.getAttribute('data-product-cost-price');
            const productSellingPrice = item.getAttribute('data-product-selling-price');
            const productCategory = item.getAttribute('data-product-category');
            document.getElementById('productName').value = productName;
            document.getElementById('productCostPrice').value = productCostPrice;
            document.getElementById('productSellingPrice').value = productSellingPrice;
            document.getElementById('productCategory').value = productCategory;
            hideProductNameSearchHint();
        } else {
            // Select the first matching product
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
                fillProductDetails(matchedProduct);
                hideProductNameSearchHint();
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Navigate down through hints
        if (visibleHintItems.length > 0) {
            currentSelectedProductNameHintIndex = (currentSelectedProductNameHintIndex + 1) % visibleHintItems.length;
            updateProductNameHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up through hints
        if (visibleHintItems.length > 0) {
            currentSelectedProductNameHintIndex = (currentSelectedProductNameHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateProductNameHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        hideProductNameSearchHint();
    }
}

function updateProductNameHintSelection(visibleHintItems) {
    // Remove selection from all items
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    // Add selection to current item
    if (currentSelectedProductNameHintIndex >= 0 && currentSelectedProductNameHintIndex < visibleHintItems.length) {
        visibleHintItems[currentSelectedProductNameHintIndex].style.backgroundColor = '#007bff';
        visibleHintItems[currentSelectedProductNameHintIndex].style.color = 'white';
    }
}

function handleProductNameSearchBlur(e) {
    setTimeout(() => {
        hideProductNameSearchHint();
    }, 200);
}

// CATEGORY SEARCH FUNCTIONS
export function setupCategorySearch() {
    const categoryInput = document.getElementById('productCategory');
    const categorySearchHint = document.getElementById('product-category-search-hint');
    
    if (!categoryInput || !categorySearchHint) return;
    
    // Event listeners for category search
    categoryInput.addEventListener('focus', () => handleCategorySearchFocus());
    categoryInput.addEventListener('input', (e) => handleCategorySearch(e));
    categoryInput.addEventListener('keydown', (e) => handleCategorySearchKeydown(e));
    categoryInput.addEventListener('blur', handleCategorySearchBlur);
}

function handleCategorySearchFocus() {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (hintContainer) {
        showCategorySuggestions(window.productCategories, '');
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                const categoryName = item.getAttribute('data-category-name');
                document.getElementById('productCategory').value = categoryName;
                hideCategorySearchHint();
            });
        });
    }
}

function handleCategorySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    showCategorySuggestions(window.productCategories, searchTerm);
}

function handleCategorySearchKeydown(e) {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (!hintContainer || hintContainer.style.display === 'none') {
        return;
    }

    const hintItems = hintContainer.querySelectorAll('.hint-item');
    const visibleHintItems = Array.from(hintItems).filter(item => item.style.display !== 'none');
    
    if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        
        if (currentSelectedCategoryHintIndex >= 0 && currentSelectedCategoryHintIndex < visibleHintItems.length) {
            // Select the currently highlighted hint
            const categoryName = visibleHintItems[currentSelectedCategoryHintIndex].getAttribute('data-category-name');
            document.getElementById('productCategory').value = categoryName;
            hideCategorySearchHint();
        } else {
            // Select the first matching category
            const searchTerm = e.target.value.toLowerCase();
            let matchedCategory = null;

            if (searchTerm === '') {
                matchedCategory = window.productCategories[0];
            } else {
                matchedCategory = window.productCategories.find(c => 
                    c.name.toLowerCase().startsWith(searchTerm)
                );

                if (!matchedCategory) {
                    matchedCategory = window.productCategories.find(c => 
                        c.name.toLowerCase().includes(searchTerm)
                    );
                }
            }

            if (matchedCategory) {
                document.getElementById('productCategory').value = matchedCategory.name;
                hideCategorySearchHint();
            }
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Navigate down through hints
        if (visibleHintItems.length > 0) {
            currentSelectedCategoryHintIndex = (currentSelectedCategoryHintIndex + 1) % visibleHintItems.length;
            updateCategoryHintSelection(visibleHintItems);
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up through hints
        if (visibleHintItems.length > 0) {
            currentSelectedCategoryHintIndex = (currentSelectedCategoryHintIndex - 1 + visibleHintItems.length) % visibleHintItems.length;
            updateCategoryHintSelection(visibleHintItems);
        }
    } else if (e.key === 'Escape') {
        hideCategorySearchHint();
    }
}

function updateCategoryHintSelection(visibleHintItems) {
    // Remove selection from all items
    visibleHintItems.forEach(item => {
        item.style.backgroundColor = '';
        item.style.color = '';
    });
    
    // Add selection to current item
    if (currentSelectedCategoryHintIndex >= 0 && currentSelectedCategoryHintIndex < visibleHintItems.length) {
        visibleHintItems[currentSelectedCategoryHintIndex].style.backgroundColor = '#007bff';
        visibleHintItems[currentSelectedCategoryHintIndex].style.color = 'white';
    }
}

function handleCategorySearchBlur(e) {
    setTimeout(() => {
        hideCategorySearchHint();
    }, 200);
}

// Product edit/delete functions
export function editProduct(productId) {
    const product = window.products.find(p => p.id === productId);
    if (product) {
        // Populate form with product data
        document.getElementById('productName').value = product.name;
        document.getElementById('productCostPrice').value = product.cost_price;
        document.getElementById('productSellingPrice').value = product.selling_price;
        document.getElementById('productCategory').value = product.category || '';

        // Change modal title and button
        document.querySelector('#addProductModal .modal-header h3').textContent = 'Edit Product';
        document.getElementById('saveProductBtn').textContent = 'Update Product';

        // Show modal
        const addProductModal = document.getElementById('addProductModal');
        if (addProductModal) {
            addProductModal.style.display = 'flex';
        }
    }
}

export function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        window.products = window.products.filter(p => p.id !== productId);
        const productList = document.getElementById('productList');
        if (productList && window.loadProducts) {
            window.loadProducts();
        }
        alert('Product deleted successfully!');
    }
}
