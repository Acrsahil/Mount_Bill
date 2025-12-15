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

