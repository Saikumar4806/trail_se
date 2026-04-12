const API_URL = "http://localhost:5000/api/dashboard/admin";

document.addEventListener("DOMContentLoaded", async () => {
  const user = JSON.parse(localStorage.getItem("user"));

  const normalizedRole = user && user.role
    ? String(user.role).toLowerCase().replace(/ /g, "_")
    : null;

  if (!user || normalizedRole !== "admin") {
    alert("Unauthorized access. Please login as an Admin.");
    window.location.href = "../../pages/start/login.html";
    return;
  }

  // Set welcome text (if it exists on this page)
  const welcomeText = document.getElementById("welcomeText");
  if (welcomeText) {
    // Check if we're on dashboard vs items page
    if (window.location.pathname.includes('dashboard.html')) {
        welcomeText.textContent = `Admin Dashboard - ${user.name}`;
    }
  }

  // --- Item Management Logic (Only runs on items.html) ---
  const itemForm = document.getElementById("itemForm");
  
  if (itemForm) {
      const ITEMS_API_URL = "http://localhost:5000/api/items";
      const itemsTableBody = document.getElementById("itemsTableBody");
      const itemIdInput = document.getElementById("itemId");
      const saveItemBtn = document.getElementById("saveItemBtn");
      const cancelEditBtn = document.getElementById("cancelEditBtn");
      const formMessage = document.getElementById("itemFormMessage");
      const itemUnitValueInput = document.getElementById("itemUnitValue");
      const itemUnitTypeInput = document.getElementById("itemUnitType");
      const itemQuantityUnitInput = document.getElementById("itemQuantityUnit");
    
      // Fetch and display all items
      const fetchItems = async () => {
        try {
          const response = await fetch(ITEMS_API_URL);
          const result = await response.json();
          
          if (response.ok && result.success) {
            renderItems(result.data);
          } else {
            itemsTableBody.innerHTML = '<tr><td colspan="8" class="text-center error-msg">Failed to load items.</td></tr>';
          }
        } catch (err) {
          console.error("Error fetching items:", err);
          itemsTableBody.innerHTML = '<tr><td colspan="8" class="text-center error-msg">Cannot connect to server.</td></tr>';
        }
      };
    
      // Render items in the table
      const renderItems = (items) => {
        if (items.length === 0) {
          itemsTableBody.innerHTML = '<tr><td colspan="8" class="text-center">No items found.</td></tr>';
          return;
        }
    
        itemsTableBody.innerHTML = items.map(item => `
          <tr>
            <td>${item.id}</td>
            <td>${item.name}</td>
            <td>${item.category || '-'}</td>
            <td>$${Number(item.price).toFixed(2)}</td>
            <td>${item.unit || '-'}</td>
            <td>${item.quantity}</td>
            <td>${item.quantity_unit || '-'}</td>
            <td>
              <button class="btn-edit btn-sm" onclick="editItem(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${String(item.unit || '').replace(/'/g, "\\'")}', '${item.category || ''}', ${item.quantity}, '${String(item.quantity_unit || '').replace(/'/g, "\\'")}', '${String(item.image_url || '').replace(/'/g, "\\'")}')">Edit</button>
              <button class="btn-danger btn-sm" onclick="deleteItem(${item.id})">Delete</button>
            </td>
          </tr>
        `).join('');
      };
    
      // Handle form submission (Create or Update)
      itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const id = itemIdInput.value;
        const isEditing = !!id;
        const url = isEditing ? `${ITEMS_API_URL}/${id}` : ITEMS_API_URL;
        const method = isEditing ? "PUT" : "POST";
        const composedUnit = itemUnitValueInput.value && itemUnitTypeInput.value
          ? `${itemUnitValueInput.value} ${itemUnitTypeInput.value}`
          : "";
        
        const itemData = {
          name: document.getElementById("itemName").value,
          price: document.getElementById("itemPrice").value,
          unit: composedUnit,
          category: document.getElementById("itemCategory").value,
          quantity: document.getElementById("itemQuantity").value,
          quantity_unit: itemQuantityUnitInput.value,
          image_url: document.getElementById("itemImage").value
        };
    
        try {
          const response = await fetch(url, {
            method: method,
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(itemData)
          });
    
          const result = await response.json();
    
          if (response.ok && result.success) {
            showMessage(result.message, "success-msg");
            itemForm.reset();
            resetFormState();
            fetchItems(); // Refresh list
          } else {
            showMessage(result.message || "Failed to save item.", "error-msg");
          }
        } catch (err) {
          console.error("Error saving item:", err);
          showMessage("Cannot connect to server.", "error-msg");
        }
      });
    
      // Global edit function to populate form
      window.editItem = (id, name, price, unit, category, quantity, quantityUnit, imageUrl) => {
        itemIdInput.value = id;
        document.getElementById("itemName").value = name;
        document.getElementById("itemPrice").value = price;
        const normalizedUnit = unit && unit !== "null" ? String(unit).trim() : "";
        const unitMatch = normalizedUnit.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        if (unitMatch) {
          itemUnitValueInput.value = unitMatch[1];
          itemUnitTypeInput.value = unitMatch[2].toLowerCase();
        } else {
          itemUnitValueInput.value = "";
          itemUnitTypeInput.value = "";
        }
        document.getElementById("itemCategory").value = category !== 'null' ? category : '';
        document.getElementById("itemQuantity").value = quantity;
        itemQuantityUnitInput.value = quantityUnit !== 'null' ? quantityUnit : '';
        document.getElementById("itemImage").value = imageUrl !== 'null' ? imageUrl : '';
        
        saveItemBtn.textContent = "Update Item";
        cancelEditBtn.style.display = "inline-block";
        
        // Scroll to form
        itemForm.scrollIntoView({ behavior: 'smooth' });
      };
    
      // Global delete function
      window.deleteItem = async (id) => {
        if (!confirm("Are you sure you want to delete this item?")) return;
    
        try {
          const response = await fetch(`${ITEMS_API_URL}/${id}`, {
            method: "DELETE"
          });
    
          const result = await response.json();
    
          if (response.ok && result.success) {
            fetchItems(); // Refresh list
            
            // If the deleted item was being edited, reset form
            if (itemIdInput.value == id) {
              resetFormState();
            }
          } else {
            alert(result.message || "Failed to delete item.");
          }
        } catch (err) {
          console.error("Error deleting item:", err);
          alert("Cannot connect to server.");
        }
      };
    
      // Cancel edit mode
      cancelEditBtn.addEventListener("click", resetFormState);
    
      function resetFormState() {
        itemForm.reset();
        itemIdInput.value = "";
        saveItemBtn.textContent = "Save Item";
        cancelEditBtn.style.display = "none";
        formMessage.textContent = "";
        formMessage.className = "form-message";
      }
    
      function showMessage(msg, className) {
        formMessage.textContent = msg;
        formMessage.className = `form-message ${className}`;
        setTimeout(() => {
          formMessage.textContent = "";
          formMessage.className = "form-message";
        }, 3000);
      }
    
      // Initial fetch
      fetchItems();
  }

  // Logout Logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("user");
        window.location.href = "../../pages/start/login.html";
      });
  }
});
