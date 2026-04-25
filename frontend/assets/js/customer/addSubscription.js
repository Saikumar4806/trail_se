const ITEMS_API_URL = 'http://localhost:5000/api/items';
const COMBOS_API_URL = 'http://localhost:5000/api/combos';

document.addEventListener('DOMContentLoaded', function() {
    fetchAndRenderItems();
    setupPlanSelection();
});

// Fetch items from backend API
async function fetchAndRenderItems() {
    const itemsContainer = document.getElementById('itemsContainer');
    if (!itemsContainer) return;
    
    try {
        const response = await fetch(ITEMS_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        const result = await response.json();
        const items = Array.isArray(result) ? result : result.data;

        if (!Array.isArray(items)) {
            throw new Error('Invalid items payload');
        }

        const categories = groupItemsByCategory(items);
        
        // Render categories and items
        renderCategories(categories, itemsContainer);
        
    } catch (error) {
        console.error('Error fetching items:', error);
        itemsContainer.innerHTML = '<p class="error-text">Failed to load items. Please try again later.</p>';
    }
}

function groupItemsByCategory(items) {
    const categories = {};

    items.forEach(item => {
        const rawCategory = (item.category || 'others').toString().trim().toLowerCase();
        const category = rawCategory || 'others';

        if (!categories[category]) {
            categories[category] = [];
        }

        categories[category].push(item);
    });

    return categories;
}

// Render all categories with items
function renderCategories(categories, container) {
    const categoryOrder = ['fruits', 'vegetables', 'dairy', 'nuts'];
    
    let html = '';
    
    for (const categoryName of categoryOrder) {
        const items = categories[categoryName] || [];
        if (items.length === 0) continue;
        
        const capitalizedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
        
        html += `
            <div class="items-category">
                <h3 class="category-title">${capitalizedName}</h3>
                <div class="items-grid">
                    ${items.map(item => createItemCard(item)).join('')}
                </div>
            </div>
        `;
    }

    for (const [categoryName, items] of Object.entries(categories)) {
        if (categoryOrder.includes(categoryName) || items.length === 0) continue;

        const capitalizedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

        html += `
            <div class="items-category">
                <h3 class="category-title">${capitalizedName}</h3>
                <div class="items-grid">
                    ${items.map(item => createItemCard(item)).join('')}
                </div>
            </div>
        `;
    }
    
    if (html) {
        container.innerHTML = html;
        setupQuantityControls();
        setupItemImageFallbacks();
    } else {
        container.innerHTML = '<p class="no-items-text">No items available at the moment.</p>';
    }
}

// Create HTML for individual item card
function createItemCard(item) {
    const imageMarkup = buildItemImageMarkup(item);
    
    return `
        <div class="item-card" data-item-id="${item.id}">
            <div class="item-image-wrapper">${imageMarkup}</div>
            <h4 class="item-name">${item.name}</h4>
            <p class="item-price">₹${item.price} / ${item.unit || item.quantity_unit || 'unit'}</p>
            <div class="quantity-control">
                <button class="qty-btn minus-btn" data-item-id="${item.id}">−</button>
                <span class="quantity" id="qty-${item.id}">0</span>
                <button class="qty-btn plus-btn" data-item-id="${item.id}">+</button>
            </div>
        </div>
    `;
}

function buildItemImageMarkup(item) {
    const imageUrl = typeof item.image_url === 'string' ? item.image_url.trim() : '';
    if (!imageUrl) {
        return '<div class="item-image-missing">No image</div>';
    }

    const safeSrc = escapeHtmlAttribute(imageUrl);
    const safeAlt = escapeHtmlAttribute(item.name || 'Item image');
    return `<img class="item-image" src="${safeSrc}" alt="${safeAlt}" loading="lazy">`;
}

function escapeHtmlAttribute(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function setupItemImageFallbacks() {
    const images = document.querySelectorAll('.item-image');
    images.forEach((img) => {
        img.addEventListener('error', () => {
            const wrapper = img.closest('.item-image-wrapper');
            if (wrapper) {
                wrapper.innerHTML = '<div class="item-image-missing">No image</div>';
            }
        }, { once: true });
    });
}

// Setup event listeners for quantity controls
function setupQuantityControls() {
    const minusButtons = document.querySelectorAll('.qty-btn.minus-btn');
    const plusButtons = document.querySelectorAll('.qty-btn.plus-btn');
    
    minusButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            decrementQuantity(itemId);
        });
    });
    
    plusButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const itemId = this.getAttribute('data-item-id');
            incrementQuantity(itemId);
        });
    });
}

// Increment quantity for item
function incrementQuantity(itemId) {
    const quantitySpan = document.getElementById(`qty-${itemId}`);
    let quantity = parseInt(quantitySpan.textContent) || 0;
    quantity++;
    quantitySpan.textContent = quantity;
    updateItemSelection();
}

// Decrement quantity for item
function decrementQuantity(itemId) {
    const quantitySpan = document.getElementById(`qty-${itemId}`);
    let quantity = parseInt(quantitySpan.textContent) || 0;
    if (quantity > 0) {
        quantity--;
        quantitySpan.textContent = quantity;
        updateItemSelection();
    }
}

// Setup plan selection
function setupPlanSelection() {
    const planCards = document.querySelectorAll('.plan-card');
    const planSelectBtns = document.querySelectorAll('.plan-select-btn');
    
    planSelectBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove selected class from all cards
            planCards.forEach(card => card.classList.remove('selected', 'active'));
            
            // Add selected class to clicked card's parent
            const selectedCard = btn.closest('.plan-card');
            selectedCard.classList.add('selected', 'active');
            
            // Get the plan name
            const planName = selectedCard.querySelector('.plan-name').textContent;
            
            // Show the selected plan display
            const selectedPlanDisplay = document.getElementById('selectedPlanDisplay');
            const selectedPlanName = document.getElementById('selectedPlanName');
            if (selectedPlanDisplay && selectedPlanName) {
                selectedPlanName.textContent = planName;
                selectedPlanDisplay.style.display = 'block';
            }
            
            // Change button text to show it's selected
            btn.textContent = 'Selected';
            
            // Reset other buttons
            planSelectBtns.forEach((button) => {
                if (button !== btn) {
                    button.textContent = 'Choose Plan';
                }
            });
        });
    });
}

// Update item selection state (for tracking selected items)
function updateItemSelection() {
    const selectedItems = [];
    const itemCards = document.querySelectorAll('.item-card');
    
    itemCards.forEach(card => {
        const itemId = card.getAttribute('data-item-id');
        const quantitySpan = card.querySelector('.quantity');
        const quantity = parseInt(quantitySpan.textContent) || 0;
        
        if (quantity > 0) {
            selectedItems.push({
                itemId: itemId,
                quantity: quantity
            });
        }
    });
    
    console.log('Selected items:', selectedItems);
}

async function saveComboName(userId, comboName) {
    const response = await fetch(COMBOS_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            user_id: userId,
            name: comboName
        })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to save combo name');
    }

    return result.data;
}

// Handle "Add Address" button
document.addEventListener('DOMContentLoaded', function() {
    const addAddressBtn = document.getElementById('addAddressBtn');
    if (addAddressBtn) {
        addAddressBtn.addEventListener('click', function() {
            alert('Address selection feature coming soon!');
        });
    }
});

// Handle "Make Payment" button
document.addEventListener('DOMContentLoaded', function() {
    const makePaymentBtn = document.getElementById('makePaymentBtn');
    if (makePaymentBtn) {
        makePaymentBtn.addEventListener('click', async function() {
            const selectedPlan = document.querySelector('.plan-card.active');
            if (!selectedPlan) {
                alert('Please select a plan first!');
                return;
            }

            const comboNameInput = document.getElementById('comboName');
            const comboName = comboNameInput ? comboNameInput.value.trim() : '';

            if (!comboName) {
                alert('Please enter a combo name in the items section.');
                if (comboNameInput) comboNameInput.focus();
                return;
            }

            const user = JSON.parse(localStorage.getItem('user') || 'null');
            const userId = user && user.id;

            if (!userId) {
                alert('User not found. Please login again.');
                window.location.href = '../../pages/start/login.html';
                return;
            }
            
            const selectedItems = [];
            const itemCards = document.querySelectorAll('.item-card');
            
            itemCards.forEach(card => {
                const itemId = card.getAttribute('data-item-id');
                const quantitySpan = card.querySelector('.quantity');
                const quantity = parseInt(quantitySpan.textContent) || 0;
                
                if (quantity > 0) {
                    selectedItems.push({
                        itemId: itemId,
                        quantity: quantity
                    });
                }
            });
            
            if (selectedItems.length === 0) {
                alert('Please add at least one item to your subscription!');
                return;
            }

            try {
                await saveComboName(userId, comboName);

                const planName = selectedPlan.getAttribute('data-plan');
                console.log('Proceeding with payment:', {
                    plan: planName,
                    comboName,
                    items: selectedItems
                });

                alert(`Combo "${comboName}" saved. Proceeding with ${planName} plan and ${selectedItems.length} items!`);
            } catch (error) {
                console.error('Error saving combo:', error);
                alert('Failed to save combo name. Please try again.');
            }
        });
    }
});
