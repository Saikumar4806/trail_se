window.setupPaymentModal = function setupPaymentModal(state, checkoutApiUrl) {
  const makePaymentBtn = document.getElementById('makePaymentBtn');
  const paymentModal = document.getElementById('paymentModal');
  const closePaymentModal = document.getElementById('closePaymentModal');
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  const donePaymentBtn = document.getElementById('donePaymentBtn');

  if (!paymentModal) return;

  const openModal = () => {
    paymentModal.style.display = 'flex';
  };

  const closeModal = () => {
    paymentModal.style.display = 'none';
  };

  makePaymentBtn?.addEventListener('click', openModal);
  closePaymentModal?.addEventListener('click', closeModal);
  cancelPaymentBtn?.addEventListener('click', closeModal);

  paymentModal.addEventListener('click', (event) => {
    if (event.target === paymentModal) {
      closeModal();
    }
  });

  donePaymentBtn?.addEventListener('click', async () => {
    const selectedPlan = document.querySelector('.plan-card.active');
    if (!selectedPlan) {
      alert('Please select a plan first.');
      return;
    }

    const selectedSlot = document.querySelector('input[name="deliverySlot"]:checked');
    if (!selectedSlot) {
      alert('Please select a delivery slot.');
      return;
    }

    if (!state.pendingAddress) {
      alert('Please save address details before payment.');
      return;
    }

    if (!state.pendingCombo) {
      alert('Please save your item selection before payment.');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user || !user.id) {
      alert('User not found. Please login again.');
      window.location.href = '../../pages/start/login.html';
      return;
    }

    const planTypeMap = {
      Weekly: 'weekly',
      '1 Month': '1_month',
      '3 Months': '3_months',
      Yearly: 'yearly'
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
      combo: state.pendingCombo
    };

    const originalDoneText = donePaymentBtn.textContent;

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

      alert('Payment completed and subscription created successfully!');
      closeModal();
      window.location.href = './dashboard.html';
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Failed to complete payment. Please try again.');
    } finally {
      donePaymentBtn.textContent = originalDoneText;
      donePaymentBtn.disabled = false;
    }
  });
};
