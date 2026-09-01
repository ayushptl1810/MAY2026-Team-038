import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getProduct } from "../api/shop";

function StarRating({ rating, reviews }) {
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <div className="flex items-center gap-0.5 text-heritage-bronze">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill={star <= Math.round(rating) ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.5a.563.563 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0l-4.725 2.885a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557L2.043 10.386a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        ))}
      </div>
      <span className="text-sm text-heritage-charcoal/60 font-sans">
        {rating} ({reviews} reviews)
      </span>
    </div>
  );
}

export default function ProductDetails() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError("");

        const apiProduct = await getProduct(id);

        setProduct({
          ...apiProduct,
          price: apiProduct.price_cents / 100,
          image: apiProduct.image_url,
          gallery: apiProduct.image_url ? [apiProduct.image_url] : [],
          shortDescription: apiProduct.description || "",
          rating: apiProduct.rating || 0,
          reviews: apiProduct.reviews || 0,
          story: apiProduct.story || apiProduct.description || "",
          material: apiProduct.material || "Not specified",
          origin: apiProduct.origin || "Not specified",
          dimensions: apiProduct.dimensions || "Not specified",
          care: apiProduct.care || "Not specified",
        });
      } catch (err) {
        console.error("Failed to load product:", err);
        setError(err.message || "Failed to load product.");
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8ecd7] flex items-center justify-center px-4">
        <p className="text-sm text-heritage-charcoal/60">
          Loading product...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f8ecd7] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-heritage-espresso">
          Unable to Load Product
        </h2>
        <p className="text-sm text-heritage-charcoal/60">{error}</p>
        <button
          onClick={() => navigate("/shop")}
          className="bg-heritage-red hover:bg-heritage-red/90 text-white font-semibold text-sm py-2.5 px-6 rounded shadow shadow-heritage-red/15 cursor-pointer"
        >
          Back to Heritage Shop
        </button>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-[#f8ecd7] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <svg
          className="w-10 h-10 text-heritage-charcoal/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h2 className="font-serif text-2xl font-bold text-heritage-espresso">
          Product Not Found
        </h2>
        <button
          onClick={() => navigate("/shop")}
          className="bg-heritage-red hover:bg-heritage-red/90 text-white font-semibold text-sm py-2.5 px-6 rounded shadow shadow-heritage-red/15 cursor-pointer transition-colors active:scale-95 duration-150"
        >
          Back to Heritage Shop
        </button>
      </main>
    );
  }

  const addToCart = () => {
    if (!localStorage.getItem("intach_token")) {
      navigate("/login");
      return;
    }

    const cart = JSON.parse(localStorage.getItem("heritage_cart")) || [];
    const existing = cart.find((item) => item.id === product.id);

    let updatedCart;
    if (existing) {
      updatedCart = cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      updatedCart = [...cart, { ...product, quantity }];
    }

    localStorage.setItem("heritage_cart", JSON.stringify(updatedCart));
    navigate("/shop");
  };

  const buyNow = () => {
    navigate("/checkout", {
      state: { buyNow: true, items: [{ ...product, quantity }] },
    });
  };

  return (
    <main className="min-h-screen bg-[#f8ecd7] px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 font-sans text-xs font-semibold text-heritage-charcoal/60 hover:text-heritage-red transition-colors cursor-pointer mb-6"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Continue Shopping
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-10 bg-heritage-cream-light rounded-xl border border-heritage-border/80 shadow-[0_4px_15px_rgba(43,33,24,0.04)] p-6 sm:p-8">
          {/* Gallery */}
          <div>
            <div className="rounded-lg overflow-hidden border border-heritage-border/60 bg-heritage-cream aspect-square group">
              <img
                src={product.gallery[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {product.gallery.length > 1 && (
              <div className="flex gap-2 mt-3">
                {product.gallery.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    aria-label={`View image ${index + 1}`}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage === index
                        ? "border-heritage-bronze"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs text-heritage-charcoal/50 italic text-center mt-3 font-sans">
              Images shown are representative of handcrafted heritage products.
            </p>
          </div>

          {/* Info */}
          <div className="text-left">
            <span className="inline-block px-2.5 py-1 rounded-full border border-heritage-border text-[10px] font-bold uppercase tracking-wider font-mono bg-heritage-cream text-heritage-charcoal">
              {product.category}
            </span>
            <h1 className="font-serif text-3xl font-bold text-heritage-espresso mt-3">
              {product.name}
            </h1>

            <StarRating rating={product.rating} reviews={product.reviews} />

            <div className="font-mono text-3xl font-bold text-heritage-espresso mt-4">
              ₹{product.price}
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {["Handcrafted", "Authentic Heritage", "Supports Local Artisans"].map(
                (tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 bg-heritage-cream text-heritage-charcoal/80 border border-heritage-border/50 px-2.5 py-1 rounded-full text-[11px] font-medium font-sans"
                  >
                    <svg
                      className="w-3 h-3 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {tag}
                  </span>
                )
              )}
            </div>

            <p className="mt-5 text-sm text-heritage-charcoal/80 leading-relaxed font-sans">
              {product.description}
            </p>

            <div className="mt-5 bg-heritage-cream/60 border-l-4 border-heritage-bronze rounded-r-lg p-4">
              <h3 className="font-serif font-bold text-heritage-espresso flex items-center gap-2 text-sm">
                <svg
                  className="w-4 h-4 text-heritage-bronze"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 21h18M4 18h16M6 18v-7m4 7v-7m4 7v-7m4 7v-7M4 11l8-6 8 6"
                  />
                </svg>
                Heritage Story
              </h3>
              <p className="mt-1.5 text-sm text-heritage-charcoal/80 leading-relaxed font-sans">
                {product.story}
              </p>
            </div>

            <div className="mt-4 bg-heritage-cream/40 border border-heritage-border/40 rounded-lg p-4">
              <h4 className="font-serif font-bold text-heritage-espresso text-sm">
                Authenticity
              </h4>
              <p className="mt-1 text-xs text-heritage-charcoal/70 leading-relaxed font-sans">
                Every purchase supports heritage conservation and skilled local artisans
                associated with INTACH's heritage initiatives.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5 pt-5 border-t border-heritage-border/40">
              {[
                { label: "Material", value: product.material },
                { label: "Origin", value: product.origin },
                { label: "Dimensions", value: product.dimensions },
                { label: "Care", value: product.care },
              ].map((detail) => (
                <div
                  key={detail.label}
                  className="bg-heritage-cream/60 border border-heritage-border/40 rounded-lg p-3"
                >
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-heritage-charcoal/50 font-sans">
                    {detail.label}
                  </span>
                  <p className="mt-0.5 text-sm font-semibold text-heritage-espresso">
                    {detail.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <span className="text-sm font-semibold font-sans text-heritage-charcoal/80">
                Quantity
              </span>
              <div className="flex items-center gap-4 bg-heritage-cream border border-heritage-border/60 rounded-lg px-3 py-1.5">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-heritage-espresso text-heritage-cream hover:bg-heritage-espresso/90 transition-colors cursor-pointer text-lg font-bold"
                >
                  −
                </button>
                <span className="min-w-[1.5rem] text-center font-semibold text-heritage-espresso">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-md bg-heritage-espresso text-heritage-cream hover:bg-heritage-espresso/90 transition-colors cursor-pointer text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={addToCart}
                className="flex-1 flex items-center justify-center gap-2 border border-heritage-border/80 text-heritage-charcoal hover:bg-heritage-cream font-semibold text-sm py-3 rounded transition-colors active:scale-95 duration-150 cursor-pointer"
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
                Add to Cart
              </button>
              <button
                onClick={buyNow}
                className="flex-1 bg-heritage-red hover:bg-heritage-red/90 text-white font-semibold text-sm py-3 rounded shadow shadow-heritage-red/15 cursor-pointer transition-colors active:scale-95 duration-150"
              >
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}