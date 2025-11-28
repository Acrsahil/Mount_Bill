// DOM manipulation functions
import { updateItemTotal, updateTotals, formatDate } from './utils.js';

// RENDER INVOICE ITEMS
export function renderInvoiceItems(invoiceItems, invoiceItemsBody, setupProductSearchHandlers, handleItemUpdate, handleRemoveItem) {
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
    setupProductSearchHandlers();

    document.querySelectorAll('.item-quantity, .item-price').forEach(input => {
        input.addEventListener('input', handleItemUpdate);
    });

    document.querySelectorAll('.remove-item-btn').forEach(button => {
        button.addEventListener('click', handleRemoveItem);
    });
}

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
export function fillClientDetails(client) {
    document.getElementById('clientName').value = client.name;
    document.getElementById('clientId').value = `CLI-${client.id.toString().padStart(3, '0')}`;
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientAddress').value = client.address || '';
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
}

// LOAD PRODUCTS
export function loadProducts(products, productList, editProduct, deleteProduct) {
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
<div class="product-price">
    <div>Cost: $${product.cost_price}</div>
    <div>Selling: $${product.selling_price}</div>
</div>
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

// Load clients
export function loadClients(clients, clientsTableBody) {
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

// Load invoices
export function loadInvoices(invoices, invoicesTableBody) {
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
export function filterInvoices(invoices, searchInput, invoicesTableBody) {
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
export function filterProducts(products, productSearchInput, productList, editProduct, deleteProduct) {
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
<div class="product-price">
    <div>Cost: $${product.cost_price}</div>
    <div>Selling: $${product.selling_price}</div>
</div>
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

// Filter clients
export function filterClients(clients, clientSearchInput, clientsTableBody) {
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
