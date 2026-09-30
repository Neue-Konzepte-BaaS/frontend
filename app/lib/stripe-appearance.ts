import type { Appearance } from "@stripe/stripe-js";

/**
 * Custom Checkout (ui_mode: "elements", see backend/internal/repositories/stripe_gateway.go)
 * only themes the Payment/Contact Details Elements it renders — everything
 * else on a checkout page is plain HTML/Tailwind, so this is the one place
 * that has to hand Stripe our palette explicitly instead of inheriting it
 * from app.css. Values mirror app/app.css's --color-* tokens and the
 * rounded-lg / inputClass look used by every other form in the app.
 *
 * Shared by every Stripe Custom Checkout page in the app (customer rental
 * checkout, farmer subscription checkout) so they render identically rather
 * than drifting apart if only one gets tweaked later.
 */
export const stripeAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#524A26", // moss
    colorBackground: "#F3E7C8", // ivory, matches inputClass's bg-ivory
    colorText: "#31311B", // forest
    colorTextSecondary: "#5F572E", // wood
    colorTextPlaceholder: "#9B8D5B", // warm-olive
    colorDanger: "#A96F4A", // error
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "16px",
    borderRadius: "8px", // rounded-lg
    spacingUnit: "4px",
  },
  rules: {
    ".Label": { color: "#5F572E", fontWeight: "500", marginBottom: "4px" },
    ".Input": { border: "1px solid #B4AF8A", boxShadow: "none", padding: "12px 16px" }, // beige border
    ".Input:focus": { border: "1px solid #524A26", boxShadow: "0 0 0 2px #797449" },
    ".Tab": { border: "1px solid #B4AF8A", boxShadow: "none" },
    ".Tab:hover": { color: "#31311B" },
    ".Tab--selected": { border: "1px solid #524A26", backgroundColor: "#F3E7C8" },
    ".TabLabel": { fontWeight: "500" },
    ".Block": { border: "1px solid #B4AF8A", boxShadow: "none" },
  },
};
