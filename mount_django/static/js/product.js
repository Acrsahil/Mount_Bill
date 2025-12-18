// API calls for AJAX/fetch requests
import { showAlert } from './utils.js';

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
                'X-CSRFToken': window.djangoData.csrfToken,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(productData)
        });

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            // Add the new product to the local products array
            if (window.products) {
                window.products.push(result.product);
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
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
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
    <div>Product Qty: ${product.quantity}</div>
</div>
<div class="product-actions">
    <button class="btn btn-primary edit-product-btn" data-id="${product.id}">
        <i class="fas fa-edit"></i> Edit
    </button>
    <button class="btn btn-danger delete-product-btn" data-id="${product.id}">
        <i class="fas fa-trash"></i> Delete
    </button>
    <button class="btn btn-success adjust-stock-btn" data-id="${product.id}">Adjust Stock
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
     document.addEventListener('click', function(e) {
        const addStock = e.target.id === 'addStock';
        if(addStock){
            const addStockModal = document.getElementById('addStockModal');
            if (addStockModal) {
            addStockModal.style.display = 'flex';
        }
        }
        
    })
}

//for add and reduce stock btn
document.addEventListener('DOMContentLoaded', function () {
    const popup = document.getElementById('addStockPopup');
    if (!popup) return;

    let currentProductId = null; // track which product popup is open for

    document.addEventListener('click', function (e) {
        const adjustBtn = e.target.closest('.adjust-stock-btn');

        if (adjustBtn) {
            const productId = adjustBtn.dataset.id;
            
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

// Product edit/delete functions
export function editProduct(productId) {
    const product = window.products.find(p => p.id === productId);
    if (product) {
        //store id 
        document.getElementById("productId").value = product.id;
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
        const addProductModal = document.getElementById('addProductModal');
        if (addProductModal) {
            addProductModal.style.display = 'flex';
        }
    }
}

// eventlistener for updateProductBtn
document.addEventListener('DOMContentLoaded', function() {
    const updateProductBtn = document.getElementById('updateProductBtn');
    if(updateProductBtn){
        updateProductBtn.addEventListener('click', () => updateProduct(addProductModal));
    };
});


// Save product to database via AJAX
export async function updateProduct(addProductModal) {
    const productId = document.getElementById('productId').value;
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
            quantity: quantity,
        };
        console.log('Updating product:', productData);
        console.log('Updating this data:', productData);

        // Send AJAX request to Django
        const response = await fetch('/dashboard/update-product/', {
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