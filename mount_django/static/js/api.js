// API calls for AJAX/fetch requests
import { showAlert } from './utils.js';
import { loadInvoices, clearClientDetails } from './dom.js';
import { closeInvoiceModalFunc } from './events.js';
import { renderInvoiceItems } from './dom.js';
import { updateTotals } from './utils.js';

// Save complete invoice to database
export async function saveInvoice(createInvoiceModal, invoiceItemsBody) {
    console.log('🔍 saveInvoice function called');
    
    const clientName = document.getElementById('clientName').value.trim();
    const invoiceDate = document.getElementById('invoiceDate').value;
    const discount = parseFloat(document.getElementById('globalDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('globalTax').value) || 0;

    console.log('📋 Form data:', { 
        clientName, 
        invoiceDate, 
        globalDiscount: discount, 
        globalTax: tax,
        itemsCount: window.invoiceItems.length,
        items: window.invoiceItems
    });

    // Validation
    if (!clientName) {
        showAlert('Please enter client name', 'error');
        document.getElementById('clientName').focus();
        return;
    }

    if (window.invoiceItems.length === 0) {
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
            items: window.invoiceItems.map(item => ({
                productName: item.productName || '',
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.price || 0
            })),
            globalDiscount: discount,
            globalTax: tax
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
                
                // Update invoices array (this will be handled by main.js state management)
                if (window.invoices) {
                    window.invoices.unshift(newInvoice);
                    const invoicesTableBody = document.getElementById('invoicesTableBody');
                    if (invoicesTableBody) {
                        loadInvoices(window.invoices, invoicesTableBody);
                    }
                }
            }
            
            // Close modal after short delay
            setTimeout(() => {
                closeInvoiceModalFunc(createInvoiceModal);
                
                // Reset form
                clearClientDetails();
                
                // Clear invoice items
                window.invoiceItems = [];
                renderInvoiceItems(window.invoiceItems, invoiceItemsBody, () => {}, () => {}, () => {});
                updateTotals(window.invoiceItems, 0, 0);
                
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

// Save product to database via AJAX
export async function saveProduct(addProductModal) {
    const productName = document.getElementById('productName').value.trim();
    const productCostPrice = document.getElementById('productCostPrice')?.value;
    const productSellingPrice = document.getElementById('productSellingPrice')?.value;
    const productPrice = document.getElementById('productPrice')?.value; // Fallback for old field name
    const productCategory = document.getElementById('productCategory').value.trim();
    const productQuantity = document.getElementById('productQuantity').value;

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
            quantity: parseInt(productQuantity, 10) || 0,
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

