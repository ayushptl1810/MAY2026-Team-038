import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listProducts } from "../api/shop";

const priceRanges = [
  { id: "all", label: "All Prices", test: null },
  { id: "under-500", label: "Under ₹500", test: (p) => p < 500 },
  { id: "500-1500", label: "₹500 – ₹1,500", test: (p) => p >= 500 && p <= 1500 },
  { id: "1500-3000", label: "₹1,500 – ₹3,000", test: (p) => p > 1500 && p <= 3000 },
  { id: "above-3000", label: "Above ₹3,000", test: (p) => p > 3000 },
];

export default function HeritageShop() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("featured");
  const [cartItems, setCartItems] = useState([]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadCart = () => {
      const cart = JSON.parse(localStorage.getItem("heritage_cart")) || [];
      setCartItems(cart);
    };

    loadCart();
    window.addEventListener("focus", loadCart);
    return () => window.removeEventListener("focus", loadCart);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setError("");

        const data = await listProducts();

        const formattedProducts = data.map((product) => ({
          ...product,
          price: product.price_cents / 100,
          image: product.image_url || "",
          shortDescription:
            product.description || "Heritage product from the INTACH marketplace.",
        }));

        setProducts(formattedProducts);
      } catch (err) {
        console.error("Failed to load products:", err);
        setError(err.message || "Failed to load products.");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((item) => item.category))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const range = priceRanges.find((r) => r.id === priceRange);

    const list = products.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;

      const searchText = searchQuery.toLowerCase();

      const matchesSearch =
        item.name.toLowerCase().includes(searchText) ||
        (item.shortDescription || "").toLowerCase().includes(searchText);

      const matchesPrice = !range?.test || range.test(item.price);

      return matchesCategory && matchesSearch && matchesPrice;
    });

    if (sortBy === "price-asc") {
      list.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-desc") {
      list.sort((a, b) => b.price - a.price);
    } else if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [
    products,
    activeCategory,
    searchQuery,
    priceRange,
    sortBy,
  ]);

  const cartCount = cartItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const addToCart = (product) => {
    if (!localStorage.getItem("intach_token")) {
      navigate("/login");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("heritage_cart")) || [];
    const existing = cart.find((item) => item.id === product.id);

    const updatedCart = existing
      ? cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      : [...cart, { ...product, quantity: 1 }];

    localStorage.setItem("heritage_cart", JSON.stringify(updatedCart));
    setCartItems(updatedCart);
  };

  const clearFilters = () => {
    setActiveCategory("All");
    setPriceRange("all");
    setSearchQuery("");
  };

  const filtersActive =
    activeCategory !== "All" ||
    priceRange !== "all" ||
    searchQuery !== "";

  return (
    <main className="min-h-screen bg-[#f8ecd7] px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-5 border-b border-heritage-border/40 pb-6 mb-8 text-left">
          <div>
            <p className="font-sans text-xs font-bold uppercase tracking-[0.22em] text-heritage-bronze">
              Warsaa — The Heritage Shop
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl font-bold text-heritage-espresso mt-2">
              Heritage Marketplace
            </h1>

            <p className="mt-2 text-sm text-heritage-charcoal/70 font-sans max-w-xl">
              Authentic, handcrafted products from Pune's artisan guilds —
              every purchase supports heritage conservation.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() =>
                navigate("/checkout", {
                  state: { cartItems, totalAmount },
                })
              }
              aria-label={`View cart, ${cartCount} item${
                cartCount === 1 ? "" : "s"
              }`}
              className="relative flex items-center gap-2 bg-heritage-red hover:bg-heritage-red/90 text-white font-semibold text-sm py-2.5 px-5 rounded shadow shadow-heritage-red/15 cursor-pointer transition-colors active:scale-95 duration-150"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>

              <span>Cart</span>

              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-white text-heritage-red text-[10px] font-bold border border-heritage-red/20">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/orders")}
              className="flex items-center gap-2 border border-heritage-border/80 text-heritage-charcoal hover:bg-heritage-cream font-semibold text-sm py-2.5 px-5 rounded transition-colors active:scale-95 duration-150 cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 8l4-4h10l4 4M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8M3 8h18M9 12h6"
                />
              </svg>

              <span>My Orders</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-60 shrink-0">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg font-bold text-heritage-espresso">
                  Filters
                </h3>

                {filtersActive && (
                  <button
                    onClick={clearFilters}
                    className="text-xs font-semibold text-heritage-red hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="border-t border-heritage-border/40 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-heritage-charcoal/60 mb-3">
                  Category
                </h4>

                <div className="space-y-2.5">
                  {categories.map((category) => {
                    const count =
                      category === "All"
                        ? products.length
                        : products.filter(
                            (item) => item.category === category
                          ).length;

                    const isActive = activeCategory === category;

                    return (
                      <label
                        key={category}
                        className="flex items-center justify-between gap-2 cursor-pointer group"
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="category"
                            checked={isActive}
                            onChange={() => setActiveCategory(category)}
                            className="h-4 w-4 accent-heritage-red cursor-pointer"
                          />

                          <span
                            className={`text-sm transition-colors ${
                              isActive
                                ? "font-semibold text-heritage-espresso"
                                : "text-heritage-charcoal/75 group-hover:text-heritage-red"
                            }`}
                          >
                            {category}
                          </span>
                        </span>

                        <span className="text-xs text-heritage-charcoal/40">
                          {count}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-heritage-border/40 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-heritage-charcoal/60 mb-3">
                  Price
                </h4>

                <div className="space-y-2.5">
                  {priceRanges.map((range) => {
                    const isActive = priceRange === range.id;

                    return (
                      <label
                        key={range.id}
                        className="flex items-center gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="radio"
                          name="price"
                          checked={isActive}
                          onChange={() => setPriceRange(range.id)}
                          className="h-4 w-4 accent-heritage-red cursor-pointer"
                        />

                        <span
                          className={`text-sm transition-colors ${
                            isActive
                              ? "font-semibold text-heritage-espresso"
                              : "text-heritage-charcoal/75 group-hover:text-heritage-red"
                          }`}
                        >
                          {range.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Search + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="relative w-full sm:w-72">
                <svg
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-heritage-charcoal/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>

                <input
                  type="text"
                  placeholder="Search heritage products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search heritage products"
                  className="w-full bg-white border border-heritage-border/60 text-heritage-espresso text-sm rounded-lg pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-bronze"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label
                  htmlFor="sortBy"
                  className="text-xs font-semibold text-heritage-charcoal/60 whitespace-nowrap"
                >
                  Sort by
                </label>

                <select
                  id="sortBy"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-heritage-border/60 text-heritage-espresso text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-heritage-bronze cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>
              </div>
            </div>

            <p className="text-xs text-heritage-charcoal/60 font-sans mb-5">
              {filteredProducts.length} product
              {filteredProducts.length === 1 ? "" : "s"}
            </p>

            {/* Products */}
            {loading ? (
              <div className="rounded-lg bg-heritage-cream-light border border-heritage-border/40 p-14 text-center">
                <p className="text-sm font-sans text-heritage-charcoal/60">
                  Loading heritage products...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-lg bg-heritage-cream-light border border-red-300 p-14 text-center">
                <h2 className="font-serif text-xl font-semibold text-heritage-espresso">
                  Unable to Load Products
                </h2>

                <p className="text-sm font-sans text-heritage-charcoal/60 mt-2">
                  {error}
                </p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-lg bg-heritage-cream-light border border-heritage-border/40 p-14 text-center">
                <svg
                  className="w-8 h-8 mx-auto text-heritage-charcoal/40"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  />
                </svg>

                <h2 className="font-serif text-xl font-semibold text-heritage-espresso mt-3">
                  No Products Found
                </h2>

                <p className="text-sm font-sans text-heritage-charcoal/60 mt-1">
                  Try another search or filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="group p-5 rounded-lg border border-heritage-border bg-heritage-cream-dark shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 text-left flex flex-col"
                  >
                    <div className="w-full h-44 overflow-hidden rounded border border-heritage-border/30 bg-heritage-cream-light mb-4 shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>

                    <div className="mt-4 flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-heritage-charcoal/60">
                          {product.category}
                        </span>

                        <h4 className="font-serif font-bold text-heritage-espresso text-lg mt-0.5">
                          {product.name}
                        </h4>
                      </div>

                      <span className="font-mono font-bold text-heritage-espresso text-base shrink-0 mt-0.5">
                        ₹{product.price}
                      </span>
                    </div>

                    <p className="text-xs text-heritage-charcoal/80 leading-relaxed mt-2.5 flex-grow">
                      {product.shortDescription}
                    </p>

                    <div className="mt-6 flex gap-2">
                      <button
                        onClick={() => addToCart(product)}
                        aria-label={`Add ${product.name} to cart`}
                        className="flex-1 py-1.5 bg-heritage-red text-white text-[10px] font-semibold rounded hover:bg-heritage-red/90 transition-colors flex items-center justify-center gap-1 cursor-pointer active:scale-95 duration-150"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                          />
                        </svg>

                        <span>Add to Cart</span>
                      </button>

                      <button
                        onClick={() => navigate(`/product/${product.id}`)}
                        aria-label={`View details for ${product.name}`}
                        className="flex-1 py-1.5 border border-heritage-border text-heritage-espresso text-[10px] font-medium rounded hover:bg-heritage-cream transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>View Details</span>

                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}