window.setupPaymentModal = function setupPaymentModal(state, checkoutApiUrl) {
    const makePaymentBtn = document.getElementById('makePaymentBtn');
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    const donePaymentBtn = document.getElementById('donePaymentBtn');
    const paymentTabs = document.querySelectorAll('.payment-tab-btn');
    const paymentForms = document.querySelectorAll('.payment-form');
    const cardNumber = document.getElementById('cardNumber');
    const expiryDate = document.getElementById('expiryDate');
    const cvv = document.getElementById('cvv');

    if (!paymentModal) return;

    let currentPaymentMethod = 'card';

    // ============================================
    // MODAL OPEN/CLOSE FUNCTIONALITY
    // ============================================
    const openModal = () => {
        paymentModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        updateOrderSummary();
    };

    const closeModal = () => {
        paymentModal.classList.remove('show');
        document.body.style.overflow = 'auto';
        resetForm();
    };

    makePaymentBtn?.addEventListener('click', openModal);
    closePaymentModal?.addEventListener('click', closeModal);
    cancelPaymentBtn?.addEventListener('click', closeModal);

    paymentModal.addEventListener('click', (event) => {
        if (event.target === paymentModal) {
            closeModal();
        }
    });

    // ============================================
    // PAYMENT METHOD SWITCHING
    // ============================================
    paymentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const method = tab.getAttribute('data-method');
            currentPaymentMethod = method;

            // Update active tab
            paymentTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update active form
            paymentForms.forEach(form => form.classList.remove('active'));
            const formId = method === 'card' ? 'cardPaymentForm' : 'upiPaymentForm';
            document.getElementById(formId).classList.add('active');
        });
    });

    // ============================================
    // CARD NUMBER FORMATTING
    // ============================================
    cardNumber?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = value.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = formattedValue;

        // Detect card type
        detectCardType(value);
    });

    const detectCardType = (cardNum) => {
        const cardTypeEl = document.getElementById('cardType');
        if (!cardTypeEl) return;

        const firstDigit = cardNum.charAt(0);
        
        if (firstDigit === '4') {
            cardTypeEl.textContent = '💳 Visa';
        } else if (firstDigit === '5') {
            cardTypeEl.textContent = '💳 Mastercard';
        } else if (firstDigit === '3') {
            cardTypeEl.textContent = '💳 Amex';
        } else {
            cardTypeEl.textContent = '💳';
        }
    };

    // ============================================
    // EXPIRY DATE FORMATTING (MM/YY)
    // ============================================
    expiryDate?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
    });

    // ============================================
    // CVV INPUT (NUMBERS ONLY)
    // ============================================
    cvv?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // ============================================
    // ORDER SUMMARY UPDATE
    // ============================================
    const updateOrderSummary = () => {
        // Get selected plan
        const selectedPlan = document.querySelector('.plan-card.active');
        const planLabel = selectedPlan?.getAttribute('data-plan') || 'Weekly';
        document.getElementById('summaryPlan').textContent = planLabel;

        // Get selected slot
        const selectedSlot = document.querySelector('input[name="deliverySlot"]:checked');
        const slotLabel = selectedSlot?.parentElement?.textContent?.trim() || '-';
        document.getElementById('summarySlot').textContent = slotLabel;

        // Get items
        if (state.pendingCombo && state.pendingCombo.items) {
            const itemNames = state.pendingCombo.items
                .map(item => `${item.name} (${item.quantity})`)
                .join(', ');
            document.getElementById('summaryItems').textContent = itemNames || '-';
        } else {
            document.getElementById('summaryItems').textContent = '-';
        }

        // Get address
        if (state.pendingAddress) {
            const addr = state.pendingAddress;
            const addressStr = `${addr.street}, ${addr.city} ${addr.pincode}`;
            document.getElementById('summaryAddress').textContent = addressStr;
        } else {
            document.getElementById('summaryAddress').textContent = '-';
        }

        // Calculate and display total
        const total = calculateTotal();
        document.getElementById('summaryTotal').textContent = `₹${total.toFixed(2)}`;
        document.getElementById('paymentAmount').textContent = `₹${total.toFixed(2)}`;
    };

    // ============================================
    // CALCULATE TOTAL AMOUNT
    // ============================================
    const calculateTotal = () => {
        let total = 0;

        // Add combo price
        if (state.pendingCombo && state.pendingCombo.price) {
            total += state.pendingCombo.price;
        }

        // Add delivery charges (demo: ₹50)
        const selectedSlot = document.querySelector('input[name="deliverySlot"]:checked');
        if (selectedSlot) {
            total += 50;
        }

        // Add plan-based charges (demo rates)
        const selectedPlan = document.querySelector('.plan-card.active');
        const planLabel = selectedPlan?.getAttribute('data-plan') || 'Weekly';
        const planCharges = {
            'Weekly': 200,
            '1 Month': 800,
            '3 Months': 2200,
            'Yearly': 8000
        };
        total += planCharges[planLabel] || 0;

        return total;
    };

    // ============================================
    // FORM VALIDATION
    // ============================================
    const validateCardForm = () => {
        const cardholderName = document.getElementById('cardholderName').value.trim();
        const cardNum = document.getElementById('cardNumber').value.replace(/\s/g, '');
        const expiry = document.getElementById('expiryDate').value;
        const cvvVal = document.getElementById('cvv').value;

        let errors = [];

        if (!cardholderName) {
            errors.push('Cardholder name is required');
        }

        if (cardNum.length !== 16) {
            errors.push('Card number must be 16 digits');
        }

        if (!expiry || expiry.length !== 5 || !expiry.includes('/')) {
            errors.push('Expiry date must be in MM/YY format');
        } else {
            const [month, year] = expiry.split('/');
            if (parseInt(month) > 12 || parseInt(month) < 1) {
                errors.push('Invalid expiry month');
            }
        }

        if (cvvVal.length < 3 || cvvVal.length > 4) {
            errors.push('CVV must be 3-4 digits');
        }

        return { isValid: errors.length === 0, errors };
    };

    const validateUpiForm = () => {
        const upiId = document.getElementById('upiId').value.trim();
        let errors = [];

        if (!upiId) {
            errors.push('UPI ID is required');
        } else if (!upiId.includes('@')) {
            errors.push('Invalid UPI ID format');
        }

        return { isValid: errors.length === 0, errors };
    };

    // ============================================
    // COMPLETE PAYMENT
    // ============================================
    donePaymentBtn?.addEventListener('click', async () => {
        const selectedPlan = document.querySelector('.plan-card.active');
        if (!selectedPlan) {
            showAlert('error', 'Please select a plan first.');
            return;
        }

        const selectedSlot = document.querySelector('input[name="deliverySlot"]:checked');
        if (!selectedSlot) {
            showAlert('error', 'Please select a delivery slot.');
            return;
        }

        if (!state.pendingAddress) {
            showAlert('error', 'Please save address details before payment.');
            return;
        }

        if (!state.pendingCombo) {
            showAlert('error', 'Please save your item selection before payment.');
            return;
        }

        // Validate payment form
        let validation;
        if (currentPaymentMethod === 'card') {
            validation = validateCardForm();
        } else {
            validation = validateUpiForm();
        }

        if (!validation.isValid) {
            showAlert('error', validation.errors.join('\n'));
            return;
        }

        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        if (!user || !user.id) {
            showAlert('error', 'User not found. Please login again.');
            window.location.href = '../../pages/start/login.html';
            return;
        }

        const planTypeMap = {
            'Weekly': 'weekly',
            '1 Month': '1_month',
            '3 Months': '3_months',
            'Yearly': 'yearly'
        };

        const planLabel = selectedPlan.getAttribute('data-plan') || '';
        const planType = planTypeMap[planLabel] || 'weekly';
        const startDate = new Date().toISOString().slice(0, 10);

        const checkoutPayload = {
            user_id: Number(user.id),
            plan_type: planType,
            delivery_slot: selectedSlot.value,
            start_date: startDate,
            address: state.pendingAddress,
            combo: state.pendingCombo,
            payment_method: currentPaymentMethod,
            payment_details: currentPaymentMethod === 'card' 
                ? { last_four: document.getElementById('cardNumber').value.slice(-4) }
                : { upi_id: document.getElementById('upiId').value }
        };

        const originalDoneText = donePaymentBtn.innerHTML;

        try {
            donePaymentBtn.textContent = 'Processing...';
            donePaymentBtn.disabled = true;

            const response = await fetch(checkoutApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(checkoutPayload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to complete checkout');
            }

            showAlert('success', 'Payment completed successfully! Subscription created.');
            setTimeout(() => {
                closeModal();
                window.location.href = './dashboard.html';
            }, 1500);
        } catch (error) {
            console.error('Checkout error:', error);
            showAlert('error', error.message || 'Failed to complete payment. Please try again.');
        } finally {
            donePaymentBtn.innerHTML = originalDoneText;
            donePaymentBtn.disabled = false;
        }
    });

    // ============================================
    // ALERT HELPER
    // ============================================
    const showAlert = (type, message) => {
        // Demo: Using browser alert. In production, use a toast notification library
        if (type === 'error') {
            alert('❌ Error:\n' + message);
        } else if (type === 'success') {
            alert('✅ Success:\n' + message);
        }
    };

    // ============================================
    // RESET FORM
    // ============================================
    const resetForm = () => {
        document.getElementById('cardForm')?.reset();
        document.getElementById('upiForm')?.reset();
    };

    // ============================================
    // HANDLE KEYBOARD EVENTS
    // ============================================
    paymentModal?.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
};

// ============================================
// AUTO-INITIALIZE (if modal exists on page load)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal && !window.paymentModalInitialized) {
        window.paymentModalInitialized = true;
        // Payment modal setup will be called by the parent page
    }
});

