// API calls for AJAX/fetch requests
import { showAlert } from './utils.js';
import { openAddProductModal, closeProductModalFunc,handleItemUpdate,handleRemoveItem } from './events.js';
import { openModal } from './bill_layout.js';
import { renderInvoiceItems,setupProductSearchHandlersForPage,updateTotals,updateItemTotal,showTotalSection,addInvoiceItem,selectProductFromHint } from './create_invoice.js';
//for csrfToken for js
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrfToken = getCookie('csrftoken');


//for stock filter
document.addEventListener('DOMContentLoaded', () => {
    
    const slidercheck = document.getElementById('statusToggle');
    const lowStockConstraint = document.getElementById('lowStockConstraint')

    if (!slidercheck || !lowStockConstraint) return;
    lowStockConstraint.style.display = 'none';
    slidercheck.addEventListener('change', () => {
        if (slidercheck.checked == true) {
            lowStockConstraint.style.display = 'flex';
        }
        else {
            lowStockConstraint.style.display = 'none';
        }
    })

})



const stocklistpopup = document.querySelector('.stocklist-popup');
let currentCategory = null; // store the currently selected category
let currentStock = "";      // store the currently selected stock filter

async function fetchStockProducts(category = null, stock = "") {
    let url = `/dashboard/filtered-products/?`;
    if (category) url += `category=${category}&`;
    if (stock) url += `stock=${stock}&`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("yo ho k ho ", data)
    return data.products;

}
document.addEventListener('DOMContentLoaded', () => {
    const stocklists = document.getElementById('stocklists');
    if (!stocklists) return;
    stocklists.addEventListener('click', (e) => {

        e.stopPropagation();
        console.log("click vako xaina??")
        const rect = stocklists.getBoundingClientRect();

        stocklistpopup.style.top = rect.bottom + window.scrollY + 'px';
        stocklistpopup.style.left = rect.left + window.scrollX + 'px';

        if (stocklistpopup.style.display === 'block') {
            stocklistpopup.style.display = 'none';
        }
        else {
            stocklistpopup.style.display = 'block';
        }

        //for changing the button text

    })
    document.addEventListener('click', (e) => {
        if (!stocklistpopup.contains(e.target) && !stocklists.contains(e.target)) {
            stocklistpopup.style.display = 'none';
        }
    });

    stocklistpopup.addEventListener('click', async (e) => {
        if (e.target.tagName === 'LI') {
            stocklists.textContent = e.target.textContent; // change button text
            if (e.target.id === 'allStock') {
                currentStock = '';
            }
            if (e.target.id === 'inStock') {
                currentStock = 'instock';

            }
            if (e.target.id == 'lowStock') {
                currentStock = "lowstock";
            }
            if (e.target.id == 'outStock') {
                currentStock = "outstock";
            }
            const stockProduct = await fetchStockProducts(currentCategory, currentStock);
            productList.innerHTML = ``;
            stockProduct.forEach(product => addProductToList(product, productList))

            stocklistpopup.style.display = 'none'; // close popup
        }
    });
})

//category on the addProductModal
const categoryDB = document.getElementById('categoryDB');
const productCategories = document.getElementById('productCategory');

if(productCategories){
productCategories.addEventListener('click', (e) => {
    e.stopPropagation();
    categoryDB.classList.remove('hidden');
    loadCategories(); // populate dynamically
});
}
// click outside to hide
document.addEventListener('click', () => {
    categoryDB.classList.add('hidden');
});

// select category
categoryDB.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        productCategories.value = e.target.textContent;
        categoryDB.classList.add('hidden');
    }
});







document.addEventListener('DOMContentLoaded', () => {
    const caterorylists = document.getElementById('caterorylists');
    const categoryPopup = document.getElementById('categoryPopup');
    const categoryList = document.getElementById('categoryList');
    const button = document.getElementById('caterorylists');
    // Toggle popup on button click
    if(!caterorylists) return;
    caterorylists.addEventListener('click', (e) => {
        // Prevent click from closing the popup immediately
        e.stopPropagation();

        const rect = caterorylists.getBoundingClientRect();

        // Position the popup below the button
        categoryPopup.style.top = rect.bottom + window.scrollY + 'px';
        categoryPopup.style.left = rect.left + window.scrollX + 'px';

        //fetch category from backend when clicked
        loadCategories()
        // Toggle visibility
        if (categoryPopup.style.display === 'block') {
            categoryPopup.style.display = 'none';
        } else {
            categoryPopup.style.display = 'block';
        }
    });
    // Replace button text when clicking a category
    // categoryClick()
    async function categoryClick(categoryId) {
        const productList = document.querySelector('.productList');
        //empty the list first 
        productList.innerHTML = ``;
        currentCategory = categoryId;
        const products = await fetchStockProducts(currentCategory, currentStock);
        products.forEach(product => addProductToList(product, productList))
    }

    categoryList.addEventListener('click', async (e) => {
        const li = e.target;
        if (li.tagName === 'LI') {
            button.textContent = li.textContent;
            if (li.id == 'allCategories') {
                currentCategory = null
                const products = await fetchStockProducts(currentCategory, currentStock);
                productList.innerHTML = '';
                products.forEach(product => addProductToList(product, productList))
                categoryPopup.style.display = 'none';
            }
            // replace button label

            else {
                const category_id = li.dataset.id;
                categoryClick(category_id);
                categoryPopup.style.display = 'none';
            }
            // hide popup
        }
    });



    // }
    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (!categoryPopup.contains(e.target) && !caterorylists.contains(e.target)) {
            categoryPopup.style.display = 'none';
        }
    });

})


//fetch category from backend
let categories = []

async function loadCategories() {
    try {
        console.log("am i here?inside")
        const res = await fetch("/dashboard/category-json/");
        const data = await res.json();
        console.log("yaa print garxu ma ", data)

        categories = data.categories
        renderCategory(categories)
        renderCategories(categories)
    } catch (error) {
        console.error("Error loading categories", error)
    }
}


//to render category inside the addproductmodal

function renderCategory(categoryArray) {
    const catelists = document.getElementById('catelists');
    const general = document.getElementById('general');
    catelists.querySelectorAll('li.categoryProductModal').forEach(li => li.remove());

    categoryArray.forEach(category => {
        const li = document.createElement('li');
          li.classList.add(
        'categoryProductModal',         
        'px-4', 'py-2',      
        'cursor-pointer',        
        'transition',            
        'hover:bg-gray-300'      
    );
    li.textContent = category.name;
    li.dataset.id = category.id;

        catelists.insertBefore(li, general)
    });
    // Show or hide 'general' in dropdown
    if (categoryArray.length === 0) {
        general.style.display = 'none';
    } else {
        general.style.display = 'block';
    }
}

function renderCategories(categoryArray) {
    const categoryList = document.getElementById('categoryList');
    const generalCategory = document.getElementById('generalCategory');

    if (!categoryList || !generalCategory) return;
    document.querySelectorAll('.categorylists').forEach(li => li.remove())
    categoryArray.forEach(category => {
        const li = document.createElement('li');
        li.classList.add('categorylists')
        li.textContent = category.name;
        li.dataset.id = category.id;

        categoryList.insertBefore(li, generalCategory);
    })
}
// FILTER Category
document.addEventListener('DOMContentLoaded', () => {
    const categorySearchInput = document.getElementById('categorySearchInput');
    if(!categorySearchInput) return;
    categorySearchInput.addEventListener('input', () => {
        const searchTerm = categorySearchInput.value.toLowerCase();
        const filteredCategory = categories.filter(category => category.name.toLowerCase().includes(searchTerm));
        renderCategories(filteredCategory);
    })

    loadCategories()
})
//open modal for add product of product-detail page
document.addEventListener('DOMContentLoaded', () => {
    const addNewProductDetailBtn = document.getElementById('addNewProductDetailBtn');
    const addProductModal = document.getElementById('addProductModal');
    if(!addNewProductDetailBtn) return;
    addNewProductDetailBtn.addEventListener('click', () => {
        openAddProductModal(addProductModal);
    });
});

// FILTER PRODUCTS
const productList = document.querySelector('.productList');
const productDetailSearchInput = document.getElementById('productDetailSearchInput');

// //when input is inside the search input
document.addEventListener('DOMContentLoaded', () => {
    if(!productDetailSearchInput) return;
    productDetailSearchInput.addEventListener('input', () => {
        filterProduct(products, productDetailSearchInput, productList)
    })
})


//filter product function
export function filterProduct(products, productDetailSearchInput, productList) {
    const searchLetter = productDetailSearchInput.value.toLowerCase();
    const filteredProduct = products.filter(product =>
        product.name.toLowerCase().includes(searchLetter)
    );

    productList.innerHTML = '';

    filteredProduct.forEach((product) => {
        const li = document.createElement('li');
        li.classList.add('productlists');
        li.textContent = product.name;
        li.dataset.id = product.id;
        li.dataset.uid = product.uid;
        productList.appendChild(li);


        // Auto-select based on URL
        const uidInUrl = selectedIdFromUrl();
        if (uidInUrl && String(uidInUrl) === String(product.uid)) {
            li.classList.add('selected');
            const deleteBtn = document.querySelector('.delete-product-btn');
            if (deleteBtn) deleteBtn.dataset.productId = product.id;
            const editBtn = document.querySelector('.edit-product-btn');
            if (editBtn) editBtn.dataset.productId = product.id;
        }

        li.addEventListener('click', () => {
            //for deleting the product,we need product id
            const deleteBtn = document.querySelector('.delete-product-btn');
            const editBtn = document.querySelector('.edit-product-btn');
            deleteBtn.dataset.productId = product.id;
            editBtn.dataset.productId = product.id;
            console.log("yo id ho haii", editBtn.dataset.productId)

            history.pushState({}, '', `/dashboard/product-detail/${product.uid}`);
            document.querySelectorAll('.productlists').forEach(item => {
                item.classList.remove('selected');
            }
            )
            li.classList.add('selected')
            //immediately update the table
            renderDetails(productsCache);
        });
    });
}


let productsCache = []; // store products locally

// Fetch products from backend
async function fetchProducts() {
    const res = await fetch('/dashboard/products-json/', {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
    const data = await res.json();

    productsCache = data.products; // store in cache
    updateProductCounts(data.count); // update counts
    return productsCache;
}

function updateProductCounts(count) {
    const productCount = document.getElementById('productCount');
    if (productCount) productCount.textContent = `All Products(${count})`;

    const itemNum = document.getElementById('itemNum');
    if (itemNum) itemNum.textContent = `Products(${count})`;
}

// Render products in table and list
function renderProducts() {
    const productsTableBody = document.getElementById('productsTableBody');
    const productList = document.querySelector('.productList');

    loadProducts(productsCache, productsTableBody, editProduct, deleteProduct, productList);
}


// Refresh products from server if necessary
async function refreshProducts(force = false) {
    // Only fetch if cache is empty or forced
    if (force || productsCache.length === 0) {
        try {
            await fetchProducts();
        } catch (err) {
            console.error('Failed to refresh products:', err);
        }
    }
    updateProductCounts(productsCache.length);
    renderProducts();
}

// On page load
document.addEventListener('DOMContentLoaded', () => {
    refreshProducts().catch(console.error);
});

// Handle BFCache (back/forward navigation)
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        refreshProducts(true).catch(console.error); // force fetch only if page restored from BFCache
    }
});

// edit stock inside the product activity list
export async function editAddActivity(activityId) {
    console.log("yo activityId ho", activityId)
    let activity = window.activities.find(
        a => String(a.id) === String(activityId)
    );
    console.log("yo activity xa ki naii", activity)
    console.log("yo first letter haii", (String(activity.change)[0]));
    const addStockModal = document.getElementById('addStockModal');
    let quantityInput = document.getElementById('stockQuantity')
    let productSellingPrice = document.getElementById('productPrices');
    let stockDate = document.getElementById('stockDate');
    let stockRemarks = document.getElementById('stockRemarks');

    //buttons in the modal
    const deleteStockBtn = document.getElementById('deleteStockBtn');
    const editStockBtn = document.getElementById('editStockBtn');
    const cancelStockBtn = document.getElementById('cancelStockBtn');
    const updateStockBtn = document.getElementById('UpdateStockBtn');
    const saveStockBtn = document.getElementById('saveStockBtn');
    cancelStockBtn.style.display = 'none';
    updateStockBtn.style.display = 'none';
    saveStockBtn.style.display = 'none';
    if (deleteStockBtn) deleteStockBtn.style.display = 'flex';
    if (editStockBtn) editStockBtn.style.display = 'flex';

    //edit button to make the readonly into write
    editStockBtn.onclick = () => {
        quantityInput.readOnly = false;
        productSellingPrice.readOnly = false;
        stockDate.readOnly = false;
        stockRemarks.readOnly = false;
        cancelStockBtn.style.display = 'flex';
        updateStockBtn.style.display = 'flex';
        deleteStockBtn.style.display = 'none';
        editStockBtn.style.display = 'none';

    }

    //to delete the itemactivity
    addStockModal.dataset.id = activityId
    // deleteStockBtn.addEventListener('click',() => {

    // })
    if (activity) {
        console.log("activity vetiyo")
        updateStockBtn.onclick = () => {
            console.log("okay here in update")
            updateActivity(activity, addStockModal)
        }
        // Populate form with product data

        quantityInput.readOnly = true;
        productSellingPrice.readOnly = true;
        stockDate.readOnly = true;
        stockRemarks.readOnly = true;



        stockRemarks.value = activity.remarks;

        if (String(activity.change)[0] == '-') {
            console.log("This function is being called!!!")
            const afterRemovalNegation = String(activity.change).slice(1);
            quantityInput.value = afterRemovalNegation;
            document.querySelector('.product-price').textContent = 'Selling Price';
            console.log('window  product ko value haii ', activity.product_selling_price)
            productSellingPrice.value = activity.product_selling_price;
            stockDate.value = activity.date;
        }
        if (String(activity.change)[0] == '+') {
            const afterRemovalAdd = String(activity.change).slice(1);
            quantityInput.value = afterRemovalAdd;
            document.querySelector('.product-price').textContent = 'Cost Price';
            document.getElementById('productPrices').value = activity.product_cost_price;
        }

        //     // Change modal title and button
        document.querySelector('#addStockModal .modal-header h3').textContent = 'Edit Product';
        document.querySelector('.stock-label').textContent = 'Quantity';
        //     document.getElementById('updateProductBtn').style.display = 'flex';
        //     const quantity = document.querySelector('.productQuantities');
        //     quantity.style.display = 'none';

        // Show modal

        if (addStockModal) {
            addStockModal.style.display = 'flex';
        }
    }
}

function updateActivityRowInTable(updatedActivity) {
    const tableBody = document.getElementById('productsactivityTableBody');
    if (!tableBody) return;

    // Find existing row by data-activity-id
    const row = tableBody.querySelector(`tr[data-activity-id='${updatedActivity.id}']`);

    if (row) {
        // Update the existing row
        row.cells[0].textContent = updatedActivity.type;
        row.cells[1].textContent = updatedActivity.date;
        row.cells[2].textContent = updatedActivity.stock_quantity;
        row.cells[3].textContent = updatedActivity.quantity;
        row.cells[4].textContent = updatedActivity.remarks;
    } else {
        // If row doesn't exist, add as new
        addProductActivityToTable(updatedActivity, tableBody);
    }
}


// Save product to database via AJAX
export async function updateActivity(activity, addStockModal) {
    const activityId = addStockModal.dataset.id;
    const stockQuantity = document.getElementById('stockQuantity')?.value;
    const productPrices = document.getElementById('productPrices')?.value;
    const stockDate = document.getElementById('stockDate')?.value;
    const stockRemarks = document.getElementById('stockRemarks')?.value;

    if (!productPrices || parseFloat(productPrices) <= 0 || isNaN(productPrices)) {
        showAlert('Please enter a valid price', 'error');
    }
    // Show loading state
    const updateStockBtn = document.getElementById('UpdateStockBtn');
    const originalText = updateStockBtn.innerHTML;

    updateStockBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    updateStockBtn.disabled = true;

    try {
        // Prepare data for sending
        const stockData = {
            id: activityId,
            stockQuantity: stockQuantity,
            productPrices: productPrices,
            stockDate: stockDate,
            stockRemarks: stockRemarks,
            type: activity.type,
            remarks: activity.remarks,
        };

        // Send AJAX request to Django
        const response = await fetch(`/dashboard/update-stock/${activityId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(stockData)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {

            updateActivityRowInTable(result.updatedActivity);
            // Show success message
            showAlert(result.message, 'success');

            // Close modal after short delay
            setTimeout(() => {
                const closeStockModalFunc = () => {
                    if (addStockModal) {
                        addStockModal.style.display = 'none';
                    }
                };
                closeStockModalFunc();

                //     // Reset form
                document.getElementById('stockQuantity').value = '';
                document.getElementById('productPrices').value = '';
                document.getElementById('stockDate').value = '';
                document.getElementById('stockRemarks').value = '';
            }, 1500);

        } else {
            showAlert('Error: ' + (result.error || 'Failed to save product'), 'error');
        }

    } catch (error) {
        console.error('Error saving product:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        updateStockBtn.innerHTML = originalText;
        updateStockBtn.disabled = false;
    }

}
//fetch Product to productsactivityTableBody
async function fetchProductActivities(productUid, productsactivityTableBody) {
    if (!productUid || !productsactivityTableBody) return;
    const res = await fetch(`/dashboard/fetch-activity/${productUid}/`)

    const result = await res.json();
    window.activities = result.activities
    if (result.success) {
        loadProductActivity(window.activities, productsactivityTableBody)
    }

}



export async function invoice_uid(id) {
    const url = `/dashboard/invoice-uid/${id}/`; 
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.uid;

    } catch (error) {
        console.error('Error:', error);
    }
}

function addProductActivityToTable(activity, productsactivityTableBody) {
    if (!productsactivityTableBody) return;

    const row = document.createElement('tr');

    // Base row styling
    row.classList.add(
        "border-b",
        "border-gray-200",
        "hover:bg-gray-50",
        "transition-colors",
        "duration-150"
    );

    // Conditional styling for activity row
    row.dataset.orderUid = activity.order_uid;
    row.dataset.order_id = activity.order_id;
    row.dataset.purchaseUid = activity.purchase_uid;
    row.dataset.purchaseId = activity.purchase_id;
    row.dataset.activityId = activity.id;
    row.classList.add("cursor-pointer", "hover:bg-blue-100");

    // Table cells with proper Tailwind styling
    row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${activity.type}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${activity.date}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium ${activity.change >= 0 ? 'text-green-600' : 'text-red-600'}">${String(activity.change)}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${activity.quantity}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate" title="${activity.remarks}">${activity.remarks}</td>
    `;

    // Click event handler
    row.addEventListener('click', () => {
        if (row.dataset.order_id && parseInt(row.dataset.order_id) > 0) {
             openModal(row.dataset.orderUid)
            

        }else if (row.dataset.purchaseId && parseInt(row.dataset.purchaseId) > 0) {
            openModal(row.dataset.purchaseUid, "purchaseRow");
        }else{
            editAddActivity(row.dataset.activityId);
        }
    });

    productsactivityTableBody.prepend(row);
}
function loadProductActivity(activities, productsactivityTableBody) {
    if (productsactivityTableBody) {
        productsactivityTableBody.innerHTML = ``;

        activities.reverse().forEach((activity) => addProductActivityToTable(activity, productsactivityTableBody))
    }
}

//applying product to invoice
export function applyProductToInvoice(itemId, product) {
    const item = window.invoiceItems.find(i => i.id === itemId);
    if (!item) return;

    item.productId = product.id;
    item.productName = product.name;
    item.price = Number(product.selling_price);

    const row = document
        .querySelector(`.product-search-input[data-id="${itemId}"]`)
        ?.closest('tr');

    if (!row) return;

    row.querySelector('.product-search-input').value = product.name;
    row.querySelector('.item-price').value = product.selling_price;

    updateItemTotal(itemId, window.invoiceItems);
    updateTotals(window.invoiceItems, window.globalDiscount, window.globalTax);
    showTotalSection();

    const qty = row.querySelector('.item-quantity');
    if (qty) {
        setTimeout(() => {
            qty.focus();
            qty.select();
        }, 50);
    }
    if (itemId == window.invoiceItems.length) {
        addInvoiceItem();}
}

// Save product to database via AJAX

export async function saveProduct(addProductModal) {
    const productsactivityTableBody = document.getElementById('productsactivityTableBody');
    const productName = document.getElementById('productName').value.trim();
    const productCostPrice = document.getElementById('productCostPrice')?.value;
    const productSellingPrice = document.getElementById('productSellingPrice')?.value;
    const productPrice = document.getElementById('productPrice')?.value; // Fallback for old field name
    const productCategory = document.getElementById('productCategory').value.trim();
    const quantity = document.getElementById('productQuantity').value;
    const lowStockQuantity = document.getElementById('lowStockQuantity')?.value || 0;
    // Client-side validation
    if (!productName) {
        showAlert('Please enter product name', 'error');
        document.getElementById('productName').focus();
        return;
    }
    const price = productSellingPrice || productPrice;
    if (!price || parseFloat(price) <= 0 || isNaN(price)) {
        showAlert('Please enter a valid price', 'error');
        const priceInput = document.getElementById('productSellingPrice') || document.getElementById('productPrice');
        if (priceInput) priceInput.focus();
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
            cost_price: productCostPrice ? parseFloat(productCostPrice) : 0,
            selling_price: parseFloat(productSellingPrice || productPrice),
            category: productCategory,
            quantity: quantity,
            lowStockQuantity: lowStockQuantity,
        };
        console.log('Saving product:', productData);
        console.log('Sending this data:', productData);
        // Send AJAX request to Django
        const response = await fetch('/dashboard/save-product/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(productData)
        });
        const result = await response.json();

        if (result.success) {
            if (!result.product.uid) {
                showAlert("Product saved but UID missing. Please refresh.", "error");
                return;
            }
            // Add product to local cache and render table/list
            productsCache.unshift(result.product);
            renderProducts(); // rebuild table/list from DB

            updateProductCounts(productsCache.length);

            loadProductActivity(result.itemactivity, productsactivityTableBody)
            // Show success message

            showAlert(result.message, 'success');
            // Close modal after short delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            addProductModal.classList.remove('active');
            addProductModal.classList.add('hidden'); // Use class instead of style
            

            // Reset form
                document.getElementById('productName').value = '';
                const priceField = document.getElementById('productSellingPrice') || document.getElementById('productCostPrice');
                if (priceField) priceField.value = '';
                document.getElementById('productCostPrice').value = '';
                document.getElementById('productCategory').value = '';
                document.getElementById('lowStockQuantity').value = '';

                document.getElementById('productQuantity').value = '';
                const slider = document.getElementById('statusToggle');
                if (slider) {
                    slider.checked = false;
                    slider.dispatchEvent(new Event('change'));
                }

                // Apply product to invoice if needed
                const invoiceItemsBody = document.getElementById('invoiceItemsBody');
                if (invoiceItemsBody && window.activeInvoiceItemId) {
                    applyProductToInvoice(window.activeInvoiceItemId, result.product);
                }

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

export function addProductToTable(product, productsTableBody, index) {
    if (!productsTableBody) return;

    const row = document.createElement('tr');
    row.classList.add('border-b', 'border-gray-200', 'hover:bg-gray-50', 'transition-colors');

    // Determine stock status for styling
    const quantity = product.quantity || 0;
    let statusClass = '';
    let statusText = '';
    let statusColor = '';

    if (quantity > 20) {
        statusClass = 'bg-green-100 text-green-800';
        statusText = 'In Stock';
        statusColor = 'green';
    } else if (quantity > 10) {
        statusClass = 'bg-yellow-100 text-yellow-800';
        statusText = 'Low Stock';
        statusColor = 'yellow';
    } else if (quantity > 0) {
        statusClass = 'bg-orange-100 text-orange-800';
        statusText = 'Low Stock';
        statusColor = 'orange';
    } else {
        statusClass = 'bg-red-100 text-red-800';
        statusText = 'Out of Stock';
        statusColor = 'red';
    }

    // Calculate progress bar width
    let progressWidth = Math.min((quantity / 50) * 100, 100);
    if (quantity === 0) progressWidth = 0;

    row.innerHTML = `
        <td class="py-2 px-3 text-sm text-gray-600">${index + 1}</td>
        <td class="py-2 px-3">
            <div class="font-medium text-gray-800 text-sm">${product.name}</div>
        </td>
        <td class="py-2 px-3">
            <span class="inline-flex px-2 py-1 rounded text-xs font-medium">
                ${product.category || 'N/A'}
            </span>
        </td>
        <td class="py-2 px-3">
            <div class="text-sm text-gray-700">$${product.cost_price || '0.00'}</div>
        </td>
        <td class="py-2 px-3">
            <div class="text-sm text-gray-700 font-medium">$${product.selling_price || '0.00'}</div>
        </td>
        <td class="py-2 px-3">
            <div class="flex items-center space-x-2">
                <span class="text-sm font-medium ${product.quantity <= 0 ? 'text-red-600' : 'text-gray-700'}">${String(product.quantity || 0)}</span>
                
            </div>
        </td>
    `;

    row.addEventListener('click', () => {
        window.location.href = `/dashboard/product-detail/${product.uid}`;
    });

    productsTableBody.appendChild(row);
}

export function addProductToList(product, productList) {
    if (!productList) return;

    const tableBody = document.getElementById('productsactivityTableBody');
    const li = document.createElement('li');

    // Base Tailwind styling
    li.classList.add(
        'productlists',
        'px-4',
        'py-3',
        'cursor-pointer',
        'transition-colors',
        'duration-150',
        'rounded-lg',
        'mb-1',
        'border',
        'border-gray-100',
        'hover:border-gray-300',
        'hover:bg-gray-50',
        'truncate',
        'text-gray-700'
    );

    li.textContent = product.name;
    li.dataset.id = product.id;
    li.dataset.uid = product.uid;
    productList.appendChild(li);

    // Auto-select based on URL
    const uidInUrl = selectedIdFromUrl();
    if (uidInUrl && String(uidInUrl) === String(product.uid)) {
        // Remove selected state from all other items first
        document.querySelectorAll('.productlists').forEach(item => {
            item.classList.remove(
                'selected',
                'bg-blue-50',
                'border-blue-200',
                'text-blue-700',
                'font-medium'
            );
            item.classList.add(
                'border-gray-100',
                'text-gray-700'
            );
        });

        // Add selected state to current item
        li.classList.add(
            'selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium'
        );
        li.classList.remove('text-gray-700', 'border-gray-100');

        const deleteBtn = document.querySelector('.delete-product-btn');
        const editBtn = document.querySelector('.edit-product-btn');
        const adjustBtn = document.querySelector('.adjust-stock-btn');

        if (deleteBtn) deleteBtn.dataset.productId = product.id;
        if (editBtn) editBtn.dataset.productId = product.id;
        if (adjustBtn) adjustBtn.dataset.productId = product.id;

        fetchProductActivities(product.uid, tableBody);
    }

    li.addEventListener('click', () => {
        // Remove selected state from ALL other items first
        document.querySelectorAll('.productlists').forEach(item => {
            // Check if it's NOT the clicked item
            if (item !== li) {
                item.classList.remove(
                    'selected',
                    'bg-blue-100',
                    'border-blue-200',
                    'text-blue-700',
                    'font-medium'
                );
                // Re-add base styling
                item.classList.add(
                    'border-gray-100',
                    'text-gray-700'
                );
            }
        });

        // Now add selected state to clicked item
        li.classList.add(
            'selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium'
        );
        li.classList.remove('text-gray-700', 'border-gray-100');

        // Update buttons
        const deleteBtn = document.querySelector('.delete-product-btn');
        const editBtn = document.querySelector('.edit-product-btn');
        const adjustBtn = document.querySelector('.adjust-stock-btn');

        deleteBtn.dataset.productId = product.id;
        editBtn.dataset.productId = product.id;
        adjustBtn.dataset.productId = product.id;

        console.log("Product ID:", editBtn.dataset.productId);

        // Update URL
        history.pushState({}, '', `/dashboard/product-detail/${product.uid}`);

        // Immediately update the table
        renderDetails(productsCache);
        fetchProductActivities(product.uid, tableBody);
    });
}

let countercount=1
window.addEventListener('popstate', () => {
    console.log('products.js loaded');
    renderDetails(productsCache);

    // Highlight li again
    const uidInUrl = selectedIdFromUrl();
    document.querySelectorAll('.productlists').forEach(li => {
        if (String(li.dataset.uid) === String(uidInUrl)) {
            li.classList.add(
            'selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium'
        );
        } else {
            li.classList.remove(
            'selected',
            'bg-blue-100',
            'border-blue-200',
            'text-blue-700',
            'font-medium'
        );
        }
    });
})


function selectedIdFromUrl() {
    const parts = window.location.pathname.split('/').filter(Boolean);

    const idx = parts.indexOf('product-detail');
    if (idx === -1) return null;

    // "/dashboard/product-detail/" => no uid
    if (idx === parts.length - 1) return null;

    return parts[idx + 1]; // uid
}

//function to get the selected product from URL
function getSelectedProduct(products) {
    const uid = selectedIdFromUrl();
    if (!uid) return null;

    return products.find(p => String(p.uid) === String(uid)) || null;
}


// ajax to show the product details in page
function renderDetails(products) {
    const productDetailTableBody = document.getElementById('productDetailTableBody');
    const productTitle = document.getElementById('productTitle');
    if (!productDetailTableBody) return;

    const uid = selectedIdFromUrl();
    const selectedProduct = getSelectedProduct(products);

    // always clear current UI first
    productDetailTableBody.innerHTML = '';
    if (productTitle) productTitle.textContent = '';

    // 1) No uid in URL => empty state
    if (!uid) {
        showEmptyState();
        return;
    }

    // 2) uid present but product missing => not found
    if (!selectedProduct) {
        showNotFound();
        return;
    }

    // 3) product exists => show details
    showProductDetail();

    if (productTitle) productTitle.textContent = selectedProduct.name;
    addDetailToTable(selectedProduct, productDetailTableBody);
}

//add product detail on table
export function addDetailToTable(product, productDetailTableBody) {
    if (!productDetailTableBody) return;
    const rows = document.createElement('tr');
    //   rows.classList.add('thisDetailRows');
    rows.dataset.id = product.id;
    rows.innerHTML = `
      <td>${String(product.quantity)}</td>
       <td>$${product.selling_price}</td>
        <td>$${product.cost_price}</td>
        <td>$${product.cost_price * product.quantity}</td> 
      `;

    productDetailTableBody.appendChild(rows);
}

document.addEventListener('DOMContentLoaded', async () => {
    if (productsCache.length === 0) {
        await fetchProducts();
    }

    renderDetails(productsCache);
});

export function loadProducts(products, productsTableBody, editProduct, deleteProduct, productList) {
    // Render table 
    if (productsTableBody) {
        productsTableBody.innerHTML = '';

        products.forEach((product, index) => addProductToTable(product, productsTableBody, index));
    }
    // Render list (only if this page has it)

    if (productList) {
        productList.innerHTML = '';
        products.forEach((product) => addProductToList(product, productList));
    };


}

///deleting inside product-detail page
document.addEventListener('DOMContentLoaded', () => {
    const deleteBtn = document.querySelector('.delete-product-btn');
    const editBtn = document.querySelector('.edit-product-btn');
    if(!deleteBtn)return;
    deleteBtn.addEventListener('click', function () {
        const id = deleteBtn.dataset.productId;
        console.log("Deleting product", id);
        deleteProduct(id);
    });
    editBtn.addEventListener('click', function () {
        const id = editBtn.dataset.productId;
        console.log("udpating the product", id);
        editProduct(id);
    })

});




//reset addStockModal 
function resetAddStockModal() {
    const modal = document.getElementById('addStockModal');
    if (!modal) return;

    // Reset title
    const header = modal.querySelector('.modal-header h3');
    if (header) header.textContent = 'Add Stock';

    // Reset buttons
    const deleteBtn = document.getElementById('deleteStockBtn');
    const editBtn = document.getElementById('editStockBtn');
    const updateBtn = document.getElementById('UpdateStockBtn');
    const cancelStockBtn = document.getElementById('cancelStockBtn')
    const saveStockBtn = document.getElementById('saveStockBtn')

    if (deleteBtn) deleteBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';
    if (updateBtn) updateBtn.style.display = 'none';
    if (cancelStockBtn) cancelStockBtn.style.display = 'flex';
    if (saveStockBtn) saveStockBtn.style.display = 'flex';


    // Reset input fields
    const stockQuantity = document.getElementById('stockQuantity');
    const productPrices = document.getElementById('productPrices');
    const stockDate = document.getElementById('stockDate');
    const stockRemarks = document.getElementById('stockRemarks');

    if (stockQuantity) stockQuantity.value = '';
    if (productPrices) productPrices.value = '';
    if (stockRemarks) stockRemarks.value = '';
    if (stockDate) {
        const today = new Date().toISOString().split('T')[0];
        stockDate.value = today;
    }
    stockQuantity.readOnly = false;
    productPrices.readOnly = false;
    stockDate.readOnly = false;
    stockRemarks.readOnly = false;
}
document.addEventListener('click', function (e) {
    const addStock = e.target.id === 'addStock';
    if (addStock) {
        resetAddStockModal();
        const addStockModal = document.getElementById('addStockModal');
        if (addStockModal) {
            addStockModal.style.display = 'flex';
        }
    }

})

document.addEventListener('click', function (e) {
    const reduceStock = e.target.id === 'reduceStock';
    if (reduceStock) {
        const reduceStockModal = document.getElementById('reduceStockModal');
        if (reduceStockModal) {
            const stockDates = document.getElementById('stockDates');
            const today = new Date().toISOString().split('T')[0];
            stockDates.value = today
            reduceStockModal.style.display = 'flex';
        }
    }

})

//for add and reduce stock btn
document.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('addStockPopup');
    if (!popup) return;

    let currentProductId = null; // track which product popup is open for

    document.addEventListener('click', function (e) {
        const adjustBtn = e.target.closest('.adjust-stock-btn');

        if (adjustBtn) {
            const productId = adjustBtn.dataset.productId;
            const modal = document.getElementById('addStockModal');
            const modal1 = document.getElementById('reduceStockModal');
            modal.dataset.productId = productId;
            modal1.dataset.productId = productId;
            // If popup is already open for the same product → close it
            if (currentProductId === productId && popup.style.display === 'flex') {
                popup.style.display = 'none';
                currentProductId = null;
                return;
            }

            // Otherwise, show popup under clicked button
            const rect = adjustBtn.getBoundingClientRect();

            popup.style.display = 'flex';
            popup.style.top = rect.bottom + window.scrollY + 'px';
            popup.style.left = rect.left + window.scrollX + 'px';
            console.log("am i getting clicked?")
            popup.dataset.productId = productId;
            currentProductId = productId;

            e.stopPropagation();
            return;
        }

        // Clicked outside → close popup
        popup.style.display = 'none';
        currentProductId = null;
    });
});

const addStockBtn = document.getElementById('saveStockBtn');
if (!addStockBtn) {
    console.log("are we here then??")
}
else {
    addStockBtn.addEventListener('click', () => addStockFunc());
}

const reduceStockBtn = document.getElementById('reduceStockBtn');
if (!reduceStockBtn) {
    console.log("are we here then??")
}
else {
    reduceStockBtn.addEventListener('click', () => reduceStockFunc());
}

async function addStockFunc() {
    const productsactivityTableBody = document.getElementById('productsactivityTableBody');
    const modal = document.getElementById('addStockModal');
    const productId = modal?.dataset.productId;

    console.log("Product ID:", productId);

    const stockQuantity = document.getElementById('stockQuantity')?.value;
    const productPrices = document.getElementById('productPrices')?.value;
    const stockDate = document.getElementById('stockDate')?.value;
    const stockRemarks = document.getElementById('stockRemarks')?.value || "";

    if (!productId) {
        showAlert('Product ID not found!', 'error');
        return;
    }

    if (!stockQuantity || Number(stockQuantity) <= 0) {
        showAlert('Please enter a valid stock quantity!', 'error');
        document.getElementById('stockQuantity')?.focus();
        return;
    }

    // Button loading state
    const addStockBtn = document.getElementById('saveStockBtn');
    const originalText = addStockBtn.innerHTML;

    addStockBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    addStockBtn.disabled = true;

    try {
        const productData = {
            id: productId,
            stock_to_add: Number(stockQuantity),
            price: productPrices,
            date: stockDate,
            remarks: stockRemarks
        };

        const response = await fetch(`/dashboard/add-stock/${productId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(productData)
        });

        // 🔥 VERY IMPORTANT
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const result = await response.json();
        console.log('Server response:', result);
        console.log('Server response:', result.product);
        if (result.success) {
            // Update local products array
            if (window.products && result.product) {
                const index = window.products.findIndex(
                    p => String(p.uid) === String(result.product.uid)
                );


                if (index !== -1) {
                    window.products[index].quantity = result.product.quantity;
                }
            }
            if (!window.activities) {
                window.activities = []
            }

            //to update the product quantity above the table
            const quantityCell = document.getElementById('quantityCell');
            if (quantityCell) {
                quantityCell.textContent = result.product.quantity;
            }
            // renderDetails(window.products);
            result.itemactivity.forEach(activity => {
                window.activities.unshift(activity)
                addProductActivityToTable(activity, productsactivityTableBody);
            });


            // Refresh UI
            // if (window.loadProducts) {
            //     console.log("okay here in loadproduct")
            //     window.loadProducts();
            // }

            showAlert(result.message || 'Stock added successfully!', 'success');

            // WAIT a few seconds before closing modal & restoring button
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (modal) modal.style.display = 'none';

        } else {
            showAlert(result.error || 'Failed to add stock', 'error');
        }

    } catch (error) {
        console.error('Add stock error:', error);
        showAlert('Something went wrong. Please try again.', 'error');

    } finally {
        // Restore button
        addStockBtn.innerHTML = originalText;
        addStockBtn.disabled = false;
    }
}
async function reduceStockFunc() {
    // Check if button exists
    if (!reduceStockBtn) {
        console.error('reduceStockBtn not found');
        return;
    }

    const productsactivityTableBody = document.getElementById('productsactivityTableBody');
    const modal1 = document.getElementById('reduceStockModal');
    const productId = modal1?.dataset.productId;

    console.log("Product ID:", productId);

    const stockQuantities = document.getElementById('stockQuantities')?.value;
    console.log("reduceStock ko quantity", stockQuantities);
    const productPrices = document.getElementById('productPricess')?.value;
    const stockDate = document.getElementById('stockDates')?.value;
    const stockRemarks = document.getElementById('stockRemarkss')?.value || "";

    if (!productId) {
        showAlert('Product ID not found!', 'error');
        // Restore button on error
        reduceStockBtn.innerHTML = originalHTML;
        reduceStockBtn.disabled = originalDisabled;
        return;
    }

    if (!stockQuantities || Number(stockQuantities) <= 0) {
        showAlert('Please enter a valid stock quantity!', 'error');
        document.getElementById('stockQuantities')?.focus();
        return;
    }
    // Store original button state
    const originalHTML = reduceStockBtn.innerHTML;

    // Immediately disable and show loading
    reduceStockBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Reducing...';
    reduceStockBtn.disabled = true;

    try {
        const productData = {
            id: productId,
            stock_to_remove: Number(stockQuantities),
            price: productPrices,
            date: stockDate,
            remarks: stockRemarks
        };

        const response = await fetch(`/dashboard/reduce-stock/${productId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(productData)
        });

        // 🔥 VERY IMPORTANT - Check response status
        if (!response.ok) {
            let errorMsg = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) {
                // Ignore JSON parse error
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            // Update local products array
            if (window.products && result.product) {
                const index = window.products.findIndex(
                    p => p.id === result.product.id
                );

                if (index !== -1) {
                    window.products[index].quantity = result.product.quantity;
                }
            }
            if (!window.activities) {
                window.activities = []
            }
            // Render product quantity above in the detail
            const quantityCell = document.getElementById('quantityCell');
            if (quantityCell) {
                quantityCell.textContent = result.product.quantity;
            }
            // renderDetails(window.products);

            if (result.itemactivity && Array.isArray(result.itemactivity)) {
                // Clear existing table rows if needed
                // productsactivityTableBody.innerHTML = '';

                result.itemactivity.forEach(activity => {
                    console.log("yo itemactivity ko id kati ho??", activity.id);
                    window.activities.unshift(activity)
                    addProductActivityToTable(activity, productsactivityTableBody);
                });
            }

            showAlert(result.message || 'Stock removed successfully!', 'success');
            document.getElementById('stockQuantities').value = '';

            // Show success state on button briefly
            await new Promise(resolve => setTimeout(resolve, 1200));
            if (modal1) {
                modal1.style.display = 'none';
            }

        } else {
            showAlert(result.error || 'Failed to remove stock', 'error');
        }

    } catch (error) {
        console.error('Reduce stock error:', error);
        showAlert(error.message || 'Something went wrong. Please try again.', 'error');

    } finally {
        reduceStockBtn.innerText = originalHTML
        reduceStockBtn.disabled = false;
    }
}

// Product edit/delete functions
export async function editProduct(productId) {
    const product = window.products.find(p => String(p.id) === String(productId));
    const addProductModal = document.getElementById('addProductModal');
    addProductModal.dataset.id = productId
    if (product) {
        // Populate form with product data

        document.getElementById('productName').value = product.name;
        document.getElementById('productCostPrice').value = product.cost_price;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productSellingPrice').value = product.selling_price;
        document.getElementById('productCategory').value = product.categoriy

        // Change modal title and button
        const editProductmodal = document.querySelector('#addProductModal .modal-header h3')
        if (editProductmodal) {
            editProductmodal.textContent = 'Edit Product';
        }
        document.getElementById('saveProductBtn').style.display = 'none';
        document.getElementById('updateProductBtn').style.display = 'flex';
        const quantity = document.querySelector('.productQuantities');
        quantity.style.display = 'none';

        // Show modal

        if (addProductModal) {
            addProductModal.classList.remove('hidden');
        }
    }
}

//update the product
// Save product to database via AJAX
export async function updateProduct(addProductModal) {
    const productId = addProductModal.dataset.id;
    const productName = document.getElementById('productName').value.trim();
    const productCostPrice = document.getElementById('productCostPrice')?.value;
    const productSellingPrice = document.getElementById('productSellingPrice')?.value;
    const productPrice = document.getElementById('productPrice')?.value; // Fallback for old field name
    const productCategory = document.getElementById('productCategory').value.trim();
    const productLowStock = document.getElementById('lowStockQuantity').value || 0;

    // Client-side validation
    if (!productName) {
        showAlert('Please enter product name', 'error');
        document.getElementById('productName').focus();
        return;
    }

    const price = productSellingPrice || productPrice;
    if (!price || parseFloat(price) <= 0 || isNaN(price)) {
        showAlert('Please enter a valid price', 'error');
        const priceInput = document.getElementById('productSellingPrice') || document.getElementById('productPrice');
        if (priceInput) priceInput.focus();
        return;
    }

    // Show loading state
    const updateBtn = document.getElementById('updateProductBtn');
    const originalText = updateBtn.innerHTML;

    updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    updateBtn.disabled = true;

    try {
        // Prepare data for sending
        const productData = {
            id: productId,
            name: productName,
            cost_price: productCostPrice ? parseFloat(productCostPrice) : 0,
            selling_price: parseFloat(productSellingPrice || productPrice),
            category: productCategory,
            lowStock: productLowStock,

        };
        console.log('Updating product:', productData);
        console.log('Updating this data:', productData);

        // Send AJAX request to Django
        const response = await fetch(`/dashboard/update-product/${productId}/`, {
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
            // // Add the new product to the local products array
            if (window.products) {
                const index = window.products.findIndex(p => p.id === result.product.id);

                if (index !== -1) {
                    window.products[index] = result.product
                }
                else {
                    window.products.push(result.product);
                }

            }

            // Update UI
            if (window.loadProducts) {
                window.loadProducts();
            }


            // UPDATE PRODUCT NAME IN LIST 
            const productLi = document.querySelector(
                `.productlists[data-id="${result.product.id}"]`
            );
            if (productLi) {
                productLi.textContent = result.product.name;
            }

            // Update details title
            const productTitle = document.getElementById('productTitle');
            productTitle.innerHTML = result.product.name;

            // Update the single row directly
            const productDetailTableBody = document.getElementById('productDetailTableBody');
            if (productDetailTableBody) {
                let row = productDetailTableBody.querySelector('tr');
                if (!row) {
                    row = document.createElement('tr');
                    productDetailTableBody.appendChild(row);
                }
                row.innerHTML = `
                    <td>${String(result.product.quantity || 0)}</td>
                    <td>$${result.product.selling_price}</td>
                    <td>$${result.product.cost_price}</td>
                    <td>$${(result.product.cost_price * (result.product.quantity || 0)).toFixed(2)}</td>
                `;
            }

            // Show success message
            showAlert(result.message, 'success');

            // Close modal after short delay
            setTimeout(() => {
                const closeProductModalFunc = () => {
                    if (addProductModal) {
                        addProductModal.classList.add('hidden');
                    }
                };
                closeProductModalFunc();

                // Reset form
                document.getElementById('productName').value = '';
                const priceField = document.getElementById('productSellingPrice') || document.getElementById('productPrice');
                if (priceField) priceField.value = '';
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
        updateBtn.innerHTML = originalText;
        updateBtn.disabled = false;
    }

}

// eventlistener for updateProductBtn
document.addEventListener('DOMContentLoaded', function () {
    const updateProductBtn = document.getElementById('updateProductBtn');
    if (updateProductBtn) {
        updateProductBtn.addEventListener('click', () => updateProduct(addProductModal));
    };
});

function showEmptyState() {
    document.querySelector('.empty-state')?.classList.add('active');
    document.querySelector('.not-found')?.classList.add('hidden');
    document.querySelector('.product-selected')?.classList.add('deactivate');
}

function showNotFound() {
    document.querySelector('.empty-state')?.classList.remove('active');
    document.querySelector('.not-found')?.classList.remove('hidden');
    document.querySelector('.product-selected')?.classList.add('deactivate');
}

function showProductDetail() {
    document.querySelector('.empty-state')?.classList.remove('active');
    document.querySelector('.not-found')?.classList.add('hidden');
    document.querySelector('.product-selected')?.classList.remove('deactivate');
}

export function deleteProduct(productId) {
    if (!productId) return;

    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to undo this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/dashboard/delete-product/${productId}/`, {
                method: 'DELETE',
                headers: {
                    'X-CSRFToken': csrfToken,
                    'Content-Type': 'application/json'
                }
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to delete product');
                    return res.json();
                })
                .then(data => {
                    Swal.fire({
                        title: 'Deleted!',
                        text: 'Product has been deleted.',
                        icon: 'success',
                        timer: 1500,  // disappears after 1.5 seconds
                        showConfirmButton: false
                    });

                    // Remove from frontend cache
                    productsCache = productsCache.filter(p => String(p.id) !== String(productId));

                    //remove from url 
                    history.replaceState({}, '', `/dashboard/product-detail/`);
                    renderDetails(productsCache);
                    // Remove from DOM immediately
                    const li = document.querySelector(`.productlists[data-id="${productId}"]`);
                    if (li) li.remove();

                    const row = document.querySelector(`#productsTableBody-${productId}`);
                    if (row) row.remove();
                    

                    // const detailRow = document.querySelector(`.thisDetailRows[data-id="${productId}"]`);
                    // if (detailRow) detailRow.remove();
                    // Update counts
                    updateProductCounts(productsCache.length);
                })
                .catch(err => {
                    console.error(err);
                    alert('Error deleting product. Check console.');
                });
        }
    });
}

// AddStock modal section

const stockdate = document.getElementById('stockDate');
document.addEventListener('DOMContentLoaded', function () {
    if (stockdate) {
        const today = new Date().toISOString().split('T')[0];
        stockdate.value = today;
    }
})
// Close addStockModal
const closeStockModal = document.getElementById('closeStockModal');
const cancelStockBtn = document.getElementById('cancelStockBtn');
const closereduceModal = document.getElementById('closeStockModals');
const cancelStockBtns = document.getElementById('cancelStockBtns');
if (closereduceModal) {
    closereduceModal.addEventListener('click', () => closeModalFunc1(reduceStockModal))
}
if (closeStockModal) {
    closeStockModal.addEventListener('click', () => closeModalFunc(addStockModal));

}

if (cancelStockBtn) {
    cancelStockBtn.addEventListener('click', () => closeModalFunc(addStockModal));

}

if (cancelStockBtns) {
    cancelStockBtns.addEventListener('click', () => closeModalFunc(reduceStockModal));

}
//function to close stockmodal
function closeModalFunc(addStockModal) {
    addStockModal.style.display = 'none';
}

function closeModalFunc1(reduceStockModal) {
    reduceStockModal.style.display = 'none';
}
