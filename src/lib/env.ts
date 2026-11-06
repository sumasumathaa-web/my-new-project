/**
 * Centralised, safe environment access.
 * Never throws at import time so the production build succeeds even when
 * credentials are not yet configured (pages degrade gracefully, admin/setup
 * docs explain how to enable full functionality).
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  /** true unless explicitly disabled AND live keys are present */
  paymentsTestMode: (process.env.PAYMENTS_TEST_MODE ?? "true") !== "false",

  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  adminSetupEmails: (process.env.ADMIN_SETUP_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean),

  emailProvider: (process.env.EMAIL_PROVIDER ?? "log").toLowerCase(), // log | resend | postmark | sendgrid
  emailFrom: process.env.EMAIL_FROM ?? "Your Brand Name <no-reply@example.com>",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  postmarkToken: process.env.POSTMARK_SERVER_TOKEN ?? "",
  sendgridApiKey: process.env.SENDGRID_API_KEY ?? "",

  bucketPublic: process.env.STORAGE_BUCKET_PUBLIC ?? "public-media",
  bucketCustomer: process.env.STORAGE_BUCKET_CUSTOMER ?? "customer-uploads",
  bucketDeliverables: process.env.STORAGE_BUCKET_DELIVERABLES ?? "deliverables",
};

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function hasServiceRole(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

/** Live payments only when explicitly enabled with real credentials. */
export function paymentsEnabled(): boolean {
  return Boolean(!env.paymentsTestMode && env.razorpayKeyId && env.razorpayKeySecret);
}
