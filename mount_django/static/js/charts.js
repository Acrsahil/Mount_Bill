// charts.js - Chart.js implementation for InvoicePro

document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts when DOM is loaded
    if (document.getElementById('dashboard').classList.contains('active')) {
        initializeCharts();
    }
});

function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
    if (revenueCtx) {
        window.revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Revenue',
                    data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Expenses',
                    data: [8000, 12000, 10000, 15000, 13000, 18000, 16000],
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Invoice Status Chart (Doughnut)
    const invoiceStatusCtx = document.getElementById('invoiceStatusChart')?.getContext('2d');
    if (invoiceStatusCtx) {
        window.invoiceStatusChart = new Chart(invoiceStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Overdue'],
                datasets: [{
                    data: [85, 12, 3],
                    backgroundColor: [
                        '#43e97b',
                        '#ffc107',
                        '#f5576c'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: '70%'
            }
        });
    }

    // Top Products Chart (Horizontal Bar)
    const topProductsCtx = document.getElementById('topProductsChart')?.getContext('2d');
    if (topProductsCtx) {
        window.topProductsChart = new Chart(topProductsCtx, {
            type: 'bar',
            data: {
                labels: ['MacBook Pro', 'iPhone 14', 'Headphones', 'Keyboard', 'Monitor'],
                datasets: [{
                    label: 'Revenue',
                    data: [12450, 8720, 3240, 1890, 1560],
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.8)',
                        'rgba(245, 87, 108, 0.8)',
                        'rgba(79, 172, 254, 0.8)',
                        'rgba(67, 233, 123, 0.8)',
                        'rgba(255, 193, 7, 0.8)'
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Client Growth Chart (Line)
    const clientGrowthCtx = document.getElementById('clientGrowthChart')?.getContext('2d');
    if (clientGrowthCtx) {
        window.clientGrowthChart = new Chart(clientGrowthCtx, {
            type: 'line',
            data: {
                labels: ['Q1', 'Q2', 'Q3', 'Q4'],
                datasets: [{
                    label: 'New Clients',
                    data: [120, 145, 162, 189],
                    borderColor: '#38f9d7',
                    backgroundColor: 'rgba(56, 249, 215, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Chart type switcher for revenue chart
    const chartTypeSelect = document.getElementById('revenueChartType');
    if (chartTypeSelect && window.revenueChart) {
        chartTypeSelect.addEventListener('change', function() {
            window.revenueChart.config.type = this.value;
            window.revenueChart.update();
        });
    }
}

// Export chart data function
function exportChartData(chartId) {
    const chart = window[chartId];
    if (!chart) return;
    
    const data = chart.data;
    const csvContent = "data:text/csv;charset=utf-8," 
        + data.labels.join(",") + "\n"
        + data.datasets.map(dataset => dataset.data.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${chartId}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Update chart with real data
function updateChartWithData(chartId, newData) {
    const chart = window[chartId];
    if (!chart) return;
    
    chart.data = newData;
    chart.update();
}

// Listen for tab changes to initialize charts
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', function() {
        const tab = this.getAttribute('data-tab');
        if (tab === 'dashboard') {
            // Small delay to ensure DOM is ready
            setTimeout(initializeCharts, 100);
        }
    });
});

// Auto-refresh charts every minute
setInterval(() => {
    if (document.getElementById('dashboard').classList.contains('active')) {
        // You can add auto-refresh logic here
        console.log('Refreshing charts...');
    }
}, 60000);