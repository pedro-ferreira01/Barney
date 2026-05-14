import { decryptText } from './crypto.js';
import { fromCents, maskDocument, maskPhone } from './money.js';

export function publicUser(user) {
  if (!user) return null;
  const phone = decryptText(user.phoneCipher);
  const cpf = decryptText(user.cpfCipher);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    phone: phone ? maskPhone(phone) : null,
    cpf: cpf ? maskDocument(cpf) : null,
    createdAt: user.createdAt
  };
}

export function publicPlan(plan) {
  if (!plan) return null;
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    price: fromCents(plan.priceCents),
    durationMonths: plan.durationMonths,
    isActive: plan.isActive
  };
}

export function publicSubscription(subscription) {
  if (!subscription) return null;
  return {
    id: subscription.id,
    status: subscription.status,
    startsAt: subscription.startsAt,
    endsAt: subscription.endsAt,
    plan: subscription.plan ? publicPlan(subscription.plan) : undefined
  };
}

export function publicTransaction(transaction) {
  if (!transaction) return null;
  return {
    id: transaction.id,
    type: transaction.type,
    category: transaction.category,
    description: transaction.description,
    amount: fromCents(transaction.amountCents),
    date: transaction.date,
    createdAt: transaction.createdAt
  };
}

export function publicPayment(payment) {
  if (!payment) return null;
  return {
    id: payment.id,
    amount: fromCents(payment.amountCents),
    status: payment.status,
    method: payment.method,
    provider: payment.provider,
    providerRef: payment.providerRef,
    pixPayload: payment.pixPayload,
    qrCodeUrl: payment.pixPayload ? `https://quickchart.io/qr?size=320&text=${encodeURIComponent(payment.pixPayload)}` : null,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt
  };
}
