
import { useEffect, useState } from "react";
import "./index.css";

const API_URL = "http://127.0.0.1:5000/api";

const categoryIcons = {
  "Mobiles & Electronics": "📱",
  "Clothing & Fashion": "👕",
  "Grocery & Daily Needs": "🛒",
  Furniture: "🛋️",
  "Home Appliances": "🏠",
  "Beauty & Personal Care": "✨",
  "Sports & Fitness": "🏃",
  "Books & Stationery": "📚",
};

function App() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferenceLoading, setPreferenceLoading] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState("");
  const [preferenceForm, setPreferenceForm] = useState({
    category_id: "",
    min_budget: "",
    max_budget: "",
  });
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showWishlist, setShowWishlist] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationLoading, setRecommendationLoading] = useState(true);
  const [marketplaceMessage, setMarketplaceMessage] = useState("");
  const [orders, setOrders] = useState([]);
  const [showOrders, setShowOrders] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    category_name: "",
    description: "",
  });

  const [categoryLoading, setCategoryLoading] = useState(true);
  const [productLoading, setProductLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [productError, setProductError] = useState("");

  const [showSellerDashboard, setShowSellerDashboard] = useState(false);

  const [authMode, setAuthMode] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "customer",
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("shopsmart_user"));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser?.role !== "customer") {
      return;
    }

    const token = sessionStorage.getItem("shopsmart_token");
    Promise.all([
      fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json()),
      fetch(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((response) => response.json()),
    ]).then(([cartData, wishlistData]) => {
      if (cartData.success) {
        setCartItems(cartData.items || []);
        setCartTotal(cartData.total || 0);
      }
      if (wishlistData.success) {
        setWishlistItems(wishlistData.items || []);
      }
    }).catch(() => {
      setMarketplaceMessage(
        "Cannot connect to the backend. Start Flask on port 5000."
      );
    });
  }, [currentUser]);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load categories");
        }
        return response.json();
      })
      .then((data) => setCategories(data.categories || []))
      .catch((error) => setCategoryError(error.message))
      .finally(() => setCategoryLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/products`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load products");
        }
        return response.json();
      })
      .then((data) => setProducts(data.products || []))
      .catch((error) => setProductError(error.message))
      .finally(() => setProductLoading(false));
  }, []);

  useEffect(() => {
    const token = sessionStorage.getItem("shopsmart_token");
    const headers = token
      ? { Authorization: `Bearer ${token}` }
      : {};

    fetch(`${API_URL}/recommendations`, { headers })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Unable to load recommendations");
        }
        return response.json();
      })
      .then((data) => setRecommendations(data.products || []))
      .catch(() => setRecommendations([]))
      .finally(() => setRecommendationLoading(false));
  }, [currentUser]);

  const filteredCategories = categories.filter((category) =>
    category.category_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredProducts = products.filter((product) =>
    [
      product.product_name,
      product.description,
      product.category_name,
      product.shop_name,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const handleAuth = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthMessage("");

    const isRegister = authMode === "register";

    const endpoint = isRegister
      ? authForm.role === "seller"
        ? "/auth/register-seller"
        : "/auth/register"
      : "/auth/login";

    const payload = isRegister
      ? {
          name: authForm.name,
          email: authForm.email,
          password: authForm.password,
        }
      : {
          email: authForm.email,
          password: authForm.password,
        };

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed");
      }

      if (isRegister) {
        setAuthMessage("Registration successful! Please log in.");

        setAuthForm((previous) => ({
          ...previous,
          name: "",
          password: "",
        }));

        setAuthMode("login");
      } else {
        sessionStorage.setItem(
          "shopsmart_token",
          data.access_token
        );

        sessionStorage.setItem(
          "shopsmart_user",
          JSON.stringify(data.user)
        );

        setCurrentUser(data.user);
        setAuthMode("");
        setAuthMessage("");
      }
    } catch (error) {
      setAuthMessage(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("shopsmart_token");
    sessionStorage.removeItem("shopsmart_user");

    setCurrentUser(null);
    setShowSellerDashboard(false);
    setCartItems([]);
    setCartTotal(0);
    setWishlistItems([]);
  };

  const openAuth = (mode) => {
    setAuthMessage("");
    setAuthMode(mode);

    setAuthForm({
      name: "",
      email: "",
      password: "",
      role: "customer",
    });
  };

  const openPreferences = async () => {
    setShowPreferences(true);
    setPreferenceLoading(true);
    setPreferenceMessage("");

    try {
      const token = sessionStorage.getItem("shopsmart_token");
      const response = await fetch(`${API_URL}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load preferences"
        );
      }

      if (data.preference) {
        setPreferenceForm({
          category_id: String(data.preference.category_id),
          min_budget: String(data.preference.min_budget),
          max_budget: String(data.preference.max_budget),
        });
      }
    } catch (error) {
      setPreferenceMessage(error.message);
    } finally {
      setPreferenceLoading(false);
    }
  };

  const savePreferences = async (event) => {
    event.preventDefault();
    setPreferenceLoading(true);
    setPreferenceMessage("");

    const minBudget = Number(preferenceForm.min_budget);
    const maxBudget = Number(preferenceForm.max_budget);

    if (
      !preferenceForm.category_id ||
      !Number.isFinite(minBudget) ||
      !Number.isFinite(maxBudget) ||
      minBudget < 0 ||
      maxBudget < minBudget
    ) {
      setPreferenceMessage(
        "Choose a category and enter a valid budget range."
      );
      setPreferenceLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("shopsmart_token");
      const response = await fetch(`${API_URL}/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category_id: Number(preferenceForm.category_id),
          min_budget: minBudget,
          max_budget: maxBudget,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to save preferences"
        );
      }

      setPreferenceMessage("Preferences saved successfully!");
    } catch (error) {
      setPreferenceMessage(error.message);
    } finally {
      setPreferenceLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const token = sessionStorage.getItem("shopsmart_token");
      const response = await fetch(`${API_URL}/cart`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load cart");
      }
      setCartItems(data.items || []);
      setCartTotal(data.total || 0);
    } catch (error) {
      setMarketplaceMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Start Flask on port 5000."
          : error.message
      );
    }
  };

  const loadWishlist = async () => {
    try {
      const token = sessionStorage.getItem("shopsmart_token");
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to load wishlist");
      }
      setWishlistItems(data.items || []);
    } catch (error) {
      setMarketplaceMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Start Flask on port 5000."
          : error.message
      );
    }
  };

  const addToCart = async (product) => {
    setMarketplaceMessage("");
    try {
      const token = sessionStorage.getItem("shopsmart_token");
      const response = await fetch(`${API_URL}/cart`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: product.product_id,
          quantity: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to add to cart");
      }
      setMarketplaceMessage(`${product.product_name} added to cart.`);
      await loadCart();
    } catch (error) {
      setMarketplaceMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Start Flask on port 5000."
          : error.message
      );
    }
  };

  const addToWishlist = async (product) => {
    setMarketplaceMessage("");
    try {
      const token = sessionStorage.getItem("shopsmart_token");
      if (!token) {
        throw new Error("Please log in as a customer first.");
      }
      if (!product?.product_id) {
        throw new Error("This product is invalid.");
      }

      const response = await fetch(`${API_URL}/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ product_id: product.product_id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to add to wishlist");
      }
      setMarketplaceMessage(
        `${product.product_name} added to wishlist.`
      );
      await loadWishlist();
    } catch (error) {
      setMarketplaceMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the backend. Start Flask on port 5000."
          : error.message
      );
    }
  };

  const updateCartQuantity = async (item, quantity) => {
    const token = sessionStorage.getItem("shopsmart_token");
    const response = await fetch(`${API_URL}/cart/${item.cart_id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ quantity: Number(quantity) }),
    });
    if (response.ok) {
      await loadCart();
    }
  };

  const removeCartItem = async (item) => {
    const token = sessionStorage.getItem("shopsmart_token");
    const response = await fetch(`${API_URL}/cart/${item.cart_id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      await loadCart();
    }
  };

  const removeWishlistItem = async (productId) => {
    const token = sessionStorage.getItem("shopsmart_token");
    await fetch(`${API_URL}/wishlist/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadWishlist();
  };

  const checkout = async () => {
    const token = sessionStorage.getItem("shopsmart_token");
    try {
      const response = await fetch(`${API_URL}/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Checkout failed");
      }
      setMarketplaceMessage(
        `Order #${data.order_id} placed successfully.`
      );
      setCartItems([]);
      setCartTotal(0);
      setShowCart(false);
      await loadCart();
    } catch (error) {
      setMarketplaceMessage(error.message);
    }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    const token = sessionStorage.getItem("shopsmart_token");

    try {
      const response = await fetch(
        `${API_URL}/admin/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(categoryForm),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to add category");
      }

      setCategoryForm({
        category_name: "",
        description: "",
      });
      setMarketplaceMessage("Category added successfully.");
    } catch (error) {
      setMarketplaceMessage(error.message);
    }
  };

  const openProduct = (product) => {
    setSelectedProduct(product);

    if (currentUser?.role !== "customer") {
      return;
    }

    const token = sessionStorage.getItem("shopsmart_token");
    fetch(`${API_URL}/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        product_id: product.product_id,
        interaction_type: "view",
      }),
    }).catch(() => {});
  };

  // Display Seller Dashboard instead of the homepage.
  if (currentUser?.role === "seller" && showSellerDashboard) {
    return (
      <SellerDashboard
        onBack={() => setShowSellerDashboard(false)}
      />
    );
  }

  return (
    <div className="app">
      <nav className="navbar">
        <a href="#home" className="logo">
          Shop<span>Smart</span> AI
        </a>

        <div className="nav-links">
          <a href="#home">Home</a>
          <a href="#categories">Categories</a>
          <a href="#products">Products</a>
          <a href="#recommendations">AI Recommendations</a>
        </div>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <span>Hi, {currentUser.name}</span>

              {currentUser.role === "seller" && (
                <button
                  className="login-btn"
                  onClick={() => setShowSellerDashboard(true)}
                >
                  Seller Dashboard
                </button>
              )}

              {currentUser.role === "admin" && (
                <button
                  className="login-btn"
                  onClick={async () => {
                    setShowAdmin(true);
                    try {
                      const token =
                        sessionStorage.getItem("shopsmart_token");
                      const response = await fetch(
                        `${API_URL}/admin/dashboard`,
                        {
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );
                      const data = await response.json();
                      if (response.ok) {
                        setAdminData(data);
                      } else {
                        setMarketplaceMessage(
                          data.message || "Unable to load admin dashboard"
                        );
                      }
                    } catch (error) {
                      setMarketplaceMessage(error.message);
                    }
                  }}
                >
                  Admin Dashboard
                </button>
              )}

              {currentUser.role === "customer" && (
                <>
                  <button
                    className="login-btn"
                    onClick={openPreferences}
                  >
                    My Preferences
                  </button>
                  <button
                    className="login-btn"
                    onClick={() => setShowCart(true)}
                  >
                    Cart ({cartItems.length})
                  </button>
                  <button
                    className="login-btn"
                    onClick={() => setShowWishlist(true)}
                  >
                    Wishlist ({wishlistItems.length})
                  </button>
                  <button
                    className="login-btn"
                    onClick={async () => {
                      setShowOrders(true);
                      const token =
                        sessionStorage.getItem("shopsmart_token");
                      try {
                        const response = await fetch(
                          `${API_URL}/orders`,
                          {
                            headers: {
                              Authorization: `Bearer ${token}`,
                            },
                          }
                        );
                        const data = await response.json();
                        if (response.ok) {
                          setOrders(data.orders || []);
                        }
                      } catch (error) {
                        setMarketplaceMessage(error.message);
                      }
                    }}
                  >
                    Orders
                  </button>
                </>
              )}

              <button
                className="login-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                onClick={() => openAuth("login")}
              >
                Login
              </button>

              <button
                className="signup-btn"
                onClick={() => openAuth("register")}
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </nav>

      {marketplaceMessage && (
        <div
          className="marketplace-message"
          role="status"
        >
          <span>{marketplaceMessage}</span>
          <button
            type="button"
            onClick={() => setMarketplaceMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="tag">
              SMARTER SHOPPING STARTS HERE
            </span>

            <h1>
              Find Products.
              <br />
              <span>Make Smart Choices.</span>
            </h1>

            <p>
              Discover products from local shops and get intelligent
              recommendations based on your needs and budget.
            </p>

            <div className="search-box">
              <input
                type="text"
                placeholder="Search products, shops or categories..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <button
                onClick={() => {
                  if (search) {
                    setSearch("");
                  } else {
                    scrollToSection("products");
                  }
                }}
              >
                {search ? "Clear" : "Search"}
              </button>
            </div>

            <div className="hero-stats">
              <div>
                <strong>AI</strong>
                <span>Smart Discovery</span>
              </div>

              <div>
                <strong>Local</strong>
                <span>Shop Discovery</span>
              </div>

              <div>
                <strong>Easy</strong>
                <span>Product Comparison</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="visual-card main-visual">
              <span className="visual-icon">🛍️</span>
              <h2>Shop Smarter</h2>
              <p>Find what you need, within your budget.</p>
              <div className="visual-label">
                AI POWERED DISCOVERY
              </div>
            </div>

            <div className="floating-card">
              ✦ Intelligent Recommendations
            </div>
          </div>
        </section>

        <section className="categories section" id="categories">
          <div className="section-heading">
            <div>
              <span className="tag">EXPLORE PRODUCTS</span>
              <h2>Shop by Category</h2>
              <p>
                Explore different product categories from local shops.
              </p>
            </div>

            <span className="category-count">
              {categories.length} Categories
            </span>
          </div>

          {categoryLoading && (
            <p className="message">Loading categories...</p>
          )}

          {categoryError && (
            <p className="error">{categoryError}</p>
          )}

          {!categoryLoading && !categoryError && (
            <div className="category-grid">
              {filteredCategories.map((category) => (
                <article
                  className="category-card"
                  key={category.category_id}
                >
                  <div className="category-icon">
                    {categoryIcons[category.category_name] || "🛍️"}
                  </div>

                  <h3>{category.category_name}</h3>
                  <p>{category.description}</p>

                  <button
                    className="explore-link"
                    onClick={() => {
                      setSearch(category.category_name);
                      scrollToSection("products");
                    }}
                  >
                    Explore Products →
                  </button>
                </article>
              ))}
            </div>
          )}

          {!categoryLoading &&
            !categoryError &&
            filteredCategories.length === 0 && (
              <p className="message">
                No matching categories found.
              </p>
            )}
        </section>

        <section
          className="products-section section"
          id="products"
        >
          <div className="section-heading">
            <div>
              <span className="tag">
                AVAILABLE IN LOCAL SHOPS
              </span>
              <h2>Discover Products</h2>
              <p>
                Products retrieved directly from our database.
              </p>
            </div>

            <span className="category-count">
              {filteredProducts.length} Products
            </span>
          </div>

          {productLoading && (
            <p className="message">Loading products...</p>
          )}

          {productError && (
            <p className="error">{productError}</p>
          )}

          {!productLoading && !productError && (
            <>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article
                    className="product-card"
                    key={product.product_id}
                  >
                    <div className="product-image">
                      <span className="product-fallback">
                        {categoryIcons[product.category_name] || "🛍️"}
                      </span>

                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.product_name}
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>

                    <div className="product-details">
                      <span className="product-category">
                        {product.category_name}
                      </span>

                      <h3>{product.product_name}</h3>

                      <p className="product-description">
                        {product.description}
                      </p>

                      <h2 className="product-price">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </h2>

                      <div className="product-info">
                        <span>🏪 {product.shop_name}</span>

                        <span>
                          {product.stock > 0
                            ? `${product.stock} in stock`
                            : "Out of stock"}
                        </span>
                      </div>

                      <button
                        className="product-btn"
                        disabled={product.stock <= 0}
                        onClick={() => openProduct(product)}
                      >
                        {product.stock > 0
                          ? "View Product"
                          : "Out of Stock"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <p className="message">
                  No matching products found.
                </p>
              )}
            </>
          )}
        </section>

        {selectedProduct && (
          <div
            className="product-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setSelectedProduct(null);
              }
            }}
          >
            <div className="product-modal">
              <button
                className="modal-close"
                onClick={() => setSelectedProduct(null)}
              >
                ×
              </button>

              <div className="modal-image">
                <span>
                  {categoryIcons[selectedProduct.category_name] || "🛍️"}
                </span>

                {selectedProduct.image_url && (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.product_name}
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>

              <div className="modal-details">
                <span className="product-category">
                  {selectedProduct.category_name}
                </span>

                <h2>{selectedProduct.product_name}</h2>
                <p>{selectedProduct.description}</p>

                <h3>
                  ₹{Number(selectedProduct.price).toLocaleString("en-IN")}
                </h3>

                <div className="modal-info">
                  <p>Shop: {selectedProduct.shop_name}</p>
                  <p>Stock: {selectedProduct.stock} items</p>
                </div>

                {currentUser?.role === "customer" && (
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="product-btn"
                      disabled={selectedProduct.stock <= 0}
                      onClick={() => addToCart(selectedProduct)}
                    >
                      Add to Cart
                    </button>
                    <button
                      className="product-btn"
                      onClick={() => addToWishlist(selectedProduct)}
                    >
                      Add to Wishlist
                    </button>
                  </div>
                )}

                <button
                  className="product-btn"
                  onClick={() => setSelectedProduct(null)}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        <section
          className="recommendations section"
          id="recommendations"
        >
          <div>
            <span className="tag">PERSONALISED SHOPPING</span>
            <h2>AI Product Recommendations</h2>
            <p>
              Ranked using category preferences, shopping budget,
              product content and your activity.
            </p>
          </div>

          {recommendationLoading ? (
            <p className="message">Finding smart matches...</p>
          ) : recommendations.length === 0 ? (
            <p className="message">
              Add preferences or browse products to get recommendations.
            </p>
          ) : (
            <div className="product-grid" style={{ marginTop: "24px" }}>
              {recommendations.slice(0, 6).map((product) => (
                <article
                  className="product-card"
                  key={product.product_id}
                >
                  <div className="product-image">
                    <span className="product-fallback">
                      {categoryIcons[product.category_name] || "🛍️"}
                    </span>
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div className="product-details">
                    <span className="product-category">
                      {product.category_name}
                    </span>
                    <h3>{product.product_name}</h3>
                    <h2 className="product-price">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </h2>
                    <button
                      className="product-btn"
                      onClick={() => openProduct(product)}
                    >
                      View Recommendation
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {showWishlist && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowWishlist(false);
            }
          }}
        >
          <div className="auth-modal shop-panel wishlist-panel">
            <button
              className="modal-close"
              onClick={() => setShowWishlist(false)}
            >
              ×
            </button>
            <h2>My Wishlist</h2>

            {wishlistItems.length === 0 ? (
              <p>Your wishlist is empty.</p>
            ) : (
              wishlistItems.map((item) => (
                <div
                  key={item.wishlist_id}
                  className="shop-list-item wishlist-item"
                >
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  )}
                  <div className="shop-item-copy">
                    <strong>{item.product_name}</strong>
                    <p>
                      ₹
                      {Number(item.price).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="remove-shop-item"
                    onClick={() =>
                      removeWishlistItem(item.product_id)
                    }
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showOrders && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowOrders(false);
            }
          }}
        >
          <div className="auth-modal shop-panel">
            <button
              className="modal-close"
              onClick={() => setShowOrders(false)}
            >
              ×
            </button>
            <h2>My Orders</h2>
            {orders.length === 0 ? (
              <p>No orders placed yet.</p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.order_id}
                  className="shop-list-item"
                  style={{ gridTemplateColumns: "1fr" }}
                >
                  <strong>
                    Order #{order.order_id} — ₹
                    {Number(order.total).toLocaleString("en-IN")}
                  </strong>
                  <p>Status: {order.status}</p>
                  {order.items.map((item, index) => (
                    <p key={`${order.order_id}-${index}`}>
                      {item.product_name} × {item.quantity}
                    </p>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showAdmin && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowAdmin(false);
            }
          }}
        >
          <div className="auth-modal shop-panel">
            <button
              className="modal-close"
              onClick={() => setShowAdmin(false)}
            >
              ×
            </button>
            <h2>Admin Dashboard</h2>
            {adminData ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {Object.entries(adminData.counts).map(
                    ([name, count]) => (
                      <div
                        key={name}
                        className="shop-list-item"
                        style={{ gridTemplateColumns: "1fr" }}
                      >
                        <strong>{count}</strong>
                        <p>{name}</p>
                      </div>
                    )
                  )}
                </div>
                <h3
                  style={{
                    marginTop: "18px",
                    color: "#2563eb",
                  }}
                >
                  Revenue: ₹
                  {Number(adminData.revenue).toLocaleString("en-IN")}
                </h3>
                <form
                  onSubmit={addCategory}
                  style={{
                    display: "grid",
                    gap: "10px",
                    marginTop: "20px",
                  }}
                >
                  <h3>Manage Categories</h3>
                  <input
                    required
                    placeholder="Category name"
                    value={categoryForm.category_name}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        category_name: event.target.value,
                      })
                    }
                  />
                  <input
                    placeholder="Description"
                    value={categoryForm.description}
                    onChange={(event) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: event.target.value,
                      })
                    }
                  />
                  <button
                    type="submit"
                    className="signup-btn"
                  >
                    Add Category
                  </button>
                </form>
              </>
            ) : (
              <p>Loading admin data...</p>
            )}
          </div>
        </div>
      )}

      {showCart && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCart(false);
            }
          }}
        >
          <div className="auth-modal shop-panel cart-panel">
            <button
              className="modal-close"
              onClick={() => setShowCart(false)}
            >
              ×
            </button>

            <h2>My Cart</h2>

            {cartItems.length === 0 ? (
              <p>Your cart is empty.</p>
            ) : (
              <div>
                {cartItems.map((item) => (
                  <div
                    key={item.cart_id}
                    className="shop-list-item cart-item"
                  >
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                    <div className="shop-item-copy">
                      <strong>{item.product_name}</strong>
                      <p>
                        ₹
                        {Number(item.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="cart-item-actions">
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={(event) =>
                          updateCartQuantity(
                            item,
                            event.target.value
                          )
                        }
                        aria-label={`Quantity for ${item.product_name}`}
                      />
                      <button
                        type="button"
                        className="remove-shop-item"
                        onClick={() => removeCartItem(item)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <h3>
                  Total: ₹
                  {Number(cartTotal).toLocaleString("en-IN")}
                </h3>
                <button
                  type="button"
                  className="signup-btn auth-submit"
                  onClick={checkout}
                  style={{ marginTop: "14px" }}
                >
                  Place Order
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPreferences && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowPreferences(false);
            }
          }}
        >
          <div className="auth-modal">
            <button
              className="modal-close"
              onClick={() => setShowPreferences(false)}
            >
              ×
            </button>

            <h2>My Shopping Preferences</h2>
            <p>Choose a category and budget range.</p>

            <form onSubmit={savePreferences}>
              <select
                required
                value={preferenceForm.category_id}
                onChange={(event) =>
                  setPreferenceForm({
                    ...preferenceForm,
                    category_id: event.target.value,
                  })
                }
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option
                    key={category.category_id}
                    value={category.category_id}
                  >
                    {category.category_name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Minimum Budget (₹)"
                value={preferenceForm.min_budget}
                onChange={(event) =>
                  setPreferenceForm({
                    ...preferenceForm,
                    min_budget: event.target.value,
                  })
                }
              />

              <input
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Maximum Budget (₹)"
                value={preferenceForm.max_budget}
                onChange={(event) =>
                  setPreferenceForm({
                    ...preferenceForm,
                    max_budget: event.target.value,
                  })
                }
              />

              {preferenceMessage && (
                <p className="auth-message">
                  {preferenceMessage}
                </p>
              )}

              <button
                className="signup-btn auth-submit"
                type="submit"
                disabled={preferenceLoading}
              >
                {preferenceLoading
                  ? "Please wait..."
                  : "Save Preferences"}
              </button>
            </form>
          </div>
        </div>
      )}

      {authMode && (
        <div
          className="product-modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setAuthMode("");
            }
          }}
        >
          <div className="auth-modal">
            <button
              className="modal-close"
              onClick={() => setAuthMode("")}
            >
              ×
            </button>

            <h2>
              {authMode === "login"
                ? "Welcome Back"
                : "Create Your Account"}
            </h2>

            <p>
              {authMode === "login"
                ? "Login to ShopSmart AI"
                : "Join the ShopSmart AI marketplace"}
            </p>

            <form onSubmit={handleAuth}>
              {authMode === "register" && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        name: event.target.value,
                      })
                    }
                  />

                  <select
                    value={authForm.role}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        role: event.target.value,
                      })
                    }
                  >
                    <option value="customer">Customer</option>
                    <option value="seller">Seller</option>
                  </select>
                </>
              )}

              <input
                type="email"
                placeholder="Email Address"
                required
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    email: event.target.value,
                  })
                }
              />

              <input
                type="password"
                placeholder="Password (minimum 8 characters)"
                required
                minLength={8}
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    password: event.target.value,
                  })
                }
              />

              {authMessage && (
                <p className="auth-message">{authMessage}</p>
              )}

              <button
                className="signup-btn auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "login"
                    ? "Login"
                    : "Create Account"}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                type="button"
                onClick={() => {
                  setAuthMessage("");

                  setAuthMode(
                    authMode === "login" ? "register" : "login"
                  );
                }}
              >
                {authMode === "login" ? "Register" : "Login"}
              </button>
            </p>
          </div>
        </div>
      )}

      <footer>
        <a href="#home" className="logo">
          Shop<span>Smart</span> AI
        </a>

        <p>Smart Shopping. Better Decisions.</p>
        <p>© 2026 ShopSmart AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

// ======================================
// SELLER DASHBOARD
// ======================================

function SellerDashboard({ onBack }) {
  const token = sessionStorage.getItem("shopsmart_token");

  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [editingProductId, setEditingProductId] = useState(null);
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [inventoryDraft, setInventoryDraft] = useState({});

  const [shopForm, setShopForm] = useState({
    shop_name: "",
    description: "",
    address: "",
    phone: "",
  });

  const [productForm, setProductForm] = useState({
    shop_id: "",
    category_id: "",
    product_name: "",
    description: "",
    price: "",
    stock: "",
    image_url: "",
  });

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [dashboardResponse, categoryResponse] =
        await Promise.all([
          fetch(`${API_URL}/seller/dashboard`, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${API_URL}/categories`),
        ]);

      const dashboardData = await dashboardResponse.json();
      const categoryData = await categoryResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(
          dashboardData.message || "Unable to load dashboard"
        );
      }

      if (!categoryResponse.ok) {
        throw new Error("Unable to load categories");
      }

      setShops(dashboardData.shops || []);
      setProducts(dashboardData.products || []);
      setCategories(categoryData.categories || []);
      setMessage("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [dashboardResponse, categoryResponse] =
          await Promise.all([
            fetch(`${API_URL}/seller/dashboard`, {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }),
            fetch(`${API_URL}/categories`),
          ]);

        const dashboardData = await dashboardResponse.json();
        const categoryData = await categoryResponse.json();

        if (!dashboardResponse.ok) {
          throw new Error(
            dashboardData.message || "Unable to load dashboard"
          );
        }

        if (!categoryResponse.ok) {
          throw new Error("Unable to load categories");
        }

        setShops(dashboardData.shops || []);
        setProducts(dashboardData.products || []);
        setCategories(categoryData.categories || []);
        setMessage("");
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [token]);

  const registerShop = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/shops/register`, {
        method: "POST",
        headers,
        body: JSON.stringify(shopForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Shop registration failed"
        );
      }

      setShopForm({
        shop_name: "",
        description: "",
        address: "",
        phone: "",
      });

      setMessage("Shop registered successfully!");

      await loadDashboard();
      setActiveTab("shops");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const startEditingProduct = (product) => {
    setEditingProductId(product.product_id);
    setProductImageFile(null);
    setProductImagePreview(product.image_url || "");
    setProductForm({
      shop_id: String(product.shop_id),
      category_id: String(product.category_id),
      product_name: product.product_name,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      image_url: product.image_url || "",
    });
    setMessage("");
    setActiveTab("add-product");
  };

  const deleteProduct = async (product) => {
    if (
      !window.confirm(
        `Delete "${product.product_name}"? This cannot be undone.`
      )
    ) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/products/${product.product_id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Product deletion failed"
        );
      }

      setMessage("Product deleted successfully!");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const updateInventory = async (product) => {
    const stock = Number(
      inventoryDraft[product.product_id] ?? product.stock
    );

    if (!Number.isInteger(stock) || stock < 0) {
      setMessage("Stock must be a non-negative whole number.");
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/products/${product.product_id}/stock`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ stock }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Inventory update failed"
        );
      }

      setMessage("Inventory updated successfully!");
      await loadDashboard();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    setMessage("");

    const productName = productForm.product_name.trim();
    const description = productForm.description.trim();
    const price = Number(productForm.price);
    const stock = Number(productForm.stock);

    if (!productName) {
      setMessage("Product name is required.");
      return;
    }

    if (productName.length > 150) {
      setMessage("Product name cannot exceed 150 characters.");
      return;
    }

    if (description.length > 1000) {
      setMessage("Product description cannot exceed 1000 characters.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setMessage("Price must be zero or a positive number.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setMessage("Stock must be a non-negative whole number.");
      return;
    }

    if (productForm.image_url.length > 500) {
      setMessage("Product image URL cannot exceed 500 characters.");
      return;
    }

    try {
      const isEditing = editingProductId !== null;
      let imageUrl = productForm.image_url.trim();

      if (productImageFile) {
        const uploadData = new FormData();
        uploadData.append("image", productImageFile);

        const uploadResponse = await fetch(
          `${API_URL}/products/upload-image`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: uploadData,
          }
        );

        const uploadedImage = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(
            uploadedImage.message || "Image upload failed"
          );
        }

        imageUrl = uploadedImage.image_url;
      }

      const response = await fetch(
        isEditing
          ? `${API_URL}/products/${editingProductId}`
          : `${API_URL}/products/register`,
        {
        method: isEditing ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          ...productForm,
          product_name: productName,
          description,
          shop_id: Number(productForm.shop_id),
          category_id: Number(productForm.category_id),
          price,
          stock,
          image_url: imageUrl,
        }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            (editingProductId
              ? "Product update failed"
              : "Product registration failed")
        );
      }

      setProductForm({
        shop_id: "",
        category_id: "",
        product_name: "",
        description: "",
        price: "",
        stock: "",
        image_url: "",
      });

      setEditingProductId(null);
      setProductImageFile(null);
      setProductImagePreview("");
      setMessage(
        editingProductId
          ? "Product updated successfully!"
          : "Product added successfully!"
      );

      await loadDashboard();
      setActiveTab("products");
    } catch (error) {
      setMessage(error.message);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "8px",
    border: "1px solid #ccd3e0",
    boxSizing: "border-box",
    fontSize: "14px",
  };

  const buttonStyle = {
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    background: "#245bdb",
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
  };

  if (loading) {
    return (
      <div style={{ padding: 40 }}>
        Loading seller dashboard...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "30px",
        background: "#f3f6fc",
        color: "#17233f",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 15,
        }}
      >
        <div>
          <h1>Seller Dashboard</h1>
          <p>Manage your shops, products and inventory.</p>
        </div>

        <button style={buttonStyle} onClick={onBack}>
          Back to Store
        </button>
      </div>

      {message && (
        <p
          style={{
            padding: 12,
            background: "#e4edff",
            borderRadius: 8,
          }}
        >
          {message}
        </p>
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          margin: "25px 0",
        }}
      >
        {[
          ["overview", "Overview"],
          ["shops", "My Shops"],
          ["add-shop", "Register Shop"],
          ["add-product", "Add Product"],
          ["products", "My Products"],
          ["inventory", "Inventory"],
        ].map(([tab, label]) => (
          <button
            key={tab}
            style={{
              ...buttonStyle,
              background:
                activeTab === tab ? "#142d65" : "#245bdb",
            }}
            onClick={() => setActiveTab(tab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(180px,1fr))",
            gap: 18,
          }}
        >
          <div style={statStyle}>
            <h2>{shops.length}</h2>
            <p>Total Shops</p>
          </div>

          <div style={statStyle}>
            <h2>{products.length}</h2>
            <p>Total Products</p>
          </div>

          <div style={statStyle}>
            <h2>
              {products.reduce(
                (sum, product) => sum + Number(product.stock),
                0
              )}
            </h2>
            <p>Total Stock Units</p>
          </div>

          <div style={statStyle}>
            <h2>
              {
                products.filter(
                  (product) => Number(product.stock) === 0
                ).length
              }
            </h2>
            <p>Out of Stock</p>
          </div>
        </div>
      )}

      {activeTab === "shops" && (
        <div style={panelStyle}>
          <h2>My Shops</h2>

          {shops.length === 0 ? (
            <p>No shops registered yet.</p>
          ) : (
            shops.map((shop) => (
              <div key={shop.shop_id} style={itemStyle}>
                <h3>{shop.shop_name}</h3>
                <p>{shop.description}</p>
                <p>{shop.address}</p>
                <p>Phone: {shop.phone}</p>
                <small>Shop ID: {shop.shop_id}</small>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "add-shop" && (
        <form onSubmit={registerShop} style={panelStyle}>
          <h2>Register Your Shop</h2>

          <input
            style={inputStyle}
            placeholder="Shop Name"
            required
            value={shopForm.shop_name}
            onChange={(event) =>
              setShopForm({
                ...shopForm,
                shop_name: event.target.value,
              })
            }
          />

          <textarea
            style={inputStyle}
            placeholder="Shop Description"
            value={shopForm.description}
            onChange={(event) =>
              setShopForm({
                ...shopForm,
                description: event.target.value,
              })
            }
          />

          <input
            style={inputStyle}
            placeholder="Shop Address"
            value={shopForm.address}
            onChange={(event) =>
              setShopForm({
                ...shopForm,
                address: event.target.value,
              })
            }
          />

          <input
            style={inputStyle}
            placeholder="Phone Number"
            value={shopForm.phone}
            onChange={(event) =>
              setShopForm({
                ...shopForm,
                phone: event.target.value,
              })
            }
          />

          <button style={buttonStyle} type="submit">
            Register Shop
          </button>
        </form>
      )}

      {activeTab === "add-product" && (
        <form onSubmit={addProduct} style={panelStyle}>
          <h2>
            {editingProductId
              ? "Edit Product"
              : "Add New Product"}
          </h2>

          <select
            style={inputStyle}
            required
            value={productForm.shop_id}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                shop_id: event.target.value,
              })
            }
          >
            <option value="">Select Your Shop</option>

            {shops.map((shop) => (
              <option
                key={shop.shop_id}
                value={shop.shop_id}
              >
                {shop.shop_name}
              </option>
            ))}
          </select>

          <select
            style={inputStyle}
            required
            value={productForm.category_id}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                category_id: event.target.value,
              })
            }
          >
            <option value="">Select Category</option>

            {categories.map((category) => (
              <option
                key={category.category_id}
                value={category.category_id}
              >
                {category.category_name}
              </option>
            ))}
          </select>

          <input
            style={inputStyle}
            placeholder="Product Name"
            required
            maxLength={150}
            value={productForm.product_name}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                product_name: event.target.value,
              })
            }
          />

          <textarea
            style={inputStyle}
            placeholder="Product Description"
            maxLength={1000}
            value={productForm.description}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                description: event.target.value,
              })
            }
          />

          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            placeholder="Price (₹)"
            required
            value={productForm.price}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                price: event.target.value,
              })
            }
          />

          <input
            style={inputStyle}
            type="number"
            min="0"
            step="1"
            placeholder="Stock Quantity"
            required
            value={productForm.stock}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                stock: event.target.value,
              })
            }
          />

          <input
            style={inputStyle}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(event) => {
              const file = event.target.files?.[0] || null;

              if (!file) {
                setProductImageFile(null);
                setProductImagePreview("");
                return;
              }

              if (file.size > 5 * 1024 * 1024) {
                setMessage("The image cannot exceed 5 MB.");
                event.target.value = "";
                return;
              }

              setProductImageFile(file);
              setProductImagePreview(URL.createObjectURL(file));
              setMessage("");
            }}
          />

          {productImagePreview && (
            <img
              src={productImagePreview}
              alt="Product preview"
              style={{
                width: "160px",
                height: "160px",
                objectFit: "cover",
                borderRadius: "10px",
                marginBottom: "12px",
                border: "1px solid #ccd3e0",
              }}
            />
          )}

          <input
            style={inputStyle}
            type="url"
            placeholder="Or enter Product Image URL (optional)"
            maxLength={500}
            value={productForm.image_url}
            onChange={(event) =>
              setProductForm({
                ...productForm,
                image_url: event.target.value,
              })
            }
          />

          <button
            style={buttonStyle}
            type="submit"
            disabled={shops.length === 0}
          >
            {editingProductId
              ? "Update Product"
              : "Add Product"}
          </button>

          {editingProductId && (
            <button
              type="button"
              style={{
                ...buttonStyle,
                marginLeft: "10px",
                background: "#64748b",
              }}
              onClick={() => {
                setEditingProductId(null);
                setProductImageFile(null);
                setProductImagePreview("");
                setProductForm({
                  shop_id: "",
                  category_id: "",
                  product_name: "",
                  description: "",
                  price: "",
                  stock: "",
                  image_url: "",
                });
                setMessage("");
              }}
            >
              Cancel Editing
            </button>
          )}

          {shops.length === 0 && (
            <p>
              Register a shop before adding products.
            </p>
          )}
        </form>
      )}

      {activeTab === "inventory" && (
        <div style={panelStyle}>
          <h2>Inventory Management</h2>

          {products.length === 0 ? (
            <p>No products available to manage.</p>
          ) : (
            products.map((product) => (
              <div
                key={product.product_id}
                style={{
                  ...itemStyle,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3>{product.product_name}</h3>
                  <p>
                    {Number(product.stock) === 0
                      ? "Out of stock"
                      : Number(product.stock) <= 5
                        ? "Low stock"
                        : "In stock"}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={
                      inventoryDraft[product.product_id] ??
                      product.stock
                    }
                    onChange={(event) =>
                      setInventoryDraft({
                        ...inventoryDraft,
                        [product.product_id]: event.target.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      width: "120px",
                      marginBottom: 0,
                    }}
                  />
                  <button
                    type="button"
                    style={buttonStyle}
                    onClick={() => updateInventory(product)}
                  >
                    Update Stock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "products" && (
        <div style={panelStyle}>
          <h2>My Products</h2>

          {products.length === 0 ? (
            <p>No products added yet.</p>
          ) : (
            products.map((product) => (
              <div
                key={product.product_id}
                style={itemStyle}
              >
                <h3>{product.product_name}</h3>
                <p>{product.category_name}</p>
                <p>Shop: {product.shop_name}</p>

                <p>
                  Price: ₹
                  {Number(product.price).toLocaleString("en-IN")}
                </p>

                <p>Stock: {product.stock}</p>

                <small>
                  Product ID: {product.product_id}
                </small>

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    marginTop: "12px",
                  }}
                  onClick={() => startEditingProduct(product)}
                >
                  Edit Product
                </button>

                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    marginTop: "12px",
                    marginLeft: "10px",
                    background: "#dc2626",
                  }}
                  onClick={() => deleteProduct(product)}
                >
                  Delete Product
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ======================================
// SELLER DASHBOARD STYLES
// ======================================

const statStyle = {
  background: "white",
  padding: 25,
  borderRadius: 14,
  boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
};

const panelStyle = {
  background: "white",
  padding: 25,
  borderRadius: 14,
  maxWidth: 650,
  boxShadow: "0 3px 15px rgba(0,0,0,0.05)",
};

const itemStyle = {
  background: "#f5f7fc",
  padding: 18,
  marginTop: 15,
  borderRadius: 10,
};

export default App;
