// DOM manipulation functions
import { formatDate } from './utils.js';
// RENDER INVOICE ITEMS
import { editProduct,deleteProduct,saveProduct } from './product.js';
import { openModal} from './bill_layout.js';
import { editInvoiceSection} from './edit_invoice.js';
import { saveCustomer } from './create_invoice.js';
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
        hintContainer.innerHTML=''
        hintContainer.innerHTML = `
        <div class="bg-white hint-empty">
            <button type="button"
                id="add-product-btn"
                class="w-full text-left px-3 py-2 text-sm text-blue-600 
                       bg-white border-none hover:bg-gray-100 focus:outline-none cursor-pointer">
                + Add Product
            </button>
        </div>`
        hintContainer.style.display = 'block';
        const addBtn = document.getElementById('add-product-btn');

        addBtn.onmousedown = async(e) =>{
            console.log('click chai hudae xa??');
            e.preventDefault();

            //  the invoice row which is active
            window.activeInvoiceItemId = itemId;

            const product_name = document.querySelector('.product-search-input');
            document.getElementById('productName').value = product_name.value;
            const productModal = document.getElementById('addProductModal');
            productModal.classList.remove('hidden');

            //saving the product 
            document.getElementById('saveProductBtn').onclick = () =>{
                saveProduct(productModal) 
            }

            //closing the add product modal
            document.getElementById('closeProductModal').onclick = () =>{
            productModal.classList.add('hidden');
            product_name.value = '';
            }

            document.getElementById('cancelProductBtn').onclick = () =>{
            productModal.classList.add('hidden');
            product_name.value = '';
            }
            }
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
        console.log("yaa ho ni ")
        hintContainer.innerHTML = '';
         hintContainer.innerHTML = `
           <div class="bg-white hint-empty">
            <button
                id="add-client-btn"
                class="w-full text-left px-3 py-2 text-sm text-blue-600 
                        bg-white border-none hover:bg-gray-100 focus:outline-none cursor-pointer">
                + Add Client
            </button>
            </div>

        `;
        hintContainer.style.display = 'block';

        const addBtn = document.getElementById('add-client-btn');
        addBtn.onmousedown = async (e) => {
            e.preventDefault();
            await saveCustomer();
            hintContainer.style.display = 'none';
        };
    }
}


// const createInvoicePage = document.getElementById("createInvoicePage")
// console.log("this is edit createinvoicepage section ",createInvoicePage)




const mycurrentUrl = window.location.href;
const eachpart = mycurrentUrl.split('/')
console.log(eachpart)
const order_id = eachpart[eachpart.length-2]
console.log(order_id)

if(eachpart[eachpart.length-3] == 'invoices'){
    editInvoiceSection(order_id)
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
    
    clients.forEach((client, index) => {
    const row = document.createElement('tr');
    row.classList.add('border-b', 'border-gray-200', 'hover:bg-gray-50', 'transition-colors');
    
    // Generate initials for avatar
    const initials = client.name 
        ? client.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'NA';
    
    // Format currency
    const formatCurrency = (amount) => {
        if (!amount && amount !== 0) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };
    
    // Determine client activity status
    const totalInvoices = client.total_invoices || client.totalInvoices || 0;
    const totalSpent = client.total_spent || client.totalSpent || 0;
    const statusClass = totalInvoices > 10 ? 'bg-green-100 text-green-800' :
                       totalInvoices > 0 ? 'bg-blue-100 text-blue-800' :
                       'bg-gray-100 text-gray-800';
    const statusText = totalInvoices > 10 ? 'Premium' :
                      totalInvoices > 0 ? 'Active' : 'New';
    
    row.innerHTML = `
        <td class="py-2 px-4 text-sm text-gray-600">${client.id || client.uid || 'N/A'}</td>
        <td class="py-2 px-4">
            <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-medium text-xs">${initials}</span>
                </div>
                <div>
                    <div class="font-medium text-gray-800 text-sm">${client.name || 'N/A'}</div>
                    <span class="inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${statusClass}">
                        ${statusText}
                    </span>
                </div>
            </div>
        </td>
        <td class="py-2 px-4 text-sm text-gray-700">
            <div class="flex items-center space-x-1">
                <i class="fas fa-envelope text-gray-400 text-xs"></i>
                <span class="truncate max-w-[120px]">${client.email || 'N/A'}</span>
            </div>
        </td>
        <td class="py-2 px-4 text-sm text-gray-700">
            <div class="flex items-center space-x-1">
                <i class="fas fa-phone text-gray-400 text-xs"></i>
                <span>${client.phone || 'N/A'}</span>
            </div>
        </td>
        <td class="py-2 px-4">
            <div class="flex items-center space-x-1">
                <span class="text-sm font-medium text-gray-800">${totalInvoices}</span>
                <span class="text-xs text-gray-500">invoices</span>
            </div>
        </td>
        <td class="py-2 px-4">
            <div class="text-sm font-bold text-green-600">${formatCurrency(totalSpent)}</div>
            ${totalInvoices > 0 ? `
                <div class="text-xs text-gray-500">
                    Avg: ${formatCurrency(totalSpent / totalInvoices)}
                </div>
            ` : ''}
        </td>
        <td class="py-2 px-4">
            <div class="flex items-center space-x-1">
                <button class="text-blue-600 hover:text-blue-800 p-1.5 rounded hover:bg-blue-50 transition-colors" title="View">
                    <i class="fas fa-eye text-xs"></i>
                </button>
                <button class="text-gray-600 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 transition-colors action-edit" data-id="${client.id || client.uid}" title="Edit">
                    <i class="fas fa-edit text-xs"></i>
                </button>
                <button class="text-red-600 hover:text-red-800 p-1.5 rounded hover:bg-red-50 transition-colors action-delete" data-id="${client.id || client.uid}" title="Delete">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </td>
    `;
    row.addEventListener('click',()=>{

        window.location.href=`/dashboard/client-detail/${client.uid}/`;
    })
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
    row.addEventListener("click", (event) => {
         const row = event.target.closest('tr');
            // console.log("this is row",row.dataset)
            if (!row) return;
            const invoiceId = row.dataset.uid || parseInt(row.cells[0].innerText.split('-')[1]);
            // console.log("this is invoiceId in addEventListener ",invoiceId)
            openModal(invoice.uid);


        });

        invoicesTableBody.prepend(row);
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
        product.name.toLowerCase().includes(searchTerm)
    );

    productsTableBody.innerHTML = '';

    filteredProducts.forEach((product,index) => {
        const row = document.createElement('tr');
        row.classList.add('filteredRow')
        row.innerHTML = `
<td>${index+1}</td>
<td>${product.name}</td>
<td>${product.category || 'N/A'}</td>
<td>$${product.cost_price}</td>
<td>$${product.selling_price}</td>

<td>${String(product.quantity)}</td>

`;
        row.addEventListener('click', () => {
            window.location.href = `/dashboard/product-detail/${product.uid}`;
        });
        productsTableBody.appendChild(row);
    });
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
