// Main entry point - orchestrates all modules
import {  updateStats, updateClientStats,updateKPI } from './utils.js';
import { fetchTransactionForDashboard } from './dashboard.js';
import { 
    loadInvoices, 
    loadClients, 
    filterInvoices, 
    filterProducts, 
    filterClients,
    
    clearClientDetails
} from './dom.js';
import { setupClientSearch,setupProductSearchHandlersForPage, } from './create_invoice.js';
import { 
    setupEventListeners,

    setupProductNameSearch,
    setupCategorySearch,
    addInvoiceItem,
    
    handleItemUpdate,
    handleRemoveItem,
} from './events.js';
import { editProduct,deleteProduct,loadProducts } from './product.js';
import { setupTabs } from './tabs.js';

// ULTRA SAFE INITIALIZATION
console.log('Bill.js loading...');

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

// Initialize data from Django
const invoices = Array.isArray(window.djangoData.invoices) ? window.djangoData.invoices : [];
const products = Array.isArray(window.djangoData.products) ? window.djangoData.products : [];
const productCategories = Array.isArray(window.djangoData.product_cat) ? window.djangoData.product_cat : [];
let clients = Array.isArray(window.djangoData.clients) ? window.djangoData.clients : [];
const csrfToken = window.djangoData.csrfToken || "";

// Make these available globally for API functions
window.invoices = invoices;
window.products = products;
window.csrfToken = csrfToken; // Make csrfToken available globally

// State management - using window object for shared mutable state
window.invoiceItems = [];
window.nextInvoiceNumber = 4;
window.nextClientId = clients.length > 0 ? Math.max(...clients.map(c => c.id || 0)) + 1 : 1;
window.nextProductId = products.length > 0 ? Math.max(...products.map(p => p.id || 0)) + 1 : 1;
window.globalDiscount = 0;
window.globalTax = 0;
window.clients = clients;
window.productCategories = productCategories;

console.log('✅ Data loaded successfully:');
console.log('Products count:', products.length);
console.log('Product Categories count:', productCategories.length);
console.log('Clients count:', clients.length);
console.log('CSRF Token present:', !!csrfToken);

// DOM Elements
const createInvoiceBtn = document.getElementById('createInvoiceBtn');
const createInvoiceBtnTab = document.getElementById('createInvoiceBtnTab');
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
// const productList = document.getElementById('productList');
const invoicesTableBody = document.getElementById('invoicesTableBody');
const clientsTableBody = document.getElementById('clientsTableBody');
const productsTableBody = document.getElementById('productsTableBody');
const searchInput = document.getElementById('searchInput');
const productSearchInput = document.getElementById('productSearchInput');
const clientSearchInput = document.getElementById('clientSearchInput');
const invoiceNumber = document.getElementById('invoiceNumber');
const invoiceDate = document.getElementById('invoiceDate');
const globalDiscountInput = document.getElementById('globalDiscount');
const globalTaxInput = document.getElementById('globalTax');
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');
const addClientBtn = document.getElementById('addClientBtn');

// Wrapper functions for edit/delete product
function editProductWrapper(productId) {
    editProduct(productId);
}

function deleteProductWrapper(productId) {
    deleteProduct(productId);
}

// Make loadProducts available globally
window.loadProducts = function() {
    loadProducts(products,productsTableBody, editProductWrapper, deleteProductWrapper);
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    
    // Setup tabs first
    setupTabs();
    // Set today's date as default if invoiceDate exists
    if (invoiceDate) {
        const today = new Date().toISOString().split('T')[0];
        invoiceDate.value = today;
    }

    // Load initial data only if the elements exist
    if (invoicesTableBody) {
        loadInvoices(invoices, invoicesTableBody, csrfToken);
    } else {
        console.warn('invoicesTableBody not found, skipping invoice loading');
    }
    
    if (productsTableBody) {
        loadProducts(products, productsTableBody, editProductWrapper, deleteProductWrapper);
    } else {
        console.warn('productsTableBody not found, skipping product loading');
    }
    
    if (clientsTableBody) {
        loadClients(clients, clientsTableBody);
    } else {
        console.warn('clientsTableBody not found, skipping client loading');
    }
    fetchTransactionForDashboard()


    // Set up event listeners if all required elements exist
    setupEventListeners(
        createInvoiceBtn,
        addProductBtn,
        addNewProductBtn,
        addClientBtn,
        closeInvoiceModal,
        closeProductModal,
        closeClientModal,
        cancelInvoiceBtn,
        cancelProductBtn,
        cancelClientBtn,
        saveInvoiceBtn,
        saveProductBtn,
        saveClientBtn,
        addItemBtn,
        searchInput,
        productSearchInput,
        clientSearchInput,
        globalDiscountInput,
        globalTaxInput,
        menuItems,
        tabContents,
        invoiceItemsBody,
        productsTableBody,
        invoicesTableBody,
        clientsTableBody,
        invoiceNumber,
        invoiceDate,
        createInvoiceModal,
        addProductModal,
        addClientModal
    );
    
    // Add event listener for createInvoiceBtnTab to navigate to full page
    if (createInvoiceBtnTab) {
        createInvoiceBtnTab.addEventListener('click', () => {
            console.log("why am i not here??")
            window.location.href = '/dashboard/create-invoice/';
        });
    }

    // Setup search functionality
    if (document.getElementById('clientName')) {
        setupClientSearch();
    }
    
    if (document.getElementById('productName')) {
        setupProductNameSearch();
    }
    
    if (document.getElementById('productCategory')) {
        setupCategorySearch();
    }
    
    // Initialize stats if needed
    try {
        
        updateKPI()
        updateStats(invoices);
        updateClientStats(clients);
    } catch (error) {
        console.warn('Could not update stats:', error);
    }
    
    console.log('✅ App initialized successfully');
});
