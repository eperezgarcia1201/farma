export const CREDIT_TERMS = [15, 30, 45, 60] as const;
export type CreditTerm = (typeof CREDIT_TERMS)[number];
