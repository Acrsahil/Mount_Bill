// ULTRA SAFE INITIALIZATION
console.log('Bill.js loading...');

// Sample data for invoices (keep this as is for now)
// let invoices = [
//     { id: 1, number: 'INV-001', client: 'Global Tech Inc.', issueDate: '2023-05-15', amount: 2500, status: 'paid' },
//     { id: 2, number: 'INV-002', client: 'Marketing Pro LLC', issueDate: '2023-05-18', amount: 1800, status: 'pending' },
//     { id: 3, number: 'INV-003', client: 'Creative Solutions', issueDate: '2023-05-10', amount: 3200, status: 'overdue' }
// ];

// SAFETY CHECK: Ensure window.djangoData exists
if (typeof window.djangoData === 'undefined') {
    console.error('❌ window.djangoData is undefined! Creating empty data.');
    window.djangoData = {
        products: [],
        product_cat: [],
        clients: [],
        invoices: [],
        csrfToken: ""
    };
}

const invoices = Array.isArray(window.djangoData.invoices) ? window.djangoData.invoices : [];
// Use ACTUAL database products from Django with safety
const products = Array.isArray(window.djangoData.products) ? window.djangoData.products : [];
const productCategories = Array.isArray(window.djangoData.product_cat) ? window.djangoData.product_cat : [];

// Client data with safety
let clients = Array.isArray(window.djangoData.clients) ? window.djangoData.clients : [];
let nextClientId = clients.length > 0 ? Math.max(...clients.map(c => c.id || 0)) + 1 : 1;

let invoiceItems = [];
let nextInvoiceNumber = 4;
let nextProductId = products.length > 0 ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;

// Global discount and tax
let globalDiscount = 0;
let globalTax = 0;

console.log('✅ Data loaded successfully:');
console.log('Products count:', products.length);
console.log('Product Categories count:', productCategories.length);
console.log('Clients count:', clients.length);

// DOM Elements
const createInvoiceBtn = document.getElementById('createInvoiceBtn');
const addProductBtn = document.getElementById('addProductBtn');
const addNewProductBtn = document.getElementById('addNewProductBtn');
const createInvoiceModal = document.getElementById('createInvoiceModal');
const addProductModal = document.getElementById('addProductModal');
const addClientModal = document.getElementById('addClientModal');
const closeInvoiceModal = document.getElementById('closeInvoiceModal');
const closeProductModal = document.getElementById('closeProductModal');
const closeClientModal = document.getElementById('closeClientModal');
const cancelInvoiceBtn = document.getElementById('cancelInvoiceBtn');
const cancelProductBtn = document.getElementById('cancelProductBtn');
const cancelClientBtn = document.getElementById('cancelClientBtn');
const saveInvoiceBtn = document.getElementById('saveInvoiceBtn');
const saveProductBtn = document.getElementById('saveProductBtn');
const saveClientBtn = document.getElementById('saveClientBtn');
const addItemBtn = document.getElementById('addItemBtn');
const invoiceItemsBody = document.getElementById('invoiceItemsBody');
const productList = document.getElementById('productList');
const invoicesTableBody = document.getElementById('invoicesTableBody');
const clientsTableBody = document.getElementById('clientsTableBody');
const searchInput = document.getElementById('searchInput');
const productSearchInput = document.getElementById('productSearchInput');
const clientSearchInput = document.getElementById('clientSearchInput');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');
const subtotalAmount = document.getElementById('subtotalAmount');
const discountAmount = document.getElementById('discountAmount');
const taxAmount = document.getElementById('taxAmount');
const totalAmount = document.getElementById('totalAmount');
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');
const addClientBtn = document.getElementById('addClientBtn');

// Global discount and tax input elements
const globalDiscountInput = document.getElementById('globalDiscount');
const globalTaxInput = document.getElementById('globalTax');

// Track currently selected hint for keyboard navigation
let currentSelectedHintIndex = -1;
let currentSelectedProductHintIndex = -1;
let currentSelectedProductNameHintIndex = -1;
let currentSelectedCategoryHintIndex = -1;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    if (invoiceDate) invoiceDate.value = today;

    // Load initial data
    loadInvoices();
    loadProducts();
    loadClients();

    // Set up event listeners
    setupEventListeners();

    // Setup client search functionality
    setupClientSearch();

    // Setup product name search functionality
    setupProductNameSearch();

    // Setup category search functionality
    setupCategorySearch();

    // Debug: Check if products loaded correctly
    console.log('Database products loaded:', products);
    console.log('Product categories loaded:', productCategories);
    console.log('Clients loaded:', clients);
});

// PRODUCT NAME SEARCH AND AUTO-COMPLETE FUNCTIONS (FOR ADD PRODUCT MODAL)
function setupProductNameSearch() {
    const productNameInput = document.getElementById('productName');
    const productNameSearchHint = document.getElementById('product-name-search-hint');
    
    if (!productNameInput || !productNameSearchHint) return;
    
    // Event listeners for product name search
    productNameInput.addEventListener('focus', handleProductNameSearchFocus);
    productNameInput.addEventListener('input', handleProductNameSearch);
    productNameInput.addEventListener('keydown', handleProductNameSearchKeydown);
    productNameInput.addEventListener('blur', handleProductNameSearchBlur);
}

function handleProductNameSearchFocus(e) {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (hintContainer) {
        showProductNameSuggestions();
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectProductNameFromHint(this);
            });
        });
    }
}

function handleProductNameSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    showProductNameSuggestions(searchTerm);
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
            selectProductNameFromHint(visibleHintItems[currentSelectedProductNameHintIndex]);
        } else {
            // Select the first matching product
            const searchTerm = e.target.value.toLowerCase();
            let matchedProduct = null;

            if (searchTerm === '') {
                matchedProduct = products[0];
            } else {
                matchedProduct = products.find(p => 
                    p.name.toLowerCase().startsWith(searchTerm)
                );

                if (!matchedProduct) {
                    matchedProduct = products.find(p => 
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

function showProductNameSuggestions(searchTerm = '') {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (!hintContainer) return;
    
    const filteredProducts = searchTerm 
        ? products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
          )
        : products;
    
    if (filteredProducts.length > 0) {
        hintContainer.innerHTML = filteredProducts.map(product => `
            <div class="hint-item" data-product-name="${product.name}" 
                 data-product-price="${product.price}" 
                 data-product-category="${product.category || ''}">
                ${product.name} - $${product.price} ${product.category ? `(${product.category})` : ''}
            </div>
        `).join('');
        hintContainer.style.display = 'block';
        
        // Reset selection
        currentSelectedProductNameHintIndex = -1;
        
        // Reattach click events
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectProductNameFromHint(this);
            });
        });
    } else {
        hintContainer.style.display = 'none';
    }
}

function selectProductNameFromHint(hintElement) {
    const productName = hintElement.getAttribute('data-product-name');
    const productPrice = hintElement.getAttribute('data-product-price');
    const productCategory = hintElement.getAttribute('data-product-category');

    // Fill the form with product details
    document.getElementById('productName').value = productName;
    document.getElementById('productPrice').value = productPrice;
    document.getElementById('productCategory').value = productCategory;

    hideProductNameSearchHint();
    
    // Move focus to price field for quick editing
    setTimeout(() => {
        const priceInput = document.getElementById('productPrice');
        if (priceInput) {
            priceInput.focus();
            priceInput.select();
        }
    }, 50);
}

function fillProductDetails(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productCategory').value = product.category || '';
}

function hideProductNameSearchHint() {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedProductNameHintIndex = -1;
    }
}

// CATEGORY SEARCH AND AUTO-COMPLETE FUNCTIONS (FOR ADD PRODUCT MODAL)
function setupCategorySearch() {
    const categoryInput = document.getElementById('productCategory');
    const categorySearchHint = document.getElementById('product-category-search-hint');
    
    if (!categoryInput || !categorySearchHint) return;
    
    // Event listeners for category search
    categoryInput.addEventListener('focus', handleCategorySearchFocus);
    categoryInput.addEventListener('input', handleCategorySearch);
    categoryInput.addEventListener('keydown', handleCategorySearchKeydown);
    categoryInput.addEventListener('blur', handleCategorySearchBlur);
}

function handleCategorySearchFocus(e) {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (hintContainer) {
        showCategorySuggestions();
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectCategoryFromHint(this);
            });
        });
    }
}

function handleCategorySearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    showCategorySuggestions(searchTerm);
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
            selectCategoryFromHint(visibleHintItems[currentSelectedCategoryHintIndex]);
        } else {
            // Select the first matching category
            const searchTerm = e.target.value.toLowerCase();
            let matchedCategory = null;

            if (searchTerm === '') {
                matchedCategory = productCategories[0];
            } else {
                matchedCategory = productCategories.find(c => 
                    c.name.toLowerCase().startsWith(searchTerm)
                );

                if (!matchedCategory) {
                    matchedCategory = productCategories.find(c => 
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

function showCategorySuggestions(searchTerm = '') {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (!hintContainer) return;
    
    const filteredCategories = searchTerm 
        ? productCategories.filter(category => 
            category.name.toLowerCase().includes(searchTerm)
          )
        : productCategories;
    
    if (filteredCategories.length > 0) {
        hintContainer.innerHTML = filteredCategories.map(category => `
            <div class="hint-item" data-category-name="${category.name}">
                ${category.name}
            </div>
        `).join('');
        hintContainer.style.display = 'block';
        
        // Reset selection
        currentSelectedCategoryHintIndex = -1;
        
        // Reattach click events
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectCategoryFromHint(this);
            });
        });
    } else {
        hintContainer.style.display = 'none';
    }
}

function selectCategoryFromHint(hintElement) {
    const categoryName = hintElement.getAttribute('data-category-name');
    document.getElementById('productCategory').value = categoryName;
    hideCategorySearchHint();
}

function hideCategorySearchHint() {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedCategoryHintIndex = -1;
    }
}

// CLIENT SEARCH AND AUTO-COMPLETE FUNCTIONS
function setupClientSearch() {
    const clientNameInput = document.getElementById('clientName');
    const clientSearchHint = document.getElementById('client-search-hint');
    
    if (!clientNameInput || !clientSearchHint) return;
    
    // Event listeners for client search
    clientNameInput.addEventListener('focus', handleClientSearchFocus);
    clientNameInput.addEventListener('input', handleClientSearch);
    clientNameInput.addEventListener('keydown', handleClientSearchKeydown);
    clientNameInput.addEventListener('blur', handleClientSearchBlur);
}

function handleClientSearchFocus(e) {
    const hintContainer = document.getElementById('client-search-hint');
    if (hintContainer) {
        showClientSuggestions();
        
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
    showClientSuggestions(searchTerm);
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
                matchedClient = clients[0];
            } else {
                matchedClient = clients.find(c => 
                    c.name.toLowerCase().startsWith(searchTerm)
                );
                
                if (!matchedClient) {
                    matchedClient = clients.find(c => 
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

function showClientSuggestions(searchTerm = '') {
    const hintContainer = document.getElementById('client-search-hint');
    if (!hintContainer) return;
    
    const filteredClients = searchTerm 
        ? clients.filter(client => 
            client.name.toLowerCase().includes(searchTerm) ||
            (client.email && client.email.toLowerCase().includes(searchTerm))
          )
        : clients;
    
    if (filteredClients.length > 0) {
        hintContainer.innerHTML = filteredClients.map(client => `
            <div class="hint-item" data-client-id="${client.id}" 
                 data-client-name="${client.name}" 
                 data-client-email="${client.email || ''}" 
                 data-client-address="${client.address || ''}">
                ${client.name} - ${client.email || 'No email'}
            </div>
        `).join('');
        hintContainer.style.display = 'block';
        
        // Reset selection
        currentSelectedHintIndex = -1;
        
        // Reattach click events
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectClientFromHint(this);
            });
        });
    } else {
        hintContainer.style.display = 'none';
    }
}

function selectClientFromHint(hintElement) {
    const clientId = hintElement.getAttribute('data-client-id');
    const clientName = hintElement.getAttribute('data-client-name');
    const clientEmail = hintElement.getAttribute('data-client-email');
    const clientAddress = hintElement.getAttribute('data-client-address');
    
    const client = clients.find(c => c.id === parseInt(clientId));
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

function fillClientDetails(client) {
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientId').value = `CLI-${client.id.toString().padStart(3, '0')}`;
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientAddress').value = client.address || '';
}

function hideClientSearchHint() {
    const hintContainer = document.getElementById('client-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedHintIndex = -1;
    }
}

// Clear client details when modal opens
function clearClientDetails() {
    document.getElementById('clientName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
}

// Set up event listeners
function setupEventListeners() {
    if (createInvoiceBtn) 
        createInvoiceBtn.addEventListener('click', () =>{
            window.location.href="{%url 'save_invoice'%}";
}
);
    if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);
    if (addNewProductBtn) addNewProductBtn.addEventListener('click', openAddProductModal);
    if (addClientBtn) addClientBtn.addEventListener('click', openClientModal);
    if (closeInvoiceModal) closeInvoiceModal.addEventListener('click', closeInvoiceModalFunc);
    if (closeProductModal) closeProductModal.addEventListener('click', closeProductModalFunc);
    if (closeClientModal) closeClientModal.addEventListener('click', closeClientModalFunc);
    if (cancelInvoiceBtn) cancelInvoiceBtn.addEventListener('click', closeInvoiceModalFunc);
    if (cancelProductBtn) cancelProductBtn.addEventListener('click', closeProductModalFunc);
    if (cancelClientBtn) cancelClientBtn.addEventListener('click', closeClientModalFunc);
    if (saveInvoiceBtn) saveInvoiceBtn.addEventListener('click', saveInvoice);
    if (saveProductBtn) saveProductBtn.addEventListener('click', saveProduct);
    if (saveClientBtn) saveClientBtn.addEventListener('click', saveClient);
    if (addItemBtn) addItemBtn.addEventListener('click', addInvoiceItem);
    if (searchInput) searchInput.addEventListener('input', filterInvoices);
    if (productSearchInput) productSearchInput.addEventListener('input', filterProducts);
    if (clientSearchInput) clientSearchInput.addEventListener('input', filterClients);

    // Global discount and tax listeners
    if (globalDiscountInput) {
        globalDiscountInput.addEventListener('input', function(e) {
            globalDiscount = Number(e.target.value) || 0;
            updateTotals();
        });
    }

    if (globalTaxInput) {
        globalTaxInput.addEventListener('input', function(e) {
            globalTax = Number(e.target.value) || 0;
            updateTotals();
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

// CLIENT MANAGEMENT FUNCTIONS - SIMPLIFIED
function openClientModal() {
    console.log('Opening client modal');
    
    if (!addClientModal) {
        console.error('Client modal not found!');
        return;
    }
    
    // Reset only the fields that exist in the simplified modal
    document.getElementById('clientNameInput').value = '';
    document.getElementById('clientEmailInput').value = '';
    document.getElementById('clientPhoneInput').value = '';
    document.getElementById('clientAddressInput').value = '';
    
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

function closeClientModalFunc() {
    if (addClientModal) {
        addClientModal.style.display = 'none';
    }
}

function saveClient() {
    // Only get fields that exist in the simplified modal
    const clientName = document.getElementById('clientNameInput').value;
    const clientEmail = document.getElementById('clientEmailInput').value;
    const clientPhone = document.getElementById('clientPhoneInput').value;
    const clientAddress = document.getElementById('clientAddressInput').value;

    if (!clientName || !clientEmail || !clientPhone || !clientAddress) {
        alert('Please fill in all required fields (Name, Email, Phone, Address)');
        return;
    }

    // Create new client with only existing fields
    const newClient = {
        id: nextClientId,
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address: clientAddress,
        totalInvoices: 0,
        totalSpent: 0
    };

    // Add to clients array
    clients.push(newClient);
    nextClientId++;

    // Update UI
    loadClients();
    updateClientStats();

    // Close modal
    closeClientModalFunc();

    alert('Client added successfully!');
}

function loadClients() {
    if (!clientsTableBody) return;

    clientsTableBody.innerHTML = '';

    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>CLI-${client.id.toString().padStart(3, '0')}</td>
            <td>${client.name}</td>
            <td>${client.email}</td>
            <td>${client.address}</td>
            <td>${client.phone || 'N/A'}</td>
            <td>${client.totalInvoices || 0}</td>
            <td>$${(client.totalSpent || 0).toFixed(2)}</td>
            <td class="action-cell">
                <div class="action-btn action-view">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="action-btn action-edit">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="action-btn action-delete">
                    <i class="fas fa-trash"></i>
                </div>
            </td>
        `;
        clientsTableBody.appendChild(row);
    });
}

function filterClients() {
    const searchTerm = clientSearchInput.value.toLowerCase();
    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm) ||
        (client.phone && client.phone.toLowerCase().includes(searchTerm))
    );

    if (!clientsTableBody) return;

    clientsTableBody.innerHTML = '';

    filteredClients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>CLI-${client.id.toString().padStart(3, '0')}</td>
            <td>${client.name}</td>
            <td>${client.email}</td>
            <td>${client.address}</td>
            <td>${client.phone || 'N/A'}</td>
            <td>${client.totalInvoices || 0}</td>
            <td>$${(client.totalSpent || 0).toFixed(2)}</td>
            <td class="action-cell">
                <div class="action-btn action-view">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="action-btn action-edit">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="action-btn action-delete">
                    <i class="fas fa-trash"></i>
                </div>
            </td>
        `;
        clientsTableBody.appendChild(row);
    });
}

function updateClientStats() {
    const totalClients = clients.length;
    const activeClients = clients.length;
    const clientInvoices = clients.reduce((sum, client) => sum + (client.totalInvoices || 0), 0);
    const clientRevenue = clients.reduce((sum, client) => sum + (client.totalSpent || 0), 0);

    document.getElementById('totalClients').textContent = totalClients;
    document.getElementById('activeClients').textContent = activeClients;
    document.getElementById('clientInvoices').textContent = clientInvoices;
    document.getElementById('clientRevenue').textContent = `$${clientRevenue.toFixed(2)}`;
}

// EXISTING FUNCTIONS
function openCreateInvoiceModal() {
    // Generate next invoice number
    invoiceNumber.value = `INV-${nextInvoiceNumber.toString().padStart(3, '0')}`;

    // Reset form
    clearClientDetails();

    // Clear invoice items
    invoiceItems = [];
    invoiceItemsBody.innerHTML = '';

    // Reset global discount and tax
    globalDiscount = 0;
    globalTax = 0;

    // Reset discount and tax inputs
    if (globalDiscountInput) globalDiscountInput.value = '0';
    if (globalTaxInput) globalTaxInput.value = '0';

    // Reset totals
    updateTotals();

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

function closeInvoiceModalFunc() {
    createInvoiceModal.style.display = 'none';
    hideSearchHints();
}

function openAddProductModal() {
    // Reset form
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
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

function closeProductModalFunc() {
    addProductModal.style.display = 'none';
    hideSearchHints();
}

function addInvoiceItem() {
    const itemId = invoiceItems.length + 1;

    const newItem = {
        id: itemId,
        productId: '',
        productName: '',
        description: '',
        quantity: 1,
        price: 0
    };

    invoiceItems.push(newItem);
    renderInvoiceItems();
    updateTotals();

    // AGGRESSIVE SCROLL TO BOTTOM
    setTimeout(() => {
        // Try multiple scrolling methods
        const scrollTargets = [
            document.querySelector('.modal-content'),
            document.querySelector('.modal-body'),
            document.querySelector('.invoice-items-table'),
            document.querySelector('.fixed-add-item-container')
        ];

        scrollTargets.forEach(target => {
            if (target) {
                try {
                    target.scrollIntoView({ behavior: 'smooth', block: 'end' });
                } catch (e) {
                    console.log('Scroll failed for:', target);
                }
            }
        });

        // Force scroll to very bottom of page
        setTimeout(() => {
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);

        // Focus on the new input
        const newSearchInput = document.querySelector(`.product-search-input[data-id="${itemId}"]`);
        if (newSearchInput) {
            setTimeout(() => {
                newSearchInput.focus();
                newSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 5);
        }
    }, 5);
}

// RENDER INVOICE ITEMS
function renderInvoiceItems() {
    invoiceItemsBody.innerHTML = '';

    invoiceItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
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
<td><input type="text" class="item-description" data-id="${item.id}" value="${item.description}" style="width: 100%;"></td>
<td><input type="number" class="item-quantity" data-id="${item.id}" value="${item.quantity}" min="1" style="width: 100%;"></td>
<td><input type="number" class="item-price" data-id="${item.id}" value="${item.price}" min="0" step="0.01" style="width: 100%;"></td>
<td class="item-total">$${(item.quantity * item.price).toFixed(2)}</td>
<td><button class="remove-item-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button></td>
`;
        invoiceItemsBody.appendChild(row);
    });

    // Add event listeners to the new inputs
    document.querySelectorAll('.product-search-input').forEach(input => {
        input.addEventListener('focus', handleProductSearchFocus);
        input.addEventListener('input', handleProductSearch);
        input.addEventListener('keydown', handleProductSearchKeydown);
        input.addEventListener('blur', handleProductSearchBlur);
    });

    document.querySelectorAll('.item-quantity, .item-price').forEach(input => {
        input.addEventListener('input', handleItemUpdate);
    });

    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
}

// Show all products as hints when input is focused
function handleProductSearchFocus(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const hintContainer = document.getElementById(`search-hint-${itemId}`);

    if (hintContainer) {
        showProductSuggestions(itemId);
        
        // Add click event to hints
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectProductFromHint(itemId, this);
            });
        });
    }
}

// Handle product search input
function handleProductSearch(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const searchTerm = e.target.value.toLowerCase();
    showProductSuggestions(itemId, searchTerm);
}

// Handle keyboard events for product search
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
                matchedProduct = products[0];
            } else {
                matchedProduct = products.find(p => 
                    p.name.toLowerCase().startsWith(searchTerm)
                );

                if (!matchedProduct) {
                    matchedProduct = products.find(p => 
                        p.name.toLowerCase().includes(searchTerm)
                    );
                }
            }

            if (matchedProduct) {
                const searchInput = document.querySelector(`.product-search-input[data-id="${itemId}"]`);
                if (searchInput) {
                    searchInput.value = matchedProduct.name;

                    const item = invoiceItems.find(i => i.id === itemId);
                    if (item) {
                        item.productId = matchedProduct.id;
                        item.productName = matchedProduct.name;
                        item.description = matchedProduct.category || 'Product';
                        item.price = Number(matchedProduct.price);

                        const row = searchInput.closest('tr');
                        if (row) {
                            const descriptionInput = row.querySelector('.item-description');
                            const priceInput = row.querySelector('.item-price');

                            if (descriptionInput) descriptionInput.value = matchedProduct.category || 'Product';
                            if (priceInput) priceInput.value = matchedProduct.price;
                        }

                        updateItemTotal(itemId);
                        updateTotals();

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

// Hide hints when input loses focus
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

// Show product suggestions
function showProductSuggestions(itemId, searchTerm = '') {
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    if (!hintContainer) return;
    
    const filteredProducts = searchTerm 
        ? products.filter(product => 
            product.name.toLowerCase().includes(searchTerm) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
          )
        : products;
    
    if (filteredProducts.length > 0) {
        hintContainer.innerHTML = filteredProducts.map(product => `
            <div class="hint-item" data-product-id="${product.id}" 
                 data-product-name="${product.name}" 
                 data-product-price="${product.price}" 
                 data-product-category="${product.category || ''}">
                ${product.name} - $${product.price} ${product.category ? `(${product.category})` : ''}
            </div>
        `).join('');
        hintContainer.style.display = 'block';
        
        // Reset selection
        currentSelectedProductHintIndex = -1;
        
        // Reattach click events
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                selectProductFromHint(itemId, this);
            });
        });
    } else {
        hintContainer.style.display = 'none';
    }
}

// Select product from hint
function selectProductFromHint(itemId, hintElement) {
    const productId = hintElement.getAttribute('data-product-id');
    const productName = hintElement.getAttribute('data-product-name');
    const price = hintElement.getAttribute('data-product-price');
    const category = hintElement.getAttribute('data-product-category');

    const product = products.find(p => p.id === parseInt(productId));
    if (!product) return;

    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    // Update the item with product details
    item.productId = product.id;
    item.productName = product.name;
    item.description = product.category || 'Product';
    item.price = Number(product.price);

    // Update the row inputs
    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`).closest('tr');
    if (!row) return;

    const searchInput = row.querySelector('.product-search-input');
    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');

    if (searchInput) searchInput.value = product.name;
    if (descriptionInput) descriptionInput.value = product.category || 'Product';
    if (priceInput) priceInput.value = product.price;

    // Hide hints
    const hintContainer = document.getElementById(`search-hint-${itemId}`);
    if (hintContainer) {
        hintContainer.style.display = 'none';
        currentSelectedProductHintIndex = -1;
    }

    // Update calculations
    updateItemTotal(itemId);
    updateTotals();

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
function handleItemUpdate(e) {
    const itemId = parseInt(e.target.getAttribute('data-id'));
    const field = e.target.className;
    const value = e.target.value;

    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    if (field === 'item-quantity') {
        item.quantity = Number(value) || 1;
    } else if (field === 'item-price') {
        item.price = Number(value) || 0;
    }

    updateItemTotal(itemId);
    updateTotals();
}

// Update item total
function updateItemTotal(itemId) {
    const item = invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    const quantity = Number(item.quantity) || 0;
    const price = Number(item.price) || 0;
    const total = quantity * price;

    const row = document.querySelector(`.product-search-input[data-id="${itemId}"]`)?.closest('tr');
    if (!row) return;

    const itemTotalCell = row.querySelector('.item-total');
    if (!itemTotalCell) return;

    itemTotalCell.textContent = `$${total.toFixed(2)}`;
}

function handleRemoveItem(e) {
    const itemId = parseInt(e.target.closest('button').getAttribute('data-id'));
    invoiceItems = invoiceItems.filter(i => i.id !== itemId);
    renderInvoiceItems();
    updateTotals();
}

// Update totals
function updateTotals() {
    let subtotal = 0;

    // Calculate subtotal from all items
    invoiceItems.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const itemTotal = quantity * price;
        subtotal += itemTotal;
    });

    // Calculate discount amount (percentage of subtotal)
    const discountValue = (subtotal * globalDiscount) / 100;

    // Calculate taxable amount (after discount)
    const taxableAmount = subtotal - discountValue;

    // Calculate tax amount (percentage of taxable amount)
    const taxValue = (taxableAmount * globalTax) / 100;

    // Calculate final total
    const total = taxableAmount + taxValue;

    // Update display
    if (subtotalAmount) subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    if (discountAmount) discountAmount.textContent = `$${discountValue.toFixed(2)}`;
    if (taxAmount) taxAmount.textContent = `$${taxValue.toFixed(2)}`;
    if (totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
}

// LOAD PRODUCTS
function loadProducts() {
    if (!productList) return;

    productList.innerHTML = '';

    // Check if we have products from database
    if (products.length === 0) {
        productList.innerHTML = '<p>No products found in database.</p>';
        return;
    }

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
<h4>${product.name}</h4>
<p>Category: ${product.category || 'N/A'}</p>
<div class="product-price">$${product.price}</div>
<div class="product-actions">
    <button class="btn btn-primary edit-product-btn" data-id="${product.id}">
        <i class="fas fa-edit"></i> Edit
    </button>
    <button class="btn btn-danger delete-product-btn" data-id="${product.id}">
        <i class="fas fa-trash"></i> Delete
    </button>
</div>
`;
        productList.appendChild(productCard);
    });

    // Add event listeners to product buttons
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            editProduct(productId);
        });
    });

    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            deleteProduct(productId);
        });
    });
}

// Save complete invoice to database
async function saveInvoice() {
    console.log('🔍 saveInvoice function called');
    
    const clientName = document.getElementById('clientName').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    const globalDiscount = parseFloat(document.getElementById('globalDiscount').value) || 0;
    const globalTax = parseFloat(document.getElementById('globalTax').value) || 0;

    console.log('📋 Form data:', { 
        clientName, 
        invoiceDate, 
        globalDiscount, 
        globalTax,
        itemsCount: invoiceItems.length,
        items: invoiceItems
    });

    // Validation
    if (!clientName) {
        showAlert('Please enter client name', 'error');
        document.getElementById('clientName').focus();
        return;
    }

    if (invoiceItems.length === 0) {
        showAlert('Please add at least one item to the invoice', 'error');
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveInvoiceBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Invoice...';
    saveBtn.disabled = true;

    try {
        // Prepare data for sending
        const invoiceData = {
            clientName: clientName,
            invoiceDate: invoiceDate,
            items: invoiceItems.map(item => ({
                productName: item.productName || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.price || 0
            })),
            globalDiscount: globalDiscount,
            globalTax: globalTax
        };

        console.log('📦 Prepared invoice data for sending:', invoiceData);
        console.log('🔑 CSRF Token available:', !!window.djangoData.csrfToken);

        // Test URL - try different variations
        const url = '/bill/save-invoice/';
        console.log('🌐 Attempting to fetch from:', url);

        // Make the request with detailed error handling
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(invoiceData)
        });

        console.log('✅ Fetch completed, status:', response.status, response.statusText);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        const result = await response.json();
        console.log('📨 Response JSON:', result);

        if (result.success) {
            console.log('🎉 Invoice saved successfully');
            
            // Show success message
            showAlert(result.message, 'success');
            
            // Update the invoices list
            if (result.invoice) {
                const newInvoice = {
                    id: result.invoice.id,
                    number: result.invoice.number,
                    client: result.invoice.client,
                    issueDate: result.invoice.date,
                    amount: result.invoice.total_amount,
                    status: 'pending'
                };
                
                invoices.unshift(newInvoice);
                loadInvoices();
            }
            
            // Close modal after short delay
            setTimeout(() => {
                closeInvoiceModalFunc();
                
                // Reset form
                document.getElementById('clientName').value = '';
                document.getElementById('clientId').value = '';
                document.getElementById('clientEmail').value = '';
                document.getElementById('clientAddress').value = '';
                
                // Clear invoice items
                invoiceItems = [];
                renderInvoiceItems();
                updateTotals();
                
            }, 2000);
            
        } else {
            console.log('❌ Server returned error:', result.error);
            showAlert('Error: ' + (result.error || 'Failed to save invoice'), 'error');
        }

    } catch (error) {
        console.error('💥 Detailed error information:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // More specific error messages
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showAlert('Network error: Cannot connect to server. Make sure the server is running and the URL is correct.', 'error');
        } else if (error.message.includes('404')) {
            showAlert('Error 404: URL not found. Please check if the save-invoice URL is configured correctly.', 'error');
        } else if (error.message.includes('403')) {
            showAlert('Error 403: Permission denied. Check CSRF token.', 'error');
        } else if (error.message.includes('500')) {
            showAlert('Server error: There was a problem on the server side.', 'error');
        } else {
            showAlert('Error: ' + error.message, 'error');
        }
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}
// Save product - SIMPLIFIED
// Save product to database via AJAX
async function saveProduct() {
    const productName = document.getElementById('productName').value.trim();
    const productCostPrice = document.getElementById('productCostPrice').value;
    const productSellingPrice = document.getElementById('productSellingPrice').value;
    const productCategory = document.getElementById('productCategory').value.trim();

    // Client-side validation
    if (!productName) {
        showAlert('Please enter product name', 'error');
        document.getElementById('productName').focus();
        return;
    }

    if (!productPrice || parseFloat(productPrice) <= 0 || isNaN(productPrice)) {
        showAlert('Please enter a valid price', 'error');
        document.getElementById('productPrice').focus();
        return;
    }

    // Show loading state
    const saveBtn = document.getElementById('saveProductBtn');
    const originalText = saveBtn.innerHTML;
    
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        // Prepare data for sending
        const productData = {
            name: productName,
            cost_price: parseFloat(productCostPrice),      // Changed from 'price'
            selling_price: parseFloat(productSellingPrice), // New field
            category: productCategory
        };
        console.log('Saving product:', productData);
        console.log('Sending this data:', productData);

        // Send AJAX request to Django
        const response = await fetch('/bill/save-product/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            // Add the new product to the local products array
            products.push(result.product);

            // Update the global nextProductId
            nextProductId = Math.max(nextProductId, result.product.id + 1);

            // Update UI
            loadProducts();

            // Show success message
            showAlert(result.message, 'success');

            // Close modal after short delay
            setTimeout(() => {
                closeProductModalFunc();

                // Reset form
                document.getElementById('productName').value = '';
                document.getElementById('productPrice').value = '';
                document.getElementById('productCategory').value = '';
            }, 1500);

        } else {
            showAlert('Error: ' + (result.error || 'Failed to save product'), 'error');
        }

    } catch (error) {
        console.error('Error saving product:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

// Helper function to show alerts
function showAlert(message, type = 'info') {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.custom-alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert element
    const alert = document.createElement('div');
    alert.className = `custom-alert alert-${type}`;
    alert.innerHTML = `
<div class="alert-content">
    <span class="alert-message">${message}</span>
    <button class="alert-close" onclick="this.parentElement.parentElement.remove()">
        <i class="fas fa-times"></i>
    </button>
</div>
`;

    // Add styles
    alert.style.cssText = `
position: fixed;
top: 20px;
right: 20px;
z-index: 10000;
min-width: 300px;
max-width: 500px;
background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
border-radius: 5px;
padding: 15px;
box-shadow: 0 4px 6px rgba(0,0,0,0.1);
color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
`;

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}
// EDIT PRODUCT - SIMPLIFIED
function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        // Populate form with product data
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category || '';

        // Change modal title and button
        document.querySelector('#addProductModal .modal-header h3').textContent = 'Edit Product';
        document.getElementById('saveProductBtn').textContent = 'Update Product';

        // Update save button to handle update
        document.getElementById('saveProductBtn').onclick = function() {
            updateProduct(productId);
        };

        // Show modal
        addProductModal.style.display = 'flex';
    }
}

// UPDATE PRODUCT - SIMPLIFIED
function updateProduct(productId) {
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex !== -1) {
        const productName = document.getElementById('productName').value;
        const productPrice = parseFloat(document.getElementById('productPrice').value);
        const productCategory = document.getElementById('productCategory').value;

        if (!productName) {
            alert('Please enter product name');
            return;
        }

        if (!productPrice || productPrice <= 0) {
            alert('Please enter a valid price');
            return;
        }

        // Update product
        products[productIndex] = {
            id: productId,
            name: productName,
            price: productPrice,
            category: productCategory
        };

        // Update UI
        loadProducts();

        // Close modal
        closeProductModalFunc();

        alert('Product updated successfully!');

        // Reset modal for future use
        document.querySelector('#addProductModal .modal-header h3').textContent = 'Add New Product';
        document.getElementById('saveProductBtn').textContent = 'Save Product';
        document.getElementById('saveProductBtn').onclick = saveProduct;
    }
}

// DELETE PRODUCT
function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        products = products.filter(p => p.id !== productId);
        loadProducts();
        alert('Product deleted successfully!');
    }
}

// Load invoices
function loadInvoices() {
    if (!invoicesTableBody) return;

    invoicesTableBody.innerHTML = '';

    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
<td>${invoice.number}</td>
<td>${invoice.client}</td>
<td>${formatDate(invoice.issueDate)}</td>
<td>$${invoice.amount.toFixed(2)}</td>
<td><span class="status status-${invoice.status}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></td>
<td class="action-cell">
    <div class="action-btn action-view">
        <i class="fas fa-eye"></i>
    </div>
    <div class="action-btn action-edit">
        <i class="fas fa-edit"></i>
    </div>
    <div class="action-btn action-delete">
        <i class="fas fa-trash"></i>
    </div>
</td>
`;
        invoicesTableBody.appendChild(row);
    });
}

// Filter invoices
function filterInvoices() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredInvoices = invoices.filter(invoice => 
        invoice.number.toLowerCase().includes(searchTerm) ||
            invoice.client.toLowerCase().includes(searchTerm)
    );

    invoicesTableBody.innerHTML = '';

    filteredInvoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
<td>${invoice.number}</td>
<td>${invoice.client}</td>
<td>${formatDate(invoice.issueDate)}</td>
<td>$${invoice.amount.toFixed(2)}</td>
<td><span class="status status-${invoice.status}">${invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}</span></td>
<td class="action-cell">
    <div class="action-btn action-view">
        <i class="fas fa-eye"></i>
    </div>
    <div class="action-btn action-edit">
        <i class="fas fa-edit"></i>
    </div>
    <div class="action-btn action-delete">
        <i class="fas fa-trash"></i>
    </div>
</td>
`;
        invoicesTableBody.appendChild(row);
    });
}

// FILTER PRODUCTS
function filterProducts() {
    const searchTerm = productSearchInput.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
    );

    productList.innerHTML = '';

    filteredProducts.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
<h4>${product.name}</h4>
<p>Category: ${product.category || 'N/A'}</p>
<div class="product-price">$${product.price}</div>
<div class="product-actions">
    <button class="btn btn-primary edit-product-btn" data-id="${product.id}">
        <i class="fas fa-edit"></i> Edit
    </button>
    <button class="btn btn-danger delete-product-btn" data-id="${product.id}">
        <i class="fas fa-trash"></i> Delete
    </button>
</div>
`;
        productList.appendChild(productCard);
    });

    // Reattach event listeners
    document.querySelectorAll('.edit-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            editProduct(productId);
        });
    });

    document.querySelectorAll('.delete-product-btn').forEach(button => {
        button.addEventListener('click', function() {
            const productId = parseInt(this.getAttribute('data-id'));
            deleteProduct(productId);
        });
    });
}

// Hide all search hints
function hideSearchHints() {
    document.querySelectorAll('.search-hint').forEach(container => {
        container.style.display = 'none';
    });
    currentSelectedHintIndex = -1;
    currentSelectedProductHintIndex = -1;
    currentSelectedProductNameHintIndex = -1;
    currentSelectedCategoryHintIndex = -1;
}

// Update stats
function updateStats() {
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(i => i.status === 'paid');
    const pendingInvoices = invoices.filter(i => i.status === 'pending');
    const overdueInvoices = invoices.filter(i => i.status === 'overdue');

    const paidAmount = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    document.getElementById('totalInvoices').textContent = totalInvoices;
    document.getElementById('paidAmount').textContent = `$${paidAmount.toFixed(2)}`;
    document.getElementById('pendingAmount').textContent = `$${pendingAmount.toFixed(2)}`;
    document.getElementById('overdueAmount').textContent = `$${overdueAmount.toFixed(2)}`;
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Initialize stats
updateStats();
updateClientStats();
