// Constants and configuration
const COMMODITIES = {
    onion: {
        name: "Onion",
        factors: [
            "Seasonal rainfall patterns",
            "Transportation costs and fuel prices",
            "Export/Import policies",
            "Storage infrastructure availability",
            "Disease outbreaks affecting crops"
        ],
        basePrice: 2500, // ₹ per quintal
        volatility: 22
    },
    potato: {
        name: "Potato",
        factors: [
            "Cold storage capacity utilization",
            "Production volume in key growing regions",
            "Processing industry demand",
            "Price of substitute vegetables",
            "Weather conditions during harvest"
        ],
        basePrice: 1800,
        volatility: 15
    },
    gram: {
        name: "Gram (Chickpea)",
        factors: [
            "MSP announcements",
            "Government procurement levels",
            "Import duties and quotas",
            "Rainfall during growing season",
            "International prices and export demand"
        ],
        basePrice: 5200,
        volatility: 18
    },
    tur: {
        name: "Tur (Pigeon Pea)",
        factors: [
            "Buffer stock levels",
            "Government import policies",
            "Rainfall distribution during critical growth phases",
            "Area under cultivation",
            "Market arrivals timing"
        ],
        basePrice: 6800,
        volatility: 20
    },
    urad: {
        name: "Urad (Black Gram)",
        factors: [
            "Production estimates",
            "Stock-to-use ratio",
            "Myanmar import volumes",
            "Domestic consumption patterns",
            "Planting decisions for upcoming season"
        ],
        basePrice: 7100,
        volatility: 25
    },
    moong: {
        name: "Moong (Green Gram)",
        factors: [
            "Buffer stock operations",
            "Rainfall in major producing states",
            "International price movements",
            "Festive season demand",
            "Alternative crop pricing"
        ],
        basePrice: 7400,
        volatility: 23
    },
    masur: {
        name: "Masur (Red Lentil)",
        factors: [
            "Canadian production estimates",
            "Import policy changes",
            "Exchange rate fluctuations",
            "Global stockpile levels",
            "Consumer preference shifts"
        ],
        basePrice: 5900,
        volatility: 19
    }
};

// Market center adjustment factors (relative to national average)
const MARKET_CENTERS = {
    all: { name: "National Average", factor: 1.0 },
    delhi: { name: "Delhi", factor: 1.12 },
    mumbai: { name: "Mumbai", factor: 1.15 },
    chennai: { name: "Chennai", factor: 1.08 },
    kolkata: { name: "Kolkata", factor: 1.05 },
    bangalore: { name: "Bangalore", factor: 1.10 }
};

// Model accuracy levels
const MODEL_ACCURACY = {
    arima: 0.86,
    lstm: 0.91,
    randomforest: 0.89,
    ensemble: 0.94
};

// DOM Elements
const commoditySelect = document.getElementById('commodity-select');
const timePeriodSelect = document.getElementById('time-period');
const marketCenterSelect = document.getElementById('market-center');
const predictionDaysSelect = document.getElementById('prediction-days');
const predictBtn = document.getElementById('predict-btn');
const priceChart = document.getElementById('price-chart');
const currentPriceEl = document.getElementById('current-price');
const avgPriceEl = document.getElementById('avg-price');
const volatilityEl = document.getElementById('volatility');
const accuracyEl = document.getElementById('accuracy');
const factorsListEl = document.getElementById('factors-list');
const marketInsightsEl = document.getElementById('market-insights');
const loadingOverlay = document.getElementById('loading-overlay');

// Chart instance
let chart;

// Initialize the application
function initApp() {
    // Set up event listeners
    predictBtn.addEventListener('click', generatePrediction);
    commoditySelect.addEventListener('change', updateCommodityInfo);
    
    // Initialize commodity info
    updateCommodityInfo();
    
    // Initialize empty chart
    createChart([]);
}

// Update commodity information when selection changes
function updateCommodityInfo() {
    const selectedCommodity = commoditySelect.value;
    const commodity = COMMODITIES[selectedCommodity];
    
    // Update factors list
    let factorsHTML = '<ul>';
    commodity.factors.forEach(factor => {
        factorsHTML += `<li>${factor}</li>`;
    });
    factorsHTML += '</ul>';
    factorsListEl.innerHTML = factorsHTML;
}

// Create or update the price chart
function createChart(data) {
    const ctx = priceChart.getContext('2d');
    
    // Destroy existing chart if it exists
    if (chart) {
        chart.destroy();
    }
    
    // Create new chart
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [
                {
                    label: 'Historical Price',
                    data: data.historical || [],
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    borderWidth: 2,
                    pointRadius: 3,
                    fill: true,
                    tension: 0.2
                },
                {
                    label: 'Predicted Price',
                    data: data.predicted || [],
                    borderColor: '#f8a100',
                    backgroundColor: 'rgba(248, 161, 0, 0.1)',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 3,
                    fill: true,
                    tension: 0.2
                }
            ]
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
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ₹${context.raw} per quintal`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Price (₹ per quintal)'
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

// Generate price data based on selected parameters
function generatePriceData() {
    const selectedCommodity = commoditySelect.value;
    const days = parseInt(timePeriodSelect.value);
    const predictionDays = parseInt(predictionDaysSelect.value);
    const marketCenter = marketCenterSelect.value;
    
    const commodity = COMMODITIES[selectedCommodity];
    const center = MARKET_CENTERS[marketCenter];
    
    // Generate labels (dates)
    const labels = [];
    const currentDate = new Date();
    
    // Historical dates
    for (let i = days; i > 0; i--) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        labels.push(formatDate(date));
    }
    
    // Current date
    labels.push(formatDate(currentDate));
    
    // Future dates
    for (let i = 1; i <= predictionDays; i++) {
        const date = new Date();
        date.setDate(currentDate.getDate() + i);
        labels.push(formatDate(date));
    }
    
    // Generate historical price data with realistic fluctuations
    const basePrice = commodity.basePrice * center.factor;
    const volatilityFactor = commodity.volatility / 100;
    
    // Create seasonal pattern (sine wave with 180-day period)
    const seasonalPattern = (day) => {
        return Math.sin((day / 180) * Math.PI) * 0.15;
    };
    
    // Create trend pattern (slight upward trend)
    const trendPattern = (day) => {
        return day * 0.0003;
    };
    
    // Historical data with combined patterns
    const historical = [];
    for (let i = 0; i < days + 1; i++) {
        const dayOfYear = getDayOfYear(new Date(currentDate.getTime() - (days - i) * 86400000));
        const seasonal = seasonalPattern(dayOfYear);
        const trend = trendPattern(i);
        const random = (Math.random() - 0.5) * volatilityFactor;
        
        const price = basePrice * (1 + seasonal + trend + random);
        historical.push(Math.round(price));
    }
    
    // Generate predicted data based on selected model
    const selectedModel = document.querySelector('input[name="model"]:checked').value;
    const modelAccuracy = MODEL_ACCURACY[selectedModel];
    
    // Predicted data
    const predicted = new Array(days + 1).fill(null); // Pad with nulls for historical period
    
    // Last historical price
    const lastPrice = historical[historical.length - 1];
    
    // Generate future predictions
    for (let i = 1; i <= predictionDays; i++) {
        const dayOfYear = getDayOfYear(new Date(currentDate.getTime() + i * 86400000));
        const seasonal = seasonalPattern(dayOfYear);
        const trend = trendPattern(days + i);
        
        // Random fluctuation gets smaller with more accurate models
        const randomFactor = (1 - modelAccuracy) * 2;
        const random = (Math.random() - 0.5) * volatilityFactor * randomFactor;
        
        const price = basePrice * (1 + seasonal + trend + random);
        predicted.push(Math.round(price));
    }
    
    return {
        labels,
        historical,
        predicted,
        current: historical[historical.length - 1],
        average: Math.round(historical.reduce((acc, val) => acc + val, 0) / historical.length)
    };
}

// Generate and display prediction
function generatePrediction() {
    // Show loading overlay
    loadingOverlay.classList.remove('hidden');
    
    // Simulate processing delay
    setTimeout(() => {
        // Get selected options
        const selectedCommodity = commoditySelect.value;
        const commodity = COMMODITIES[selectedCommodity];
        const selectedModel = document.querySelector('input[name="model"]:checked').value;
        const modelAccuracy = MODEL_ACCURACY[selectedModel];
        const marketCenter = MARKET_CENTERS[marketCenterSelect.value].name;
        
        // Generate data
        const data = generatePriceData();
        
        // Update chart
        createChart(data);
        
        // Update stats
        currentPriceEl.textContent = `₹${data.current} per quintal`;
        avgPriceEl.textContent = `₹${data.average} per quintal`;
        volatilityEl.textContent = `${commodity.volatility}%`;
        accuracyEl.textContent = `${Math.round(modelAccuracy * 100)}%`;
        
        // Generate market insights
        const priceTrend = data.current > data.average ? 'above' : 'below';
        const trendPercentage = Math.round(Math.abs(data.current - data.average) / data.average * 100);
        
        const futurePrediction = data.predicted[data.predicted.length - 1];
        const priceDirection = futurePrediction > data.current ? 'increase' : 'decrease';
        const changePercentage = Math.round(Math.abs(futurePrediction - data.current) / data.current * 100);
        
        let riskLevel, recommendation;
        if (commodity.volatility > 20 && changePercentage > 10) {
            riskLevel = 'high';
            recommendation = priceDirection === 'increase' ? 
                'Consider releasing buffer stocks to stabilize prices.' : 
                'Monitor closely but no immediate intervention needed.';
        } else if (commodity.volatility > 15 || changePercentage > 5) {
            riskLevel = 'moderate';
            recommendation = 'Regular monitoring recommended.';
        } else {
            riskLevel = 'low';
            recommendation = 'Market appears stable, no intervention needed.';
        }
        
        marketInsightsEl.innerHTML = `
            <p>Current ${commodity.name} prices in ${marketCenter} are <strong>${priceTrend} average</strong> by ${trendPercentage}%.</p>
            <p>The ${selectedModel.toUpperCase()} model predicts prices will <strong>${priceDirection} by ${changePercentage}%</strong> in the coming period.</p>
            <p>Price volatility risk: <strong>${riskLevel.toUpperCase()}</strong></p>
            <p><strong>Recommendation:</strong> ${recommendation}</p>
        `;
        
        // Hide loading overlay
        loadingOverlay.classList.add('hidden');
    }, 1500);
}

// Helper function to format date as DD MMM
function formatDate(date) {
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'short' });
    return `${day} ${month}`;
}

// Helper function to get day of year (0-365)
function getDayOfYear(date) {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date - start;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);