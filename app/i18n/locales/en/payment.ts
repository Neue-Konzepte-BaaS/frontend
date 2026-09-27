export const payment = {
  checkoutMetaTitle: "Payment · BaaS",
  checkoutTitle: "Confirm and pay",
  missingRequest: "We lost track of your rental request — please start again from the plot.",
  startingCheckout: "Preparing payment…",
  // Deliberately explicit that this charges the card now, refunded only on
  // a decline — this is a "pay to apply" flow, not a hold, and a customer
  // should never have to guess which one they're looking at.
  authorizeNotice:
    "You'll be charged now. Your request is then sent to the farmer — if they decline it, you'll be refunded automatically and pay nothing.",
  stripeNotConfigured: "Payments aren't configured yet — please try again later.",
  payNow: "Pay now",
  processingPayment: "Processing…",

  returnMetaTitle: "Confirming payment · BaaS",
  returnTitle: "Confirming your payment",
  missingSession: "We couldn't find that payment session.",
  goToMyRentals: "Go to my rentals",
  confirmingPayment: "Confirming your payment…",
  stillProcessing: "This is taking longer than usual. Your payment may still be processing.",
  checkAgain: "Check again",
  paymentSuccess:
    "Payment received — your request has been sent to the farmer. If they decline it, you'll be refunded automatically; either way, you'll be notified.",
  continueNow: "Continue now",
  sessionFailed: "This payment couldn't be completed. You haven't been charged.",
} as const;
