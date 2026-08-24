import { useState } from "react";
import { createSubmission, uploadSubmissionImage } from "../../api/volunteerHeritage";
import { ApiError } from "../../api/client";

function extractCoordinates(mapsLink) {
  if (!mapsLink) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  // Handles Google Maps URLs containing @latitude,longitude
  const match = mapsLink.match(
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/
  );

  if (!match) {
    return {
      latitude: null,
      longitude: null,
    };
  }

  return {
    latitude: Number(match[1]),
    longitude: Number(match[2]),
  };
}

export default function UploadHeritage() {
  const [formData, setFormData] = useState({
    heritageName: "",
    category: "",
    heritageType: "",
    era: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    mapsLink: "",
    description: "",
    significance: "",
    condition: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    declaration: false,
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const { latitude, longitude } = extractCoordinates(formData.mapsLink);

    const fullAddress = [
      formData.address,
      formData.city,
      formData.state,
      formData.pincode,
    ]
      .filter(Boolean)
      .join(", ");

    setLoading(true);

    try {
      let imageUrl = null;

      if (selectedFiles.length > 0) {
        const uploadData = await uploadSubmissionImage(selectedFiles[0]);
        imageUrl = uploadData.image_url;
      }

      // The backend has no columns for these - fold them into the
      // description so the submission review still has this information
      // instead of silently dropping what the volunteer typed.
      const extraDetails = [
        formData.heritageType && `Type: ${formData.heritageType}`,
        formData.condition && `Condition: ${formData.condition}`,
        (formData.contactName || formData.contactEmail || formData.contactPhone) &&
          `Contact: ${[formData.contactName, formData.contactEmail, formData.contactPhone]
            .filter(Boolean)
            .join(" / ")}`,
      ].filter(Boolean);

      const description = [formData.description, ...extraDetails]
        .filter(Boolean)
        .join("\n\n");

      const payload = {
        name: formData.heritageName,
        category: formData.category,
        address: fullAddress || null,
        construction_period: formData.era || null,
        historical_significance: formData.significance || null,
        description: description || null,
        image_url: imageUrl,
        latitude,
        longitude,
      };

      const data = await createSubmission(payload);

      setSuccess(
        `Heritage submission "${data.name}" was successfully sent for review.`
      );

      setFormData({
        heritageName: "",
        category: "",
        heritageType: "",
        era: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        mapsLink: "",
        description: "",
        significance: "",
        condition: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        declaration: false,
      });

      setSelectedFiles([]);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "Something went wrong while submitting."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8ecd7] px-4 py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="py-6 border-b border-heritage-border/20 text-left">
          <p className="uppercase tracking-[0.2em] text-[#c28230] text-xs font-bold">
            Volunteer Submission
          </p>

          <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#9c2d19] mt-2">
            Upload Heritage Site
          </h1>

          <p className="mt-3 text-heritage-charcoal/85 text-base leading-relaxed max-w-3xl">
            Submit details of monuments, forts, temples, museums,
            archaeological remains or other heritage structures. Your
            submission will be reviewed by heritage experts before being
            published.
          </p>
        </div>

        {/* Success / Error messages */}
        {success && (
          <div className="rounded-xl border border-green-300 bg-green-50 px-5 py-4 text-sm text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="heritage-card rounded-2xl p-6 sm:p-8 space-y-8 text-left"
        >
          {/* Heritage Details */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#9c2d19] border-b border-heritage-border/20 pb-2 mb-4">
              Heritage Details
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Heritage Site Name
                </label>

                <input
                  type="text"
                  name="heritageName"
                  value={formData.heritageName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: Shaniwar Wada"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Heritage Category
                </label>

                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition cursor-pointer"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="built">Built Heritage</option>
                  <option value="natural">Natural Heritage</option>
                  <option value="craft">Craft</option>
                  <option value="intangible">Intangible Heritage</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Heritage Type
                </label>

                <select
                  name="heritageType"
                  value={formData.heritageType}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition cursor-pointer"
                  required
                >
                  <option value="">Select Type</option>
                  <option>Monument</option>
                  <option>Fort</option>
                  <option>Temple</option>
                  <option>Mosque</option>
                  <option>Church</option>
                  <option>Museum</option>
                  <option>Palace</option>
                  <option>Memorial</option>
                  <option>Archaeological Site</option>
                  <option>Cultural Site</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Approximate Era
                </label>

                <input
                  type="text"
                  name="era"
                  value={formData.era}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: 17th Century"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#9c2d19] border-b border-heritage-border/20 pb-2 mb-4">
              Location Information
            </h2>

            <div className="grid md:grid-cols-2 gap-4">

              <div className="md:col-span-2">
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Street Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Enter complete address"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: Pune"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  State
                </label>

                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: Maharashtra"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  PIN Code
                </label>

                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: 411011"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Google Maps Link
                </label>

                <input
                  type="url"
                  name="mapsLink"
                  value={formData.mapsLink}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="https://maps.google.com/..."
                />

                <p className="mt-1 text-[11px] text-heritage-charcoal/60">
                  Coordinates are saved when the link contains latitude and
                  longitude.
                </p>
              </div>
            </div>
          </section>

          {/* Description */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#9c2d19] border-b border-heritage-border/20 pb-2 mb-4">
              Heritage Details & Significance
            </h2>

            <div className="space-y-4">

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Description
                </label>

                <textarea
                  rows="4"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition resize-none"
                  placeholder="Describe the heritage site..."
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Historical Significance
                </label>

                <textarea
                  rows="4"
                  name="significance"
                  value={formData.significance}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition resize-none"
                  placeholder="Explain why this heritage site is important..."
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Current Condition
                </label>

                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition cursor-pointer"
                  required
                >
                  <option value="">Select Condition</option>
                  <option>Excellent</option>
                  <option>Good</option>
                  <option>Needs Restoration</option>
                  <option>Damaged</option>
                  <option>Ruins</option>
                </select>
              </div>
            </div>
          </section>

          {/* Photograph Upload */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#9c2d19] border-b border-heritage-border/20 pb-2 mb-4">
              Upload Photographs
            </h2>

            <div className="border-2 border-dashed border-heritage-border/60 rounded-xl p-8 text-center bg-heritage-cream/5 hover:bg-heritage-cream/15 hover:border-heritage-bronze transition duration-200 cursor-pointer flex flex-col items-center justify-center">

              <svg
                className="w-8 h-8 text-heritage-charcoal/40 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a22 22 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>

              <label className="text-xs font-bold text-[#9c2d19] uppercase tracking-wider cursor-pointer hover:underline">
                Upload Photograph

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>

              <p className="mt-1.5 text-xs text-heritage-charcoal/60">
                Upload one clear image (JPEG, PNG).
              </p>

              {selectedFiles.length > 0 && (
                <div className="mt-4 text-left w-full">
                  <p className="text-xs font-bold text-heritage-charcoal mb-2">
                    Selected file:
                  </p>

                  <p className="text-xs text-heritage-charcoal/70">
                    {selectedFiles[0].name}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl font-bold text-[#9c2d19] border-b border-heritage-border/20 pb-2 mb-4">
              Contact Information
            </h2>

            <div className="grid md:grid-cols-3 gap-4">

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Contact Name
                </label>

                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: Rahul Sharma"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Email Address
                </label>

                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: rahul@example.com"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-heritage-charcoal/70">
                  Phone Number
                </label>

                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-heritage-border/60 bg-heritage-cream/20 px-4 py-2.5 text-sm text-heritage-espresso focus:outline-none focus:border-heritage-bronze focus:ring-1 focus:ring-heritage-bronze transition"
                  placeholder="Example: +91 98765 43210"
                  required
                />
              </div>
            </div>
          </section>

          {/* Declaration */}
          <section className="border border-heritage-border/40 rounded-xl p-4 bg-heritage-cream-light/35">
            <label className="flex items-start gap-3 cursor-pointer">

              <input
                type="checkbox"
                name="declaration"
                checked={formData.declaration}
                onChange={handleChange}
                className="mt-1 h-4 w-4 rounded border-heritage-border text-heritage-red focus:ring-[#9c2d19]"
                required
              />

              <span className="text-heritage-charcoal/80 text-xs sm:text-sm leading-relaxed">
                I hereby declare that the information submitted is true to
                the best of my knowledge. I understand that INTACH may verify,
                modify or reject this submission during the review process.
              </span>
            </label>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-3 pt-2">

            <button
              type="button"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg border border-heritage-border/80 text-heritage-charcoal hover:bg-heritage-cream transition text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-heritage-red text-white hover:bg-heritage-red/90 transition text-xs font-bold uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-60"
            >
              {loading ? "Submitting..." : "Submit for Review"}
            </button>

          </div>
        </form>
      </div>
    </main>
  );
}