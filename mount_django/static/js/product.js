// API calls for AJAX/fetch requests
import { showAlert } from './utils.js';
import { openAddProductModal,closeProductModalFunc  } from './events.js';

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

//open modal for add product of product-detail page
document.addEventListener('DOMContentLoaded', () => {
    const addNewProductDetailBtn = document.getElementById('addNewProductDetailBtn');
    const addProductModal = document.getElementById('addProductModal');
    addNewProductDetailBtn.addEventListener('click', () => {
        openAddProductModal(addProductModal);
    });

    // const closeProductModal = document.getElementById('closeProductModal');
    // closeProductModal.addEventListener('click', () => {
    //     closeProductModalFunc(addProductModal)
    // })
    // const cancelProductBtn = document.getElementById('cancelProductBtn');
    // cancelProductBtn.addEventListener('click', () => {
    //     closeProductModalFunc(addProductModal)
    // })
    // const saveProductBtn = document.getElementById('saveProductBtn');
    // saveProductBtn.addEventListener('click', () => {
    //     saveProduct(addProductModal)
    // })
});
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
// Save product to database via AJAX
export async function saveProduct(addProductModal) {
    const productName = document.getElementById('productName').value.trim();
    const productCostPrice = document.getElementById('productCostPrice')?.value;
    const productSellingPrice = document.getElementById('productSellingPrice')?.value;
    const productPrice = document.getElementById('productPrice')?.value; // Fallback for old field name
    const productCategory = document.getElementById('productCategory').value.trim();
    const quantity = document.getElementById('productQuantity').value;
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
        console.log('Server response:', result);
        if (result.success) {
            if (!result.product.uid) {
        console.error("Saved product missing UID:", result.product);
        showAlert("Product saved but UID missing. Please refresh.", "error");
        return;
    }
           // Add product to local cache and render table/list
            productsCache.unshift(result.product);

            renderProducts(); // rebuild table/list from DB
        
            updateProductCounts(productsCache.length);

            // Show success message

            showAlert(result.message, 'success');
            // Close modal after short delay
            setTimeout(() => {
                const closeProductModalFunc = () => {
                    if (addProductModal) {
                        addProductModal.style.display = 'none';
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
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}

export function addProductToTable(product,productsTableBody,index){
    if (!productsTableBody) return;
      const row = document.createElement('tr');
      row.classList.add('thisRows');
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
  }

export function addProductToList(product, productList) {
  if (!productList) return;

  const li = document.createElement('li');
  li.classList.add('productlists');
  li.textContent = product.name;
  li.dataset.id = product.id;
  productList.appendChild(li);

   li.addEventListener('click', () => {
        //for deleting the product,we need product id
        const deleteBtn = document.querySelector('.delete-product-btn'); 
        deleteBtn.dataset.productId = product.id;
        console.log("yo id ho haii",product.uid)

        history.pushState({}, '', `/dashboard/product-detail/${product.uid}`);
        document.querySelectorAll('.productlists').forEach(item =>
        {
            item.classList.remove('selected');
        }
        )
        li.classList.add('selected')
        //immediately update the table
        renderDetails(productsCache);
      });
}
window.addEventListener('popstate',() =>
{
    renderDetails(productsCache);
})


function selectedIdFromUrl(){
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || null; // last part of URL
}
    
//function to get the selected product from URL
function getSelectedProduct(products) {
    const id = selectedIdFromUrl()
    if (!id) return null;

    // assuming product.id is numeric or string matching URL
    return products.find(p => String(p.uid) === id);
}


// ajax to show the product details in page
function renderDetails(products) {
    const productDetailTableBody = document.getElementById('productDetailTableBody');
    const productTitle = document.getElementById('productTitle');
    if (!productDetailTableBody) return;

    productDetailTableBody.innerHTML = '';

    const selectedProduct = getSelectedProduct(products);

    if (!selectedProduct) {
        productDetailTableBody.innerHTML = `
            <tr>
                <td colspan="4">Product not found</td>
            </tr>
        `;
        return;
    }
    //this for product name on top left
    productTitle.textContent= selectedProduct.name;

    //add details of the selected product in productdetail table 
    addDetailToTable(selectedProduct, productDetailTableBody);
}

//add product detail on table
export function addDetailToTable(product,productDetailTableBody){
    if (!productDetailTableBody) return;
      const rows = document.createElement('tr');
    //   rows.classList.add('thisDetailRows');
      rows.dataset.id = product.id;
      rows.innerHTML = `
      <td>${String(product.quantity)}</td>
       <td>$${product.selling_price}</td>
        <td>$${product.cost_price}</td>
        <td>$${product.cost_price*product.quantity}</td> 
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

    products.forEach((product, index) => addProductToTable(product,productsTableBody,index));
  }
  // Render list (only if this page has it)

    if (productList) {
    productList.innerHTML = '';
    products.forEach((product) => addProductToList(product, productList));
    };
    

/*<div class="product-actions">
    <button class="btn btn-primary edit-product-btn" data-id="${product.id}">
        <i class="fas fa-edit"></i> Edit
    </button>
    <button class="btn btn-danger delete-product-btn" data-id="${product.id}">
        <i class="fas fa-trash"></i> Delete
    </button>
    <button class="btn btn-success adjust-stock-btn" data-id="${product.id}">Adjust Stock
    </button>
</div>*/
      

    // Add event listeners to product buttons
    // document.querySelectorAll('.edit-product-btn').forEach(button => {
    //     button.addEventListener('click', function() {
    //         const productId = parseInt(this.getAttribute('data-id'));
    //         editProduct(productId);
    //     });
    // });
   // Get the stored product ID from sessionStorage
   
}

///deleting inside product-detail page
document.addEventListener('DOMContentLoaded', () => {
    const deleteBtn = document.querySelector('.delete-product-btn'); 
    deleteBtn.addEventListener('click', function() {
        const selectedLi = document.querySelector('.productlists.selected');
        const id = selectedLi.dataset.id;
        console.log("Deleting product", id);
        deleteProduct(id);
        });
    });


  document.addEventListener('click', function(e) {
        const addStock = e.target.id === 'addStock';
        if(addStock){
            const addStockModal = document.getElementById('addStockModal');
            if (addStockModal) {
            addStockModal.style.display = 'flex';
        }
        }
        
    })

     document.addEventListener('click', function(e) {
        const reduceStock = e.target.id === 'reduceStock';
        if(reduceStock){
            const reduceStockModal = document.getElementById('reduceStockModal');
            if (reduceStockModal) {
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
            const productId = adjustBtn.dataset.id;
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
if(!addStockBtn){
        console.log("are we here then??")
    } 
else{
    addStockBtn.addEventListener('click',() => addStock(addStockModal));
}      

const reduceStockBtn = document.getElementById('reduceStockBtn');
if(!reduceStockBtn){
        console.log("are we here then??")
    } 
else{
    reduceStockBtn.addEventListener('click',() => reduceStock(reduceStockModal));
} 

async function addStock(addStockModal) {
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
    // const addStockBtn = document.getElementById('addStockBtn');
    // const originalText = addStockBtn.innerHTML;

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
                    p => p.id === result.product.id
                );

                if (index !== -1) {
                    window.products[index].quantity = result.product.quantity;
                }
            }

            // Refresh UI
            if (window.loadProducts) {
                console.log("okay here in loadproduct")
                window.loadProducts();
            }

            showAlert(result.message || 'Stock added successfully!', 'success');

            // Close modal
            setTimeout(() => {
                if (addStockModal) {
                    addStockModal.style.display = 'none';
                }
            }, 1200);

        } else {
            showAlert(result.error || 'Failed to add stock', 'error');
        }

    } catch (error) {
        console.error('Add stock error:', error);
        showAlert('Something went wrong. Please try again.', 'error');

    } finally {
        // Restore button
        // addStockBtn.innerHTML = originalText;
        // addStockBtn.disabled = false;
    }
}

async function reduceStock(reduceStockModal) {
    const modal1 = document.getElementById('reduceStockModal');
    const productId = modal1?.dataset.productId;

    console.log("Product ID:", productId);

    const stockQuantities = document.getElementById('stockQuantities')?.value;
    console.log("reduceStock ko quantity",stockQuantities)
    const productPrices = document.getElementById('productPricess')?.value;
    const stockDate = document.getElementById('stockDates')?.value;
    const stockRemarks = document.getElementById('stockRemarkss')?.value || "";

    if (!productId) {
        showAlert('Product ID not found!', 'error');
        return;
    }

    if (!stockQuantity || Number(stockQuantity) <= 0) {
        showAlert('Please enter a valid stock quantity!', 'error');
        document.getElementById('stockQuantities')?.focus();
        return;
    }

    // Button loading state
    // const addStockBtn = document.getElementById('addStockBtn');
    // const originalText = addStockBtn.innerHTML;

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

        // 🔥 VERY IMPORTANT
        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
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

            // Refresh UI
            if (window.loadProducts) {
                window.loadProducts();
            }

            showAlert(result.message || 'Stock removed successfully!', 'success');

            // Close modal
            setTimeout(() => {
                if (reduceStockModal) {
                    reduceStockModal.style.display = 'none';
                }
            }, 1200);

        } else {
            showAlert(result.error || 'Failed to remove stock', 'error');
        }

    } catch (error) {
        console.error('Add stock error:', error);
        showAlert('Something went wrong. Please try again.', 'error');

    } finally {
        // Restore button
        // addStockBtn.innerHTML = originalText;
        // addStockBtn.disabled = false;
    }
}

// Product edit/delete functions
export async function editProduct(productId) {
    const product = window.products.find(p => p.id === productId);
    const addProductModal = document.getElementById('addProductModal');
    addProductModal.dataset.id = productId
    if (product) {
        // Populate form with product data
        
        document.getElementById('productName').value = product.name;
        document.getElementById('productCostPrice').value = product.cost_price;
        document.getElementById('productQuantity').value = product.quantity;
        document.getElementById('productSellingPrice').value = product.selling_price;
        document.getElementById('productCategory').value = product.category || '';

        // Change modal title and button
        document.querySelector('#addProductModal .modal-header h3').textContent = 'Edit Product';
        document.getElementById('saveProductBtn').style.display = 'none';
        document.getElementById('updateProductBtn').style.display = 'flex';
        const quantity = document.querySelector('.productQuantities');
        quantity.style.display = 'none';

        // Show modal
        
        if (addProductModal) {
            addProductModal.style.display = 'flex';
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
                const index = window.products.findIndex(p  => p.id === result.product.id);
                
                if (index !== -1){
                    window.products[index] = result.product
                }
                else{
                    window.products.push(result.product);
                }
                
            }

            // Update UI
            if (window.loadProducts) {
                window.loadProducts();
            }

            // Show success message
            showAlert(result.message, 'success');

            // Close modal after short delay
            setTimeout(() => {
                const closeProductModalFunc = () => {
                    if (addProductModal) {
                        addProductModal.style.display = 'none';
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
document.addEventListener('DOMContentLoaded', function() {
    const updateProductBtn = document.getElementById('updateProductBtn');
    if(updateProductBtn){
        updateProductBtn.addEventListener('click', () => updateProduct(addProductModal));
    };
});

export function deleteProduct(productId) {
    if (!productId) return;

    if (confirm('Are you sure you want to delete this product?')) {
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
            alert('Product deleted successfully!');
            
            // Remove from frontend cache
            productsCache = productsCache.filter(p => p.id !== productId);

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
}

// AddStock modal section

const stockdate = document.getElementById('stockDate');
document.addEventListener('DOMContentLoaded', function(){
    if(stockdate){
        const today = new Date().toISOString().split('T')[0];
        stockdate.value = today;
    }
})
// Close addStockModal
const closeStockModal = document.getElementById('closeStockModal');
const cancelStockBtn = document.getElementById('cancelStockBtn');
const closereduceModal = document.getElementById('closeStockModals');
const cancelStockBtns = document.getElementById('cancelStockBtns');
if(closereduceModal){
    closereduceModal.addEventListener('click', () => closeModalFunc1(reduceStockModal))
}
if(closeStockModal){
    closeStockModal.addEventListener('click', () => closeModalFunc(addStockModal));
    
}

if(cancelStockBtn){
    cancelStockBtn.addEventListener('click',() => closeModalFunc(addStockModal));
    
}

if(cancelStockBtns){
    cancelStockBtns.addEventListener('click',() => closeModalFunc(reduceStockModal));
    
}
//function to close stockmodal
function closeModalFunc(addStockModal){
    addStockModal.style.display = 'none';
}

function closeModalFunc1(reduceStockModal){
    reduceStockModal.style.display = 'none';
}
