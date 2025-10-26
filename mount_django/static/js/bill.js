// ULTRA SAFE INITIALIZATION
console.log('Bill.js loading...');

// Sample data for invoices (keep this as is for now)
let invoices = [
    { id: 1, number: 'INV-001', client: 'Global Tech Inc.', issueDate: '2023-05-15', amount: 2500, status: 'paid' },
    { id: 2, number: 'INV-002', client: 'Marketing Pro LLC', issueDate: '2023-05-18', amount: 1800, status: 'pending' },
    { id: 3, number: 'INV-003', client: 'Creative Solutions', issueDate: '2023-05-10', amount: 3200, status: 'overdue' }
];

// SAFETY CHECK: Ensure window.djangoData exists
if (typeof window.djangoData === 'undefined') {
    console.error('❌ window.djangoData is undefined! Creating empty data.');
    window.djangoData = {
        products: [],
        clients: [],
        csrfToken: ""
    };
}

// Use ACTUAL database products from Django with safety
const products = Array.isArray(window.djangoData.products) ? window.djangoData.products : [];

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

    // Debug: Check if products loaded correctly
    console.log('Database products loaded:', products);
    console.log('Clients loaded:', clients);
});

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
    if (createInvoiceBtn) createInvoiceBtn.addEventListener('click', openCreateInvoiceModal);
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
    // Reset form - only fields that exist
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productCategory').value = '';

    // Show modal
    addProductModal.style.display = 'flex';
}

function closeProductModalFunc() {
    addProductModal.style.display = 'none';
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
    <div class="search-hint" id="search-hint-${item.id}" style="display: none; position: absolute; background: white; border: 1px solid #ddd; max-height: 150px; overflow-y: auto; z-index: 1000; width: 100%;">
        ${products.map(p => `
        <div class="hint-item" data-product-id="${p.id}" data-product-name="${p.name}" data-price="${p.price}" data-category="${p.category || ''}">
            ${p.name} - $${p.price}
        </div>
        `).join('')}
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
        hintContainer.style.display = 'block';

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
    const hintContainer = document.getElementById(`search-hint-${itemId}`);

    if (!hintContainer) return;

    // Filter hints based on search
    const hintItems = hintContainer.querySelectorAll('.hint-item');

    hintItems.forEach(item => {
        const productName = item.getAttribute('data-product-name').toLowerCase();
        if (productName.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Handle keyboard events for tab completion
function handleProductSearchKeydown(e) {
    if (e.key === 'Tab') {
        e.preventDefault();

        const itemId = parseInt(e.target.getAttribute('data-id'));
        const searchTerm = e.target.value.toLowerCase();

        // Find matching product from DATABASE products
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
    } else if (e.key === 'Escape') {
        const itemId = parseInt(e.target.getAttribute('data-id'));
        const hintContainer = document.getElementById(`search-hint-${itemId}`);
        if (hintContainer) {
            hintContainer.style.display = 'none';
        }
    }
}

// Hide hints when input loses focus
function handleProductSearchBlur(e) {
    setTimeout(() => {
        const itemId = parseInt(e.target.getAttribute('data-id'));
        const hintContainer = document.getElementById(`search-hint-${itemId}`);
        if (hintContainer) {
            hintContainer.style.display = 'none';
        }
    }, 200);
}

// Select product from hint
function selectProductFromHint(itemId, hintElement) {
    const productId = hintElement.getAttribute('data-product-id');
    const productName = hintElement.getAttribute('data-product-name');
    const price = hintElement.getAttribute('data-price');
    const category = hintElement.getAttribute('data-category');

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

// Save invoice
function saveInvoice() {
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const invoiceDateValue = document.getElementById('invoiceDate').value;

    if (!clientName) {
        alert('Please enter client name');
        return;
    }

    if (invoiceItems.length === 0) {
        alert('Please add at least one item to the invoice');
        return;
    }

    // Calculate total amount using global discount and tax
    let subtotal = 0;
    invoiceItems.forEach(item => {
        subtotal += item.quantity * item.price;
    });

    const discountValue = (subtotal * globalDiscount) / 100;
    const taxableAmount = subtotal - discountValue;
    const taxValue = (taxableAmount * globalTax) / 100;
    const total = taxableAmount + taxValue;

    // Create new invoice
    const newInvoice = {
        id: nextInvoiceNumber,
        number: invoiceNumber.value,
        client: clientName,
        issueDate: invoiceDateValue,
        amount: total,
        status: 'pending',
        subtotal: subtotal,
        discount: discountValue,
        tax: taxValue
    };

    // Add to invoices array
    invoices.unshift(newInvoice);
    nextInvoiceNumber++;

    // Update UI
    loadInvoices();
    updateStats();

    // Close modal
    closeInvoiceModalFunc();

    alert('Invoice created successfully!');
}

// Save product - SIMPLIFIED
function saveProduct() {
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

    // Create new product with only existing fields
    const newProduct = {
        id: nextProductId,
        name: productName,
        price: productPrice,
        category: productCategory
    };

    // Add to products array
    products.push(newProduct);
    nextProductId++;

    // Update UI
    loadProducts();

    // Close modal
    closeProductModalFunc();

    alert('Product added successfully!');
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
