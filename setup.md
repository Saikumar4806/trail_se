# Project Setup Guide (Sprint 1)

Follow these steps to successfully spin up the Web-Based Subscription Delivery System on your local computer.

## 1. Database Setup
We have already automatically handled the database creation. The `subscription_db` and its `users` table are now initialized in your local MySQL instance.

If you ever need to recreate them in the future or start fresh, you can run the initialization script from the backend folder:
```bash
cd backend
node db_init.js
```

## 2. Start the Backend Server
The backend handles the routing, database queries, and secure JWT token generation.

1. Open your terminal in VS Code.
2. Navigate into the `backend` folder:
   ```bash
   cd backend
   ```
3. Start the server:
   ```bash
   npm run test
   ```
4. You will see a message: **"Server started on port 5000"**. Keep this terminal running in the background.

## 3. Run the Frontend 
The frontend uses standard HTML, CSS, and JS. Due to browser security with API requests across different domain ports, it must be run on a local development server, rather than double-clicking the raw HTML files.

1. In VS Code, navigate to `frontend/pages/start/login.html`.
2. Right-click anywhere in the file editor window and select **"Open with Live Server"**. (If you don't have the Live Server extension by Ritwick Dey, install it from the VS Code Extensions tab).
3. A local webpage will instantly pop up in your browser.

## 4. Test the System! (Sprint 1 Complete)
1. **Register**: Click the registration link and sign up as a **Customer**.
2. **Login**: The form will auto-redirect. Sign in using the new credentials.
3. **Dashboards**: The backend will successfully generate your secure JWT Token and redirect you to the responsive Customer Dashboard!
