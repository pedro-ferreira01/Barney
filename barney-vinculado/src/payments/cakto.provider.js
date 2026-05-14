export async function createCaktoCheckout({ orderId, plan, user }) {
  const baseUrl =
    process.env.CAKTO_CHECKOUT_BASE_URL ||
    "https://checkout-fake.cakto.com";

  return {
    provider: "cakto",
    orderId,
    status: "pending",
    checkoutUrl: `${baseUrl}/pay?order=${orderId}&plan=${plan}&email=${encodeURIComponent(
      user.email
    )}`,
    pixCode: `CAKTO-PIX-${orderId}`,
  };
}

export function normalizeCaktoWebhook(payload) {
  return {
    orderId: payload.orderId,
    status: payload.status,
    paid: payload.status === "paid",
  };
}