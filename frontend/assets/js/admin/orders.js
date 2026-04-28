const ORDERS_BY_DATE_API_URL = "http://localhost:5000/api/admin/orders/by-date";

let allOrders = [];

const formatDate = (dateStr) => {
	if (!dateStr) return "N/A";
	const date = new Date(dateStr);
	if (Number.isNaN(date.getTime())) return "N/A";
	return date.toLocaleDateString("en-IN", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const formatSlot = (slot) => {
	if (!slot) return "N/A";
	return slot.charAt(0).toUpperCase() + slot.slice(1);
};

const formatPrice = (price) => `Rs. ${Number(price || 0).toFixed(2)}`;

const getStatusDisplay = (status) => {
	const statusMap = {
		out_for_delivery: "Out for Delivery",
		delivered: "Delivered",
	};
	return statusMap[status] || status || "N/A";
};

const renderOrders = (orders) => {
	const tableBody = document.getElementById("ordersTableBody");
	const noOrdersMessage = document.getElementById("noOrdersMessage");

	if (!orders || orders.length === 0) {
		tableBody.innerHTML = "";
		noOrdersMessage.style.display = "block";
		return;
	}

	noOrdersMessage.style.display = "none";

	tableBody.innerHTML = orders
		.map(
			(order) => `
			<tr>
				<td><strong>#${order.order_id}</strong></td>
				<td>#${order.subscription_id}</td>
				<td>#${order.customer_id}</td>
				<td>#${order.address_id}</td>
				<td>${formatDate(order.order_date)}</td>
				<td>${formatDate(order.delivery_date)}</td>
				<td>${formatSlot(order.delivery_slot)}</td>
				<td>${formatPrice(order.total_amount)}</td>
				<td><span class="status-badge ${order.status}">${getStatusDisplay(order.status)}</span></td>
				<td><button class="view-btn" onclick="viewOrderDetails(${order.order_id})">View</button></td>
			</tr>
		`
		)
		.join("");
};

function viewOrderDetails(orderId) {
	const order = allOrders.find((o) => o.order_id === orderId);
	if (!order) return;

	alert(
		`Order #${order.order_id}\nCustomer: #${order.customer_id}\nOrder Date: ${formatDate(order.order_date)}\nDelivery Date: ${formatDate(order.delivery_date)}\nAmount: ${formatPrice(order.total_amount)}\nStatus: ${getStatusDisplay(order.status)}`
	);
}

const getTodayLocalDate = () => {
	const now = new Date();
	const offset = now.getTimezoneOffset() * 60000;
	return new Date(now.getTime() - offset).toISOString().split("T")[0];
};

const fetchOrdersByDate = async (dateValue) => {
	const response = await fetch(`${ORDERS_BY_DATE_API_URL}?date=${encodeURIComponent(dateValue)}`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	const result = await response.json();
	if (!response.ok || !result.success) {
		throw new Error(result.message || "Failed to fetch orders");
	}

	return Array.isArray(result.data) ? result.data : [];
};

document.addEventListener("DOMContentLoaded", async () => {
	const user = JSON.parse(sessionStorage.getItem("user"));
	const normalizedRole = user && user.role
		? String(user.role).toLowerCase().replace(/ /g, "_")
		: null;

	if (!user || normalizedRole !== "admin") {
		alert("Unauthorized access. Please login as an Admin.");
		window.location.href = "../../pages/start/login.html";
		return;
	}

	document.getElementById("welcomeText").textContent = `Admin Orders - ${user.name}`;

	const orderDateInput = document.getElementById("orderDate");
	const loadOrdersBtn = document.getElementById("loadOrdersBtn");
	const ordersMessage = document.getElementById("ordersMessage");

	orderDateInput.value = getTodayLocalDate();

	const loadOrders = async () => {
		const selectedDate = String(orderDateInput.value || "").trim();
		if (!selectedDate) {
			ordersMessage.textContent = "Please select a date.";
			return;
		}

		const originalText = loadOrdersBtn.textContent;
		loadOrdersBtn.disabled = true;
		loadOrdersBtn.textContent = "Loading...";
		ordersMessage.textContent = "";

		try {
			allOrders = await fetchOrdersByDate(selectedDate);
			renderOrders(allOrders);
			ordersMessage.textContent = `Showing ${allOrders.length} order(s) for ${formatDate(selectedDate)}.`;
		} catch (error) {
			console.error("Fetch orders by date error:", error);
			allOrders = [];
			renderOrders(allOrders);
			ordersMessage.textContent = error.message || "Failed to load orders.";
		} finally {
			loadOrdersBtn.disabled = false;
			loadOrdersBtn.textContent = originalText;
		}
	};

	loadOrdersBtn.addEventListener("click", loadOrders);
	await loadOrders();

	// ─── Generate Routes ───
	const generateRoutesBtn = document.getElementById("generateRoutesBtn");
	if (generateRoutesBtn) {
		generateRoutesBtn.addEventListener("click", async () => {
			const selectedDate = String(orderDateInput.value || "").trim();
			const slot = document.getElementById("routeSlot").value;

			if (!selectedDate) {
				ordersMessage.textContent = "Please select a date first.";
				return;
			}

			generateRoutesBtn.disabled = true;
			generateRoutesBtn.textContent = "⏳ Generating...";
			ordersMessage.textContent = "";

			try {
				const res = await fetch("http://localhost:5000/api/admin/generate-routes", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ date: selectedDate, slot }),
				});
				const result = await res.json();

				const routeResultDiv = document.getElementById("routeResult");

				if (!result.success) {
					ordersMessage.textContent = result.message || "Failed to generate routes.";
					routeResultDiv.style.display = "none";
					return;
				}

				const assignments = result.data || [];
				if (assignments.length === 0) {
					ordersMessage.textContent = result.message || "No routes generated.";
					routeResultDiv.style.display = "none";
					return;
				}

				ordersMessage.textContent = `✅ ${result.message} (${assignments.length} partners assigned)`;

				routeResultDiv.style.display = "block";
				routeResultDiv.innerHTML = `
					<h4>📍 Route Assignments</h4>
					${assignments.map(a => `
						<div class="assignment-card">
							<strong>🚚 ${a.partner_name}</strong>
							<span class="badge">${a.total_orders} orders</span>
							<ul>
								${a.route.map((r, i) => `<li><b>Stop ${i + 1}:</b> Order #${r.order_id} — ${r.customer_name} — ${r.address}</li>`).join("")}
							</ul>
						</div>
					`).join("")}
				`;

				// Reload orders to show updated partner_id
				allOrders = await fetchOrdersByDate(selectedDate);
				renderOrders(allOrders);
			} catch (error) {
				console.error("Generate routes error:", error);
				ordersMessage.textContent = "Network error generating routes.";
			} finally {
				generateRoutesBtn.disabled = false;
				generateRoutesBtn.textContent = "🚚 Generate Routes";
			}
		});
	}

	document.getElementById("logoutBtn").addEventListener("click", () => {
		sessionStorage.removeItem("user");
		window.location.href = "../../pages/start/login.html";
	});
});

