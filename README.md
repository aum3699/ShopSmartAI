
# ShopSmart AI

ShopSmart AI is a React and Flask local marketplace with seller tools,# ShopSmart AI

ShopSmart AI is a React and Flask local marketplace with seller tools, customer shopping, recommendations, cart, wishlist, checkout, and admin analytics.

## Requirements

- Python 3.12
- Node.js and npm
- MariaDB or MySQL
- XAMPP or another local database server

## Database

The database name is `shopsmart_ai`. Ensure MariaDB is running on the configured host and port.

Configure `backend/.env`:

```text
DB_HOST=127.0.0.1
DB_PORT=4306
DB_USER=root
DB_PASSWORD=
DB_NAME=shopsmart_ai
JWT_SECRET_KEY=your-local-secret
ADMIN_EMAIL=admin@shopsmart.local
ADMIN_NAME=ShopSmart Admin
ADMIN_PASSWORD=change-this-password
```

Use your actual local database settings and strong private secrets. Never commit your `.env` file.

Create or update the admin account:

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe create_admin.py
```

## Backend

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe run.py
```

Backend URL: `http://127.0.0.1:5000`

## Frontend

```powershell
cd "D:\New folder\ShopSmartAI\frontend"
npm install
npm run dev -- --host 127.0.0.1
```

Frontend URL: `http://127.0.0.1:5173`

## Tests

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe test_app.py
```

## Main Features

- Customer, seller, and admin authentication
- Seller shop and product management
- Local product image uploads
- Inventory management
- Customer preferences
- Product views and interaction tracking
- Category filtering and search
- Cart and wishlist
- Checkout, order history, and stock updates
- Budget and category-aware recommendations
- Admin analytics

## Security

- Passwords are hashed with Werkzeug.
- Protected APIs require Flask-JWT-Extended bearer tokens.
- Seller and admin operations verify role and ownership.
- Uploaded images are restricted by extension, MIME type, and 5 MB size.
- Use unique production database and JWT secrets.
customer shopping, recommendations, cart, wishlist, checkout, and admin
analytics.

## Requirements

- Python 3.12
- Node.js and npm
- MariaDB or MySQL
- XAMPP or another local database server

## Database

The database name is `shopsmart_ai`. Ensure MariaDB is running on the configured
host and port.

Configure `backend/.env`:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=shopsmart_ai
JWT_SECRET_KEY=your-local-secret
ADMIN_EMAIL=admin@shopsmart.local
ADMIN_NAME=ShopSmart Admin
ADMIN_PASSWORD=change-this-password
```

Create or update the admin account:

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe create_admin.py
```

## Backend

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe run.py
```

Backend URL: `http://127.0.0.1:5000`

## Frontend

```powershell
cd "D:\New folder\ShopSmartAI\frontend"
npm install
npm run dev -- --host 127.0.0.1
```

Frontend URL: `http://127.0.0.1:5173`

## Tests

```powershell
cd "D:\New folder\ShopSmartAI\backend"
.\venv\Scripts\python.exe test_app.py
```

## Main Features

- Customer, seller, and admin authentication
- Seller shop and product management
- Local product image uploads
- Inventory management
- Customer preferences
- Product views and interaction tracking
- Category filtering and search
- Cart and wishlist
- Checkout, order history, and stock updates
- Budget and category-aware recommendations
- Admin analytics

## Security

- Passwords are hashed with Werkzeug.
- Protected APIs require Flask-JWT-Extended bearer tokens.
- Seller and admin operations verify role and ownership.
- Uploaded images are restricted by extension, MIME type, and 5 MB size.
- Use unique production database and JWT secrets.
=======
# ShopSmartAI
>>>>>>> 8f7658d6e7d81e7465117df949bfff29b33560ed
