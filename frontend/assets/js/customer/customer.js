const ITEMS_API_URL = 'http://localhost:5000/api/items';
const CHECKOUT_API_URL = 'http://localhost:5000/api/checkout/complete';

const state = {
  itemsById: {},
  selected: {},
  pendingAddress: null,
  pendingCombo: null
};

document.addEventListener('DOMContentLoaded', () => {
  setupStaticActions();
  setupPlanSelection();
  setupCartToggle();
  setupSaveSelection();
  fetchAndRenderItems();
});

function setupStaticActions() {
  const cancelBtn = document.querySelector('.cancel-page-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.location.href = './dashboard.html';
    });
  }

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('user');
      window.location.href = '../../pages/start/login.html';
    });
  }

  if (typeof window.setupAddressModal === 'function') {
    window.setupAddressModal(state);
  }

  if (typeof window.setupPaymentModal === 'function') {
    window.setupPaymentModal(state, CHECKOUT_API_URL);
  }
}

function setupPlanSelection() {
  const planCards = document.querySelectorAll('.plan-card');
  const planSelectBtns = document.querySelectorAll('.plan-select-btn');

  planSelectBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      planCards.forEach(card => card.classList.remove('selected', 'active'));

      const selectedCard = btn.closest('.plan-card');
      selectedCard.classList.add('selected', 'active');

      const planName = selectedCard.querySelector('.plan-name').textContent;
      const selectedPlanDisplay = document.getElementById('selectedPlanDisplay');
      const selectedPlanName = document.getElementById('selectedPlanName');
      if (selectedPlanDisplay && selectedPlanName) {
        selectedPlanName.textContent = planName;
        selectedPlanDisplay.style.display = 'block';
      }

      btn.textContent = 'Selected';
      planSelectBtns.forEach((button) => {
        if (button !== btn) {
          button.textContent = 'Choose Plan';
        }
      });
    });
  });
}

function setupCartToggle() {
  const cartBtn = document.getElementById('cartBtn');
  const cartDropdown = document.getElementById('cartDropdown');

  if (!cartBtn || !cartDropdown) return;

  cartBtn.addEventListener('click', () => {
    cartDropdown.style.display = cartDropdown.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.cart-wrapper')) {
      cartDropdown.style.display = 'none';
    }
  });
}

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

    items.forEach((item) => {
      state.itemsById[String(item.id)] = item;
    });

    const grouped = groupItemsByCategory(items);
    renderCategories(grouped, itemsContainer);
    updateCart();
  } catch (error) {
    console.error('Error fetching items:', error);
    itemsContainer.innerHTML = '<p class="error-text">Failed to load items. Please try again later.</p>';
  }
}

function groupItemsByCategory(items) {
  const categories = {};

  items.forEach((item) => {
    const rawCategory = (item.category || 'others').toString().trim().toLowerCase();
    if (!categories[rawCategory]) {
      categories[rawCategory] = [];
    }
    categories[rawCategory].push(item);
  });

  return categories;
}

function renderCategories(categories, container) {
  const categoryEmojis = {
    fruits: '🍎',
    vegetables: '🥦',
    dairy: '🥛',
    nuts: '🥜'
  };
  const categoryOrder = ['fruits', 'vegetables', 'dairy', 'nuts'];

  let html = '';

  for (const categoryName of categoryOrder) {
    const items = categories[categoryName] || [];
    if (items.length === 0) continue;

    const emoji = categoryEmojis[categoryName] || '•';
    const capitalizedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1);

    html += `
      <div class="items-category">
        <h3 class="category-title">${emoji} ${capitalizedName}</h3>
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
        <h3 class="category-title">• ${capitalizedName}</h3>
        <div class="items-grid">
          ${items.map(item => createItemCard(item)).join('')}
        </div>
      </div>
    `;
  }

  if (!html) {
    container.innerHTML = '<p class="no-items-text">No items available at the moment.</p>';
    return;
  }

  container.innerHTML = html;
  setupQuantityControls();
}

function createItemCard(item) {
  const itemId = String(item.id);
  const emojiMap = {
    Fruits: '🍎',
    Vegetables: '🥦',
    Dairy: '🥛',
    Nuts: '🥜'
  };
  const normalizedCategory = (item.category || '').toString().trim().toLowerCase();
  const categoryKey = normalizedCategory.charAt(0).toUpperCase() + normalizedCategory.slice(1);
  const emoji = emojiMap[categoryKey] || '📦';

  return `
    <div class="item-card" data-item-id="${itemId}">
      <div class="item-image-placeholder">${emoji}</div>
      <h4 class="item-name">${item.name}</h4>
      <p class="item-price">₹${item.price} / ${item.unit || item.quantity_unit || 'unit'}</p>
      <div class="quantity-control">
        <button class="qty-btn minus-btn" data-item-id="${itemId}" type="button">-</button>
        <span class="quantity" id="qty-${itemId}">${state.selected[itemId] || 0}</span>
        <button class="qty-btn plus-btn" data-item-id="${itemId}" type="button">+</button>
      </div>
    </div>
  `;
}

function setupQuantityControls() {
  const minusButtons = document.querySelectorAll('.qty-btn.minus-btn');
  const plusButtons = document.querySelectorAll('.qty-btn.plus-btn');

  minusButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      changeQuantity(btn.getAttribute('data-item-id'), -1);
    });
  });

  plusButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      changeQuantity(btn.getAttribute('data-item-id'), 1);
    });
  });
}

function changeQuantity(itemId, delta) {
  const current = state.selected[itemId] || 0;
  const next = Math.max(0, current + delta);

  if (next === 0) {
    delete state.selected[itemId];
  } else {
    state.selected[itemId] = next;
  }

  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (qtyEl) {
    qtyEl.textContent = String(next);
  }

  updateCart();
}

function getSelectedItemsPayload() {
  return Object.entries(state.selected).map(([itemId, quantity]) => {
    const item = state.itemsById[itemId];
    return {
      item_id: Number(itemId),
      price: Number(item.price),
      quantity: Number(quantity)
    };
  }).filter((entry) => entry.quantity > 0);
}

function getCartTotalAmount() {
  return Object.entries(state.selected).reduce((sum, [itemId, quantity]) => {
    const item = state.itemsById[itemId];
    const price = Number(item?.price) || 0;
    const qty = Number(quantity) || 0;
    return sum + (price * qty);
  }, 0);
}

function updateCart() {
  const cartItemsContainer = document.getElementById('cartItems');
  const cartGrandTotal = document.getElementById('cartGrandTotal');
  const cartCount = document.getElementById('cartCount');

  if (!cartItemsContainer || !cartGrandTotal || !cartCount) return;

  const selectedEntries = Object.entries(state.selected);
  const totalItems = selectedEntries.reduce((sum, [, qty]) => sum + qty, 0);

  cartCount.textContent = String(totalItems);

  if (selectedEntries.length === 0) {
    cartItemsContainer.innerHTML = '<p class="cart-empty">No items selected.</p>';
    cartGrandTotal.textContent = 'Rs 0.00';
    return;
  }

  let grandTotal = 0;

  const html = selectedEntries.map(([itemId, quantity]) => {
    const item = state.itemsById[itemId];
    if (!item) return '';

    const unitPrice = Number(item.price) || 0;
    const lineTotal = unitPrice * quantity;
    grandTotal += lineTotal;

    return `
      <div class="cart-item">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-meta">Rs ${unitPrice.toFixed(2)} / ${item.unit || item.quantity_unit || 'unit'}</p>
        <p class="cart-item-meta">Qty: ${quantity}</p>
        <p class="cart-item-total">Total: Rs ${lineTotal.toFixed(2)}</p>
      </div>
    `;
  }).join('');

  cartItemsContainer.innerHTML = html;
  cartGrandTotal.textContent = `Rs ${grandTotal.toFixed(2)}`;
}

function setupSaveSelection() {
  const saveSelectionBtn = document.getElementById('saveSelectionBtn');
  if (!saveSelectionBtn) return;

  saveSelectionBtn.addEventListener('click', async () => {
    const selectedPlan = document.querySelector('.plan-card.active');
    if (!selectedPlan) {
      alert('Please select a plan first!');
      return;
    }

    const items = getSelectedItemsPayload();
    if (items.length === 0) {
      alert('Please select at least one item.');
      return;
    }

    const comboNameInput = document.getElementById('comboName');
    const comboName = comboNameInput ? comboNameInput.value.trim() : '';
    if (!comboName) {
      alert('Please enter combo name.');
      if (comboNameInput) comboNameInput.focus();
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.id) {
      alert('User not found. Please login again.');
      window.location.href = '../../pages/start/login.html';
      return;
    }

    try {
      const totalAmount = getCartTotalAmount();
      state.pendingCombo = {
        combo_name: comboName,
        items,
        total_amount: Number(totalAmount.toFixed(2))
      };
      alert('Selection saved for checkout. It will be added after payment is completed.');
    } catch (error) {
      console.error('Save selection error:', error);
      alert('Failed to save selection details. Please try again.');
    }
  });
}
