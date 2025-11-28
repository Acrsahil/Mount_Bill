// Main entry point - orchestrates all modules
import { updateTotals, updateStats, updateClientStats } from './utils.js';
import { 
    loadInvoices, 
    loadProducts, 
    loadClients, 
    filterInvoices, 
    filterProducts, 
    filterClients,
    renderInvoiceItems,
    clearClientDetails
} from './dom.js';
import { 
    setupEventListeners,
    setupClientSearch,
    setupProductNameSearch,
    setupCategorySearch,
    openCreateInvoiceModal,
    closeInvoiceModalFunc,
    closeProductModalFunc,
    closeClientModalFunc,
    addInvoiceItem,
    setupProductSearchHandlers,
    handleItemUpdate,
    handleRemoveItem,
    editProduct,
    deleteProduct
} from './events.js';

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

// Make these available globally for API functions
window.invoices = invoices;
window.products = products;

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
const globalDiscountInput = document.getElementById('globalDiscount');
const globalTaxInput = document.getElementById('globalTax');
const menuItems = document.querySelectorAll('.menu-item');
const tabContents = document.querySelectorAll('.tab-content');
const addClientBtn = document.getElementById('addClientBtn');

// Wrapper functions for edit/delete product

// Add this modal functionality to your main.js

// Modal functionality

// Call this function when your main.js loads

function editProductWrapper(productId) {
    editProduct(productId);
}

function deleteProductWrapper(productId) {
    deleteProduct(productId);
}

// Make loadProducts available globally
window.loadProducts = function() {
    loadProducts(products, productList, editProductWrapper, deleteProductWrapper);
};

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    if (invoiceDate) invoiceDate.value = today;

    // Load initial data
    loadInvoices(invoices, invoicesTableBody);
    loadProducts(products, productList, editProductWrapper, deleteProductWrapper);
    loadClients(clients, clientsTableBody);

    // Set up event listeners
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
        productList,
        invoicesTableBody,
        clientsTableBody,
        invoiceNumber,
        invoiceDate,
        createInvoiceModal,
        addProductModal,
        addClientModal
    );

    // Setup client search functionality
    setupClientSearch();

    // Setup product name search functionality
    setupProductNameSearch();

    // Setup category search functionality
    setupCategorySearch();

    // Debug: Check if products loaded correctly
    console.log('Database products loaded:', products);
    console.log('Product categories loaded:', productCategories);
    console.log('Clients loaded:', clients);
    
    // Initialize stats
    updateStats(invoices);
    updateClientStats(clients);
});
