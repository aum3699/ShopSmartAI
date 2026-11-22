
import math
import os
import re
import uuid
from collections import Counter

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    verify_jwt_in_request,
    get_jwt_identity,
    get_jwt
)
from sqlalchemy import text
from werkzeug.utils import secure_filename
from app.config import Config


# --------------------------------------------------
# APPLICATION CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)
app.config.from_object(Config)

UPLOAD_FOLDER = os.path.join(app.root_path, "uploads", "products")
ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_IMAGE_SIZE = 5 * 1024 * 1024

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_SIZE

CORS(app)

db = SQLAlchemy(app)
jwt = JWTManager(app)


# --------------------------------------------------
# HOME ROUTE
# --------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "project": "ShopSmart AI",
        "status": "Running"
    })


# --------------------------------------------------
# DATABASE TEST
# --------------------------------------------------

@app.route("/api/test-db", methods=["GET"])
def test_db():
    try:
        result = db.session.execute(
            text("SELECT COUNT(*) FROM categories")
        ).scalar()

        return jsonify({
            "database": "Connected",
            "category_count": result
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "database": "Connection failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET ALL CATEGORIES
# --------------------------------------------------

@app.route("/api/categories", methods=["GET"])
def get_categories():
    try:
        result = db.session.execute(
            text("""
                SELECT category_id, category_name, description
                FROM categories
                ORDER BY category_id
            """)
        )

        categories = [
            {
                "category_id": row.category_id,
                "category_name": row.category_name,
                "description": row.description
            }
            for row in result
        ]

        return jsonify({
            "success": True,
            "total": len(categories),
            "categories": categories
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# --------------------------------------------------
# SELLER REGISTRATION
# --------------------------------------------------

@app.route("/api/auth/register-seller", methods=["POST"])
def register_seller():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Name, email and password are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters"
        }), 400

    try:
        existing = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": email}
        ).first()

        if existing:
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409

        hashed_password = generate_password_hash(password)

        result = db.session.execute(
            text("""
                INSERT INTO users (name, email, password, role)
                VALUES (:name, :email, :password, 'seller')
            """),
            {
                "name": name,
                "email": email,
                "password": hashed_password
            }
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Seller registered successfully",
            "user_id": result.lastrowid
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Registration failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# CUSTOMER REGISTRATION
# --------------------------------------------------

@app.route("/api/auth/register", methods=["POST"])
def register_customer():
    data = request.get_json(silent=True) or {}

    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not name or not email or not password:
        return jsonify({
            "success": False,
            "message": "Name, email and password are required"
        }), 400

    if len(password) < 8:
        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters"
        }), 400

    try:
        existing = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": email}
        ).first()

        if existing:
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 409

        hashed_password = generate_password_hash(password)

        result = db.session.execute(
            text("""
                INSERT INTO users (name, email, password, role)
                VALUES (:name, :email, :password, 'customer')
            """),
            {
                "name": name,
                "email": email,
                "password": hashed_password
            }
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Customer registered successfully",
            "user_id": result.lastrowid
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Registration failed"
        }), 500


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400

    try:
        user = db.session.execute(
            text("""
                SELECT user_id, name, email, password, role
                FROM users
                WHERE email = :email
            """),
            {"email": email}
        ).mappings().first()

        if not user or not check_password_hash(
            user["password"], password
        ):
            return jsonify({
                "success": False,
                "message": "Invalid email or password"
            }), 401

        access_token = create_access_token(
            identity=str(user["user_id"]),
            additional_claims={"role": user["role"]}
        )

        return jsonify({
            "success": True,
            "message": "Login successful",
            "access_token": access_token,
            "user": {
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email"],
                "role": user["role"]
            }
        }), 200

    except Exception:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Login failed"
        }), 500


# --------------------------------------------------
# SELLER SHOP REGISTRATION
# --------------------------------------------------

@app.route("/api/shops/register", methods=["POST"])
@jwt_required()
def register_shop():

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can register shops"
        }), 403

    owner_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    shop_name = data.get("shop_name", "").strip()
    description = data.get("description", "").strip()
    address = data.get("address", "").strip()
    phone = data.get("phone", "").strip()

    if not shop_name:
        return jsonify({
            "success": False,
            "message": "Shop name is required"
        }), 400

    try:
        result = db.session.execute(
            text("""
                INSERT INTO shops
                (owner_id, shop_name, description, address, phone)
                VALUES
                (:owner_id, :shop_name, :description, :address, :phone)
            """),
            {
                "owner_id": owner_id,
                "shop_name": shop_name,
                "description": description,
                "address": address,
                "phone": phone
            }
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Shop registered successfully",
            "shop_id": result.lastrowid
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Shop registration failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# PRODUCT IMAGE UPLOAD
# --------------------------------------------------

@app.route("/uploads/products/<path:filename>", methods=["GET"])
def get_product_image(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/api/products/upload-image", methods=["POST"])
@jwt_required()
def upload_product_image():
    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can upload product images"
        }), 403

    image = request.files.get("image")

    if not image or not image.filename:
        return jsonify({
            "success": False,
            "message": "Please select a product image"
        }), 400

    extension = os.path.splitext(secure_filename(image.filename))[1].lower().lstrip(".")

    if extension not in ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({
            "success": False,
            "message": "Only JPG, PNG, WEBP and GIF images are allowed"
        }), 400

    if image.mimetype not in ALLOWED_IMAGE_MIME_TYPES:
        return jsonify({
            "success": False,
            "message": "Invalid image file type"
        }), 400

    image.stream.seek(0, os.SEEK_END)
    image_size = image.stream.tell()
    image.stream.seek(0)

    if image_size == 0:
        return jsonify({
            "success": False,
            "message": "The selected image is empty"
        }), 400

    if image_size > MAX_IMAGE_SIZE:
        return jsonify({
            "success": False,
            "message": "The image cannot exceed 5 MB"
        }), 400

    filename = f"{uuid.uuid4().hex}.{extension}"
    file_path = os.path.join(UPLOAD_FOLDER, filename)

    try:
        image.save(file_path)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Unable to save the uploaded image"
        }), 500

    return jsonify({
        "success": True,
        "image_url": f"http://127.0.0.1:5000/uploads/products/{filename}",
        "filename": filename
    }), 201


# --------------------------------------------------
# SELLER PRODUCT REGISTRATION
# --------------------------------------------------

@app.route("/api/products/register", methods=["POST"])
@jwt_required()
def register_product():

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can register products"
        }), 403

    owner_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    shop_id = data.get("shop_id")
    category_id = data.get("category_id")
    product_name = data.get("product_name", "").strip()
    description = data.get("description", "").strip()
    image_url = data.get("image_url", "").strip()

    if not all([shop_id, category_id, product_name]):
        return jsonify({
            "success": False,
            "message": "Shop, category and product name are required"
        }), 400

    if len(product_name) > 150:
        return jsonify({
            "success": False,
            "message": "Product name cannot exceed 150 characters"
        }), 400

    if len(description) > 1000:
        return jsonify({
            "success": False,
            "message": "Product description cannot exceed 1000 characters"
        }), 400

    if len(image_url) > 500:
        return jsonify({
            "success": False,
            "message": "Product image URL cannot exceed 500 characters"
        }), 400

    price_value = data.get("price")
    stock_value = data.get("stock")

    if (
        isinstance(shop_id, bool)
        or isinstance(category_id, bool)
        or isinstance(price_value, bool)
        or isinstance(stock_value, bool)
    ):
        return jsonify({
            "success": False,
            "message": "Invalid shop, category, price or stock"
        }), 400

    try:
        shop_id = int(shop_id)
        category_id = int(category_id)
        price = float(price_value if price_value is not None else 0)
        stock = int(stock_value)

    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid shop, category, price or stock"
        }), 400

    try:
        if float(stock_value) != stock:
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify({
            "success": False,
            "message": "Stock must be a whole number"
        }), 400

    if not math.isfinite(price) or price < 0 or stock < 0:
        return jsonify({
            "success": False,
            "message": "Price and stock cannot be negative"
        }), 400

    try:
        shop = db.session.execute(
            text("""
                SELECT shop_id
                FROM shops
                WHERE shop_id = :shop_id
                AND owner_id = :owner_id
            """),
            {
                "shop_id": shop_id,
                "owner_id": owner_id
            }
        ).first()

        if not shop:
            return jsonify({
                "success": False,
                "message": "Shop not found or not owned by this seller"
            }), 404

        category = db.session.execute(
            text("""
                SELECT category_id
                FROM categories
                WHERE category_id = :category_id
            """),
            {"category_id": category_id}
        ).first()

        if not category:
            return jsonify({
                "success": False,
                "message": "Invalid category"
            }), 404

        result = db.session.execute(
            text("""
                INSERT INTO products
                (shop_id, category_id, product_name,
                 description, price, stock, image_url)
                VALUES
                (:shop_id, :category_id, :product_name,
                 :description, :price, :stock, :image_url)
            """),
            {
                "shop_id": shop_id,
                "category_id": category_id,
                "product_name": product_name,
                "description": description,
                "price": price,
                "stock": stock,
                "image_url": image_url
            }
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product registered successfully",
            "product_id": result.lastrowid
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Product registration failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# SELLER PRODUCT UPDATE
# --------------------------------------------------

@app.route("/api/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can update products"
        }), 403

    owner_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    shop_id = data.get("shop_id")
    category_id = data.get("category_id")
    product_name = data.get("product_name", "").strip()
    description = data.get("description", "").strip()
    image_url = data.get("image_url", "").strip()

    if not all([shop_id, category_id, product_name]):
        return jsonify({
            "success": False,
            "message": "Shop, category and product name are required"
        }), 400

    if len(product_name) > 150:
        return jsonify({
            "success": False,
            "message": "Product name cannot exceed 150 characters"
        }), 400

    if len(description) > 1000:
        return jsonify({
            "success": False,
            "message": "Product description cannot exceed 1000 characters"
        }), 400

    if len(image_url) > 500:
        return jsonify({
            "success": False,
            "message": "Product image URL cannot exceed 500 characters"
        }), 400

    price_value = data.get("price")
    stock_value = data.get("stock")

    if (
        isinstance(shop_id, bool)
        or isinstance(category_id, bool)
        or isinstance(price_value, bool)
        or isinstance(stock_value, bool)
    ):
        return jsonify({
            "success": False,
            "message": "Invalid shop, category, price or stock"
        }), 400

    try:
        shop_id = int(shop_id)
        category_id = int(category_id)
        price = float(price_value if price_value is not None else 0)
        stock = int(stock_value)
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid shop, category, price or stock"
        }), 400

    try:
        if float(stock_value) != stock:
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify({
            "success": False,
            "message": "Stock must be a whole number"
        }), 400

    if not math.isfinite(price) or price < 0 or stock < 0:
        return jsonify({
            "success": False,
            "message": "Price and stock cannot be negative"
        }), 400

    try:
        product = db.session.execute(
            text("""
                SELECT p.product_id, p.image_url
                FROM products p
                JOIN shops s ON p.shop_id = s.shop_id
                WHERE p.product_id = :product_id
                AND s.owner_id = :owner_id
            """),
            {
                "product_id": product_id,
                "owner_id": owner_id
            }
        ).first()

        if not product:
            return jsonify({
                "success": False,
                "message": "Product not found or not owned by this seller"
            }), 404

        shop = db.session.execute(
            text("""
                SELECT shop_id
                FROM shops
                WHERE shop_id = :shop_id
                AND owner_id = :owner_id
            """),
            {
                "shop_id": shop_id,
                "owner_id": owner_id
            }
        ).first()

        if not shop:
            return jsonify({
                "success": False,
                "message": "Shop not found or not owned by this seller"
            }), 404

        category = db.session.execute(
            text("""
                SELECT category_id
                FROM categories
                WHERE category_id = :category_id
            """),
            {"category_id": category_id}
        ).first()

        if not category:
            return jsonify({
                "success": False,
                "message": "Invalid category"
            }), 404

        db.session.execute(
            text("""
                UPDATE products
                SET shop_id = :shop_id,
                    category_id = :category_id,
                    product_name = :product_name,
                    description = :description,
                    price = :price,
                    stock = :stock,
                    image_url = :image_url
                WHERE product_id = :product_id
            """),
            {
                "product_id": product_id,
                "shop_id": shop_id,
                "category_id": category_id,
                "product_name": product_name,
                "description": description,
                "price": price,
                "stock": stock,
                "image_url": image_url
            }
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Product updated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Product update failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# SELLER INVENTORY UPDATE
# --------------------------------------------------

@app.route("/api/products/<int:product_id>/stock", methods=["PATCH"])
@jwt_required()
def update_product_stock(product_id):

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can update inventory"
        }), 403

    owner_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    stock_value = data.get("stock")

    if isinstance(stock_value, bool):
        return jsonify({
            "success": False,
            "message": "Stock must be a non-negative whole number"
        }), 400

    try:
        stock = int(stock_value)
        if float(stock_value) != stock:
            raise ValueError
    except (ValueError, TypeError, OverflowError):
        return jsonify({
            "success": False,
            "message": "Stock must be a non-negative whole number"
        }), 400

    if stock < 0:
        return jsonify({
            "success": False,
            "message": "Stock cannot be negative"
        }), 400

    try:
        product = db.session.execute(
            text("""
                SELECT p.product_id
                FROM products p
                JOIN shops s ON p.shop_id = s.shop_id
                WHERE p.product_id = :product_id
                AND s.owner_id = :owner_id
            """),
            {
                "product_id": product_id,
                "owner_id": owner_id
            }
        ).first()

        if not product:
            return jsonify({
                "success": False,
                "message": "Product not found or not owned by this seller"
            }), 404

        db.session.execute(
            text("""
                UPDATE products
                SET stock = :stock
                WHERE product_id = :product_id
            """),
            {
                "stock": stock,
                "product_id": product_id
            }
        )
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Inventory updated successfully",
            "stock": stock
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Inventory update failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# SELLER PRODUCT DELETION
# --------------------------------------------------

@app.route("/api/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can delete products"
        }), 403

    owner_id = int(get_jwt_identity())

    try:
        product = db.session.execute(
            text("""
                SELECT p.product_id, p.image_url
                FROM products p
                JOIN shops s ON p.shop_id = s.shop_id
                WHERE p.product_id = :product_id
                AND s.owner_id = :owner_id
            """),
            {
                "product_id": product_id,
                "owner_id": owner_id
            }
        ).first()

        if not product:
            return jsonify({
                "success": False,
                "message": "Product not found or not owned by this seller"
            }), 404

        db.session.execute(
            text("""
                DELETE FROM interactions
                WHERE product_id = :product_id
            """),
            {"product_id": product_id}
        )

        db.session.execute(
            text("""
                DELETE FROM products
                WHERE product_id = :product_id
            """),
            {"product_id": product_id}
        )

        db.session.commit()

        image_url = product.image_url or ""
        if "/uploads/products/" in image_url:
            filename = os.path.basename(image_url)
            image_path = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(image_path):
                try:
                    os.remove(image_path)
                except OSError:
                    pass

        return jsonify({
            "success": True,
            "message": "Product deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Product deletion failed",
            "error": str(e)
        }), 500


# --------------------------------------------------
# CUSTOMER PREFERENCES
# --------------------------------------------------

@app.route("/api/preferences", methods=["GET"])
@jwt_required()
def get_preferences():
    if get_jwt().get("role") != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can access preferences"
        }), 403

    user_id = int(get_jwt_identity())

    try:
        result = db.session.execute(
            text("""
                SELECT p.preference_id,
                       p.category_id,
                       p.min_budget,
                       p.max_budget,
                       c.category_name
                FROM preferences p
                JOIN categories c ON p.category_id = c.category_id
                WHERE p.user_id = :user_id
                ORDER BY p.preference_id DESC
                LIMIT 1
            """),
            {"user_id": user_id}
        ).first()

        if not result:
            return jsonify({
                "success": True,
                "preference": None
            }), 200

        return jsonify({
            "success": True,
            "preference": {
                "preference_id": result.preference_id,
                "category_id": result.category_id,
                "category_name": result.category_name,
                "min_budget": float(result.min_budget),
                "max_budget": float(result.max_budget)
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to retrieve preferences",
            "error": str(e)
        }), 500


@app.route("/api/preferences", methods=["PUT"])
@jwt_required()
def save_preferences():
    if get_jwt().get("role") != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can save preferences"
        }), 403

    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        category_id = int(data.get("category_id"))
        min_budget = float(data.get("min_budget", 0))
        max_budget = float(data.get("max_budget", 0))
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Invalid category or budget"
        }), 400

    if (
        isinstance(data.get("category_id"), bool)
        or not math.isfinite(min_budget)
        or not math.isfinite(max_budget)
        or min_budget < 0
        or max_budget < min_budget
    ):
        return jsonify({
            "success": False,
            "message": "Budgets must be valid and maximum must not be below minimum"
        }), 400

    try:
        category = db.session.execute(
            text("""
                SELECT category_id
                FROM categories
                WHERE category_id = :category_id
            """),
            {"category_id": category_id}
        ).first()

        if not category:
            return jsonify({
                "success": False,
                "message": "Invalid category"
            }), 404

        existing = db.session.execute(
            text("""
                SELECT preference_id
                FROM preferences
                WHERE user_id = :user_id
                ORDER BY preference_id DESC
                LIMIT 1
            """),
            {"user_id": user_id}
        ).first()

        if existing:
            db.session.execute(
                text("""
                    UPDATE preferences
                    SET category_id = :category_id,
                        min_budget = :min_budget,
                        max_budget = :max_budget
                    WHERE preference_id = :preference_id
                """),
                {
                    "category_id": category_id,
                    "min_budget": min_budget,
                    "max_budget": max_budget,
                    "preference_id": existing.preference_id
                }
            )
        else:
            db.session.execute(
                text("""
                    INSERT INTO preferences
                    (user_id, category_id, min_budget, max_budget)
                    VALUES
                    (:user_id, :category_id, :min_budget, :max_budget)
                """),
                {
                    "user_id": user_id,
                    "category_id": category_id,
                    "min_budget": min_budget,
                    "max_budget": max_budget
                }
            )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Preferences saved successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to save preferences",
            "error": str(e)
        }), 500


# --------------------------------------------------
# CUSTOMER INTERACTION TRACKING
# --------------------------------------------------

@app.route("/api/interactions", methods=["POST"])
@jwt_required()
def track_interaction():
    if get_jwt().get("role") != "customer":
        return jsonify({
            "success": False,
            "message": "Only customers can record interactions"
        }), 403

    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        product_id = int(data.get("product_id"))
    except (ValueError, TypeError):
        return jsonify({
            "success": False,
            "message": "Valid product_id is required"
        }), 400

    interaction_type = str(data.get("interaction_type", "view")).strip().lower()
    allowed_types = {"view", "click", "cart", "wishlist", "purchase"}

    if interaction_type not in allowed_types:
        return jsonify({
            "success": False,
            "message": "Invalid interaction type"
        }), 400

    rating = data.get("rating")
    if rating is not None:
        try:
            rating = float(rating)
            if not math.isfinite(rating) or rating < 1 or rating > 5:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({
                "success": False,
                "message": "Rating must be between 1 and 5"
            }), 400

    try:
        product = db.session.execute(
            text("SELECT product_id FROM products WHERE product_id = :product_id"),
            {"product_id": product_id}
        ).first()

        if not product:
            return jsonify({
                "success": False,
                "message": "Product not found"
            }), 404

        db.session.execute(
            text("""
                INSERT INTO interactions
                (user_id, product_id, interaction_type, rating)
                VALUES
                (:user_id, :product_id, :interaction_type, :rating)
            """),
            {
                "user_id": user_id,
                "product_id": product_id,
                "interaction_type": interaction_type,
                "rating": rating
            }
        )
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Interaction recorded"
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to record interaction",
            "error": str(e)
        }), 500


# --------------------------------------------------
# GET ALL PRODUCTS
# --------------------------------------------------

# --------------------------------------------------
# SELLER DASHBOARD DATA
# --------------------------------------------------

@app.route("/api/seller/dashboard", methods=["GET"])
@jwt_required()
def seller_dashboard():

    if get_jwt().get("role") != "seller":
        return jsonify({
            "success": False,
            "message": "Only sellers can access this dashboard"
        }), 403

    owner_id = int(get_jwt_identity())

    try:
        shops_result = db.session.execute(
            text("""
                SELECT shop_id, shop_name, description, address, phone
                FROM shops
                WHERE owner_id = :owner_id
                ORDER BY shop_id DESC
            """),
            {"owner_id": owner_id}
        )

        shops = [
            {
                "shop_id": row.shop_id,
                "shop_name": row.shop_name,
                "description": row.description,
                "address": row.address,
                "phone": row.phone
            }
            for row in shops_result
        ]

        products_result = db.session.execute(
            text("""
                SELECT
                    p.product_id,
                    p.shop_id,
                    p.category_id,
                    p.product_name,
                    p.description,
                    p.price,
                    p.stock,
                    p.image_url,
                    s.shop_name,
                    c.category_name
                FROM products p
                JOIN shops s ON p.shop_id = s.shop_id
                JOIN categories c ON p.category_id = c.category_id
                WHERE s.owner_id = :owner_id
                ORDER BY p.product_id DESC
            """),
            {"owner_id": owner_id}
        )

        products = [
            {
                "product_id": row.product_id,
                "shop_id": row.shop_id,
                "category_id": row.category_id,
                "product_name": row.product_name,
                "description": row.description,
                "price": float(row.price),
                "stock": row.stock,
                "image_url": row.image_url,
                "shop_name": row.shop_name,
                "category_name": row.category_name
            }
            for row in products_result
        ]

        return jsonify({
            "success": True,
            "shops": shops,
            "products": products,
            "total_shops": len(shops),
            "total_products": len(products)
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to load seller dashboard",
            "error": str(e)
        }), 500

@app.route("/api/products", methods=["GET"])
def get_products():
    try:
        result = db.session.execute(text("""
            SELECT
                p.product_id,
                p.product_name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                s.shop_name,
                c.category_name
            FROM products p
            JOIN shops s ON p.shop_id = s.shop_id
            JOIN categories c ON p.category_id = c.category_id
            ORDER BY p.product_id DESC
        """))

        products = [
            {
                "product_id": row.product_id,
                "product_name": row.product_name,
                "description": row.description,
                "price": float(row.price),
                "stock": row.stock,
                "image_url": row.image_url,
                "shop_name": row.shop_name,
                "category_name": row.category_name
            }
            for row in result
        ]

        return jsonify({
            "success": True,
            "total": len(products),
            "products": products
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to retrieve products",
            "error": str(e)
        }), 500


# --------------------------------------------------
# CUSTOMER CART AND WISHLIST
# --------------------------------------------------

@app.route("/api/cart", methods=["GET"])
@jwt_required()
def get_cart():
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can access cart"}), 403

    user_id = int(get_jwt_identity())
    try:
        result = db.session.execute(text("""
            SELECT c.cart_id, c.quantity,
                   p.product_id, p.product_name, p.price, p.stock, p.image_url,
                   s.shop_name
            FROM cart_items c
            JOIN products p ON c.product_id = p.product_id
            JOIN shops s ON p.shop_id = s.shop_id
            WHERE c.user_id = :user_id
            ORDER BY c.cart_id DESC
        """), {"user_id": user_id})

        items = [{
            "cart_id": row.cart_id,
            "quantity": row.quantity,
            "product_id": row.product_id,
            "product_name": row.product_name,
            "price": float(row.price),
            "stock": row.stock,
            "image_url": row.image_url,
            "shop_name": row.shop_name
        } for row in result]

        total = sum(item["price"] * item["quantity"] for item in items)
        return jsonify({"success": True, "items": items, "total": total}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Unable to load cart", "error": str(e)}), 500


@app.route("/api/cart", methods=["POST"])
@jwt_required()
def add_to_cart():
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can use cart"}), 403

    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    try:
        product_id = int(data.get("product_id"))
        quantity = int(data.get("quantity", 1))
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid product or quantity"}), 400

    if quantity < 1:
        return jsonify({"success": False, "message": "Quantity must be at least 1"}), 400

    try:
        product = db.session.execute(text("""
            SELECT product_id, stock FROM products WHERE product_id = :product_id
        """), {"product_id": product_id}).first()

        if not product:
            return jsonify({"success": False, "message": "Product not found"}), 404
        if quantity > product.stock:
            return jsonify({"success": False, "message": "Quantity exceeds available stock"}), 400

        existing = db.session.execute(text("""
            SELECT cart_id, quantity FROM cart_items
            WHERE user_id = :user_id AND product_id = :product_id
        """), {"user_id": user_id, "product_id": product_id}).first()

        if existing:
            new_quantity = existing.quantity + quantity
            if new_quantity > product.stock:
                return jsonify({"success": False, "message": "Quantity exceeds available stock"}), 400
            db.session.execute(text("""
                UPDATE cart_items SET quantity = :quantity
                WHERE cart_id = :cart_id
            """), {"quantity": new_quantity, "cart_id": existing.cart_id})
        else:
            db.session.execute(text("""
                INSERT INTO cart_items (user_id, product_id, quantity)
                VALUES (:user_id, :product_id, :quantity)
            """), {"user_id": user_id, "product_id": product_id, "quantity": quantity})

        db.session.commit()
        return jsonify({"success": True, "message": "Added to cart"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Unable to add to cart", "error": str(e)}), 500


@app.route("/api/cart/<int:cart_id>", methods=["PATCH", "DELETE"])
@jwt_required()
def manage_cart_item(cart_id):
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can manage cart"}), 403

    user_id = int(get_jwt_identity())
    try:
        if request.method == "DELETE":
            db.session.execute(text("""
                DELETE FROM cart_items WHERE cart_id = :cart_id AND user_id = :user_id
            """), {"cart_id": cart_id, "user_id": user_id})
            db.session.commit()
            return jsonify({"success": True, "message": "Cart item removed"}), 200

        data = request.get_json(silent=True) or {}
        quantity = int(data.get("quantity"))
        if quantity < 1:
            return jsonify({"success": False, "message": "Quantity must be at least 1"}), 400

        cart_item = db.session.execute(text("""
            SELECT c.cart_id, p.stock
            FROM cart_items c
            JOIN products p ON c.product_id = p.product_id
            WHERE c.cart_id = :cart_id AND c.user_id = :user_id
        """), {"cart_id": cart_id, "user_id": user_id}).first()

        if not cart_item:
            return jsonify({"success": False, "message": "Cart item not found"}), 404
        if quantity > cart_item.stock:
            return jsonify({"success": False, "message": "Quantity exceeds available stock"}), 400

        db.session.execute(text("""
            UPDATE cart_items SET quantity = :quantity
            WHERE cart_id = :cart_id AND user_id = :user_id
        """), {"quantity": quantity, "cart_id": cart_id, "user_id": user_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Cart updated"}), 200
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid quantity"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Unable to manage cart", "error": str(e)}), 500


@app.route("/api/wishlist", methods=["GET", "POST"])
@jwt_required()
def wishlist():
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can use wishlist"}), 403

    user_id = int(get_jwt_identity())
    try:
        if request.method == "POST":
            data = request.get_json(silent=True) or {}
            product_id_value = data.get("product_id")
            if isinstance(product_id_value, bool):
                raise ValueError
            product_id = int(product_id_value)

            product = db.session.execute(
                text("SELECT product_id FROM products WHERE product_id = :product_id"),
                {"product_id": product_id}
            ).first()

            if not product:
                return jsonify({
                    "success": False,
                    "message": "Product not found"
                }), 404

            db.session.execute(text("""
                INSERT IGNORE INTO wishlist_items (user_id, product_id)
                VALUES (:user_id, :product_id)
            """), {"user_id": user_id, "product_id": product_id})
            db.session.commit()
            return jsonify({"success": True, "message": "Added to wishlist"}), 200

        result = db.session.execute(text("""
            SELECT w.wishlist_id, p.product_id, p.product_name, p.price, p.stock, p.image_url
            FROM wishlist_items w
            JOIN products p ON w.product_id = p.product_id
            WHERE w.user_id = :user_id
            ORDER BY w.wishlist_id DESC
        """), {"user_id": user_id})
        items = [{
            "wishlist_id": row.wishlist_id,
            "product_id": row.product_id,
            "product_name": row.product_name,
            "price": float(row.price),
            "stock": row.stock,
            "image_url": row.image_url
        } for row in result]
        return jsonify({"success": True, "items": items}), 200
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid product"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Unable to manage wishlist", "error": str(e)}), 500


@app.route("/api/wishlist/<int:product_id>", methods=["DELETE"])
@jwt_required()
def remove_wishlist_item(product_id):
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can manage wishlist"}), 403
    user_id = int(get_jwt_identity())
    try:
        db.session.execute(text("""
            DELETE FROM wishlist_items
            WHERE user_id = :user_id AND product_id = :product_id
        """), {"user_id": user_id, "product_id": product_id})
        db.session.commit()
        return jsonify({"success": True, "message": "Removed from wishlist"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": "Unable to update wishlist", "error": str(e)}), 500


# --------------------------------------------------
# CUSTOMER CHECKOUT AND ORDERS
# --------------------------------------------------

@app.route("/api/checkout", methods=["POST"])
@jwt_required()
def checkout():
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can place orders"}), 403

    user_id = int(get_jwt_identity())
    try:
        cart_items = db.session.execute(text("""
            SELECT c.cart_id, c.quantity, c.product_id, p.price, p.stock
            FROM cart_items c
            JOIN products p ON c.product_id = p.product_id
            WHERE c.user_id = :user_id
        """), {"user_id": user_id}).fetchall()

        if not cart_items:
            return jsonify({"success": False, "message": "Your cart is empty"}), 400

        for item in cart_items:
            if item.quantity > item.stock:
                return jsonify({
                    "success": False,
                    "message": f"Insufficient stock for product ID {item.product_id}"
                }), 400

        total = sum(float(item.price) * item.quantity for item in cart_items)
        order = db.session.execute(text("""
            INSERT INTO orders (user_id, total_amount, status)
            VALUES (:user_id, :total_amount, 'placed')
        """), {"user_id": user_id, "total_amount": total})
        order_id = order.lastrowid

        for item in cart_items:
            db.session.execute(text("""
                INSERT INTO order_items
                (order_id, product_id, quantity, price)
                VALUES (:order_id, :product_id, :quantity, :price)
            """), {
                "order_id": order_id,
                "product_id": item.product_id,
                "quantity": item.quantity,
                "price": float(item.price)
            })
            db.session.execute(text("""
                UPDATE products
                SET stock = stock - :quantity
                WHERE product_id = :product_id
            """), {
                "quantity": item.quantity,
                "product_id": item.product_id
            })

        db.session.execute(text("""
            DELETE FROM cart_items WHERE user_id = :user_id
        """), {"user_id": user_id})
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Order placed successfully",
            "order_id": order_id,
            "total": total
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Checkout failed",
            "error": str(e)
        }), 500


@app.route("/api/orders", methods=["GET"])
@jwt_required()
def get_orders():
    if get_jwt().get("role") != "customer":
        return jsonify({"success": False, "message": "Only customers can view orders"}), 403

    user_id = int(get_jwt_identity())
    try:
        orders_result = db.session.execute(text("""
            SELECT order_id, total_amount, status, created_at
            FROM orders
            WHERE user_id = :user_id
            ORDER BY created_at DESC
        """), {"user_id": user_id})

        orders = []
        for order in orders_result:
            items_result = db.session.execute(text("""
                SELECT oi.quantity, oi.price, p.product_name, p.image_url
                FROM order_items oi
                JOIN products p ON oi.product_id = p.product_id
                WHERE oi.order_id = :order_id
            """), {"order_id": order.order_id})

            orders.append({
                "order_id": order.order_id,
                "total": float(order.total_amount),
                "status": order.status,
                "created_at": order.created_at.isoformat(),
                "items": [{
                    "product_name": item.product_name,
                    "quantity": item.quantity,
                    "price": float(item.price),
                    "image_url": item.image_url
                } for item in items_result]
            })

        return jsonify({"success": True, "orders": orders}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to load orders",
            "error": str(e)
        }), 500


# --------------------------------------------------
# ADMIN DASHBOARD
# --------------------------------------------------

def require_admin():
    if get_jwt().get("role") != "admin":
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403
    return None


@app.route("/api/admin/dashboard", methods=["GET"])
@jwt_required()
def admin_dashboard():
    forbidden = require_admin()
    if forbidden:
        return forbidden

    try:
        counts = {}
        for table in ("users", "shops", "categories", "products", "orders"):
            counts[table] = db.session.execute(
                text(f"SELECT COUNT(*) FROM {table}")
            ).scalar()

        revenue = db.session.execute(text(
            "SELECT COALESCE(SUM(total_amount), 0) FROM orders"
        )).scalar()

        recent_users = db.session.execute(text("""
            SELECT user_id, name, email, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 8
        """))

        return jsonify({
            "success": True,
            "counts": counts,
            "revenue": float(revenue or 0),
            "users": [{
                "user_id": row.user_id,
                "name": row.name,
                "email": row.email,
                "role": row.role,
                "created_at": row.created_at.isoformat()
            } for row in recent_users]
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to load admin dashboard",
            "error": str(e)
        }), 500


@app.route("/api/admin/categories", methods=["POST"])
@jwt_required()
def admin_add_category():
    forbidden = require_admin()
    if forbidden:
        return forbidden

    data = request.get_json(silent=True) or {}
    name = str(data.get("category_name", "")).strip()
    description = str(data.get("description", "")).strip()

    if not name:
        return jsonify({"success": False, "message": "Category name is required"}), 400

    try:
        db.session.execute(text("""
            INSERT INTO categories (category_name, description)
            VALUES (:name, :description)
        """), {"name": name, "description": description})
        db.session.commit()
        return jsonify({"success": True, "message": "Category added"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to add category",
            "error": str(e)
        }), 500


# --------------------------------------------------
# AI PRODUCT RECOMMENDATIONS
# --------------------------------------------------

def text_vector(text):
    words = re.findall(r"[a-z0-9]+", str(text).lower())
    return Counter(word for word in words if len(word) > 2)


def cosine_similarity(left, right):
    common = set(left) & set(right)
    dot = sum(left[word] * right[word] for word in common)
    left_size = math.sqrt(sum(value * value for value in left.values()))
    right_size = math.sqrt(sum(value * value for value in right.values()))
    if left_size == 0 or right_size == 0:
        return 0
    return dot / (left_size * right_size)


@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid or expired authentication token"
        }), 401

    try:
        claims = get_jwt()
        role = claims.get("role")
        if role == "customer":
            user_id = int(get_jwt_identity())
    except Exception:
        role = None
        user_id = None

    try:
        products_result = db.session.execute(text("""
            SELECT
                p.product_id,
                p.product_name,
                p.description,
                p.price,
                p.stock,
                p.image_url,
                s.shop_name,
                c.category_id,
                c.category_name
            FROM products p
            JOIN shops s ON p.shop_id = s.shop_id
            JOIN categories c ON p.category_id = c.category_id
            WHERE p.stock > 0
            ORDER BY p.product_id DESC
        """))

        products = [{
            "product_id": row.product_id,
            "product_name": row.product_name,
            "description": row.description,
            "price": float(row.price),
            "stock": row.stock,
            "image_url": row.image_url,
            "shop_name": row.shop_name,
            "category_id": row.category_id,
            "category_name": row.category_name
        } for row in products_result]

        preference = None
        interaction_rows = []

        if user_id:
            preference = db.session.execute(text("""
                SELECT category_id, min_budget, max_budget
                FROM preferences
                WHERE user_id = :user_id
                ORDER BY preference_id DESC
                LIMIT 1
            """), {"user_id": user_id}).first()

            interaction_result = db.session.execute(text("""
                SELECT i.product_id, i.interaction_type,
                       p.category_id
                FROM interactions i
                JOIN products p ON i.product_id = p.product_id
                WHERE i.user_id = :user_id
            """), {"user_id": user_id})
            interaction_rows = list(interaction_result)

        preferred_category_id = preference.category_id if preference else None
        min_budget = float(preference.min_budget) if preference else None
        max_budget = float(preference.max_budget) if preference else None

        target_text = ""
        if preference:
            category = db.session.execute(text("""
                SELECT category_name FROM categories
                WHERE category_id = :category_id
            """), {"category_id": preferred_category_id}).first()
            if category:
                target_text = category.category_name

        weight_by_type = {
            "view": 1,
            "click": 2,
            "wishlist": 3,
            "cart": 4,
            "purchase": 5
        }
        interaction_category_scores = {}
        interaction_product_scores = {}

        for row in interaction_rows:
            weight = weight_by_type.get(row.interaction_type, 1)
            interaction_category_scores[row.category_id] = (
                interaction_category_scores.get(row.category_id, 0) + weight
            )
            interaction_product_scores[row.product_id] = (
                interaction_product_scores.get(row.product_id, 0) + weight
            )

        ranked = []
        for product in products:
            content_text = " ".join([
                product["product_name"] or "",
                product["description"] or "",
                product["category_name"] or ""
            ])
            content_score = cosine_similarity(
                text_vector(target_text),
                text_vector(content_text)
            )

            category_score = (
                interaction_category_scores.get(product["category_id"], 0)
            )
            interaction_score = (
                interaction_product_scores.get(product["product_id"], 0)
            )

            preference_score = (
                1.0
                if preferred_category_id == product["category_id"]
                else 0
            )

            budget_score = 0
            if min_budget is not None and max_budget is not None:
                if min_budget <= product["price"] <= max_budget:
                    budget_score = 1
                elif product["price"] <= max_budget:
                    budget_score = max(
                        0,
                        1 - abs(product["price"] - min_budget) /
                        max(max_budget - min_budget, 1)
                    )

            score = (
                content_score * 3.0
                + preference_score * 4.0
                + budget_score * 2.5
                + min(category_score, 10) * 0.25
                + min(interaction_score, 10) * 0.35
            )

            ranked.append({
                **product,
                "recommendation_score": round(score, 4)
            })

        ranked.sort(
            key=lambda item: (
                item["recommendation_score"],
                item["stock"]
            ),
            reverse=True
        )

        return jsonify({
            "success": True,
            "personalized": bool(user_id),
            "total": len(ranked),
            "products": ranked[:12]
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": "Unable to generate recommendations",
            "error": str(e)
        }), 500


# --------------------------------------------------
# RUN APPLICATION
# --------------------------------------------------

if __name__ == "__main__":
    app.run(debug=False, port=5000)
