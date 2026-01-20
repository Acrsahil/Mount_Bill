// tabs.js - FIXED VERSION with /dashboard/ prefix
export function setupTabs() {
    console.log('Setting up tabs with /dashboard/ prefix...');
    
    // ALL URLs must start with /dashboard/
    const tabs = {
        'dashboard': '/dashboard/',           // This is your actual dashboard URL
        'invoices': '/dashboard/invoices/',   // Actual: /dashboard/invoices/
        'products': '/dashboard/products/',   // Actual: /dashboard/products/
        'clients': '/dashboard/clients/',     // Actual: /dashboard/clients/
        'expenses': '/dashboard/expenses/',
        'reports': '/dashboard/reports/',     // Add if you have this
        'settings': '/dashboard/settings/'    // Add if you have this
    };
    
    console.log('Tab URLs (with /dashboard/ prefix):', tabs);
    
    // Setup click events for all tabs
    Object.keys(tabs).forEach(tabName => {
        const tab = document.querySelector(`[data-tab="${tabName}"]`);
        if (tab) {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const url = tabs[tabName];
                console.log(`Tab "${tabName}" clicked, navigating to: ${url}`);
                
                // Navigate to the correct URL with /dashboard/ prefix
                window.location.href = url;
            });
        }
    });
    
    // Highlight current tab based on current URL
    highlightCurrentTab(tabs);
}

function highlightCurrentTab(tabs) {
    const currentPath = window.location.pathname;
    console.log('Current URL path:', currentPath);
    
    // Find which tab matches current URL
    let activeTab = 'dashboard';
    
    for (const [tabName, url] of Object.entries(tabs)) {
        if (currentPath === url) {
            activeTab = tabName;
            console.log(`Matched tab: ${tabName} with URL: ${url}`);
            break;
        }
    }
    
    console.log('Active tab determined:', activeTab);
    updateTabUI(activeTab);
}

function updateTabUI(activeTabName) {
    console.log('Updating UI to show tab:', activeTabName);
    
    // Update menu items
    document.querySelectorAll('[data-tab]').forEach(tab => {
        const isActive = tab.dataset.tab === activeTabName;
        tab.classList.toggle('active', isActive);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        let shouldBeActive = false;
        
        // Handle invoices-tab special case
        if (activeTabName === 'invoices' && content.id === 'invoices-tab') {
            shouldBeActive = true;
        }
        // Handle other tabs
        else if (content.id === activeTabName) {
            shouldBeActive = true;
        }
        
        content.classList.toggle('active', shouldBeActive);
    });
    
    // Update page title
    updatePageTitle(activeTabName);
}

function updatePageTitle(tabName) {
    const titles = {
        'dashboard': 'Dashboard',
        'invoices': 'Invoices',
        'products': 'Products',
        'clients': 'Clients',
        'expenses': 'Expenses',
        'reports': 'Reports',
        'settings': 'Settings'
    };
    document.title = `${titles[tabName] || 'Dashboard'} - InvoicePro`;
}
