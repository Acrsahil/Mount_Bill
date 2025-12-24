// DOM manipulation functions
import { formatDate } from './utils.js';
// RENDER INVOICE ITEMS
import { editProduct,deleteProduct } from './product.js';
import { openModal} from './bill_layout.js';
// Show product suggestions
export function showProductSuggestions(itemId, products, searchTerm = '', selectProductFromHint) {
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
data-product-selling-price="${product.selling_price}" 
data-product-cost-price="${product.cost_price}" 
data-product-category="${product.category || ''}">
${product.name} - Selling: $${product.selling_price} | Cost: $${product.cost_price} ${product.category ? `(${product.category})` : ''}
</div>
`).join('');
        hintContainer.style.display = 'block';

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

// Show client suggestions
export function showClientSuggestions(clients, searchTerm = '', selectClientFromHint) {
    const hintContainer = document.getElementById('client-search-hint');
    if (!hintContainer) return;

    console.log("show client suggestion?")
    const filteredClients = searchTerm 
        ? clients.filter(client => 
            client.name.toLowerCase().includes(searchTerm)
        )
        : clients;
        
    console.log("clients: ",clients)
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

// Show product name suggestions
export function showProductNameSuggestions(products, searchTerm = '', fillProductDetails) {
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
data-product-cost-price="${product.cost_price}" 
data-product-selling-price="${product.selling_price}" 
data-product-category="${product.category || ''}">
${product.name} - Cost: $${product.cost_price} | Selling: $${product.selling_price} ${product.category ? `(${product.category})` : ''}
</div>
`).join('');
        hintContainer.style.display = 'block';

        // Reattach click events
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
    } else {
        hintContainer.style.display = 'none';
    }
}

// Show category suggestions
export function showCategorySuggestions(productCategories, searchTerm = '') {
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

        // Reattach click events
        hintContainer.querySelectorAll('.hint-item').forEach(item => {
            item.addEventListener('mousedown', function(e) {
                e.preventDefault();
                const categoryName = item.getAttribute('data-category-name');
                document.getElementById('productCategory').value = categoryName;
                hideCategorySearchHint();
            });
        });
    } else {
        hintContainer.style.display = 'none';
    }
}

// Hide hints
export function hideClientSearchHint() {
    const hintContainer = document.getElementById('client-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
    }
}

export function hideProductNameSearchHint() {
    const hintContainer = document.getElementById('product-name-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
    }
}

export function hideCategorySearchHint() {
    const hintContainer = document.getElementById('product-category-search-hint');
    if (hintContainer) {
        hintContainer.style.display = 'none';
    }
}

// Hide all search hints
export function hideSearchHints() {
    document.querySelectorAll('.search-hint').forEach(container => {
        container.style.display = 'none';
    });
}

// Fill client details
//removed the clientId,clientEmail,clientAddress from the UI so removed from here too and worked fine
export function fillClientDetails(client) {
    document.getElementById('clientName').value = client.name;
    // document.getElementById('clientId').value = `CLI-${client.id.toString().padStart(3, '0')}`;
    // document.getElementById('clientEmail').value = client.email || '';
    // document.getElementById('clientAddress').value = client.address || '';
}

// Clear client details
export function clearClientDetails() {
    document.getElementById('clientName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientEmail').value = '';
    document.getElementById('clientAddress').value = '';
}

// Fill product details
export function fillProductDetails(product) {
    document.getElementById('productName').value = product.name;
    document.getElementById('productCostPrice').value = product.cost_price;
    document.getElementById('productSellingPrice').value = product.selling_price;
    document.getElementById('productCategory').value = product.category || '';
    document.getElementById('productQuantity').value = product.quantity;
}



// Load clients
export function loadClients(clients, clientsTableBody) {
    if (!clientsTableBody) return;
    
    clientsTableBody.innerHTML = '';
    
    clients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.name}</td>
            <td>${client.email || '-'}</td>
            <td>${client.phone || '-'}</td>
            <td class="action-cell">
                <div class="action-btn action-view">
                    <i class="fas fa-eye"></i>
                </div>
                <div class="action-btn action-edit" data-id="${client.id}">
                    <i class="fas fa-edit"></i>
                </div>
                <div class="action-btn action-delete" data-id="${client.id}">
                    <i class="fas fa-trash"></i>
                </div>
            </td>
        `;
        clientsTableBody.appendChild(row);
    });
}

// Load invoices - FIXED VERSION
export function loadInvoices(invoices, invoicesTableBody, csrfToken = '') {
    if (!invoicesTableBody) return;

    invoicesTableBody.innerHTML = '';

    invoices.forEach(invoice => {
        // Ensure amount is a valid number, use 0 as default
        const amount = invoice.amount || 0;
        
        const row = document.createElement('tr');
        row.classList.add("invoicesList");
        row.innerHTML = `
<td>${invoice.number || `INV-${invoice.id}`}</td>
<td>${invoice.client || 'Unknown Client'}</td>
<td>${formatDate(invoice.issueDate || invoice.date || new Date().toISOString())}</td>
<td>$${parseFloat(amount).toFixed(2)}</td>
<td><span class="status status-${invoice.status || 'pending'}">${(invoice.status || 'pending').charAt(0).toUpperCase() + (invoice.status || 'pending').slice(1)}</span></td>
<td class="action-cell">
    <div class="action-btn action-edit">
        <i class="fas fa-edit"></i>
    </div>
    <div class="action-btn action-delete" data-token="${csrfToken}" data-id="${invoice.id}">
        <i class="fas fa-trash"></i>
    </div>
</td>
`;
    // Add click event to view buttons using event delegation
    row.addEventListener("click", () => {
            openModal();
        });
   
        invoicesTableBody.appendChild(row);
    });
}

// Filter invoices - FIXED VERSION
export function filterInvoices(invoices, searchInput, invoicesTableBody) {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredInvoices = invoices.filter(invoice => 
        (invoice.number && invoice.number.toLowerCase().includes(searchTerm)) ||
        (invoice.client && invoice.client.toLowerCase().includes(searchTerm))
    );

    invoicesTableBody.innerHTML = '';

    filteredInvoices.forEach(invoice => {
        // Ensure amount is a valid number, use 0 as default
        const amount = invoice.amount || 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
<td>${invoice.number || `INV-${invoice.id}`}</td>
<td>${invoice.client || 'Unknown Client'}</td>
<td>${formatDate(invoice.issueDate || invoice.date || new Date().toISOString())}</td>
<td>$${parseFloat(amount).toFixed(2)}</td>
<td><span class="status status-${invoice.status || 'pending'}">${(invoice.status || 'pending').charAt(0).toUpperCase() + (invoice.status || 'pending').slice(1)}</span></td>
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
export function filterProducts(products, productSearchInput, productsTableBody, editProduct, deleteProduct) {
    const searchTerm = productSearchInput.value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
            (product.category && product.category.toLowerCase().includes(searchTerm))
    );

    productsTableBody.innerHTML = '';

    filteredProducts.forEach((product,index) => {
            const row = document.createElement('tr');
        row.innerHTML = `
        <td>${index+1}</td>
<td>${product.name}</td>
<td>${product.category || 'N/A'}</td>
    <td>$${product.cost_price}</td>
    <td>$${product.selling_price}</td>

    <td>${String(product.quantity)}</td>

`;
  productsTableBody.appendChild(row);
    });

    // Reattach event listeners
    // document.querySelectorAll('.edit-product-btn').forEach(button => {
    //     button.addEventListener('click', function() {
    //         const productId = parseInt(this.getAttribute('data-id'));
    //         editProduct(productId);
    //     });
    // });

    // document.querySelectorAll('.delete-product-btn').forEach(button => {
    //     button.addEventListener('click', function() {
    //         const productId = parseInt(this.getAttribute('data-id'));
    //         deleteProduct(productId);
    //     });
    // });
}

// Filter clients
export function filterClients(clients, clientSearchInput, clientsTableBody) {
    const searchTerm = clientSearchInput.value.toLowerCase();
    const filteredClients = clients.filter(client => 
        client.name.toLowerCase().includes(searchTerm) ||
        (client.email && client.email.toLowerCase().includes(searchTerm)) ||
        (client.phone && client.phone.toLowerCase().includes(searchTerm))
    );

    if (!clientsTableBody) return;

    clientsTableBody.innerHTML = '';

    filteredClients.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
<td>CLI-${client.id.toString().padStart(3, '0')}</td>
<td>${client.name}</td>
<td>${client.email || '-'}</td>
<td>${client.address || '-'}</td>
<td>${client.phone || 'N/A'}</td>
<td>${client.totalInvoices || 0}</td>
<td>$${((client.totalSpent || 0)).toFixed(2)}</td>
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
