// Razorpay Checkout for the website. The checkout script is loaded on demand;
// the handler result (payment id, subscription id, signature) is sent to the
// API, which checks the signature and fetches the subscription from Razorpay.
import { Platform } from 'react-native';

interface CheckoutResult {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void; on: (ev: string, fn: (r: unknown) => void) => void };

function loadScript(): Promise<RazorpayCtor> {
  return new Promise((resolve, reject) => {
    const w = globalThis as { Razorpay?: RazorpayCtor; document?: Document };
    if (w.Razorpay) return resolve(w.Razorpay);
    if (!w.document) return reject(new Error('Razorpay checkout only runs in a browser'));
    const s = w.document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error('Razorpay failed to load')));
    s.onerror = () => reject(new Error('Razorpay failed to load'));
    w.document.body.appendChild(s);
  });
}

export const razorpayAvailable = () => Platform.OS === 'web';

export async function openRazorpayCheckout(opts: { keyId: string; subscriptionId: string; name: string; description: string; prefill: { contact: string; name: string } }): Promise<CheckoutResult> {
  const Razorpay = await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new Razorpay({
      key: opts.keyId,
      subscription_id: opts.subscriptionId,
      name: opts.name,
      description: opts.description,
      prefill: opts.prefill,
      theme: { color: '#4F46E5' },
      handler: (r: CheckoutResult) => resolve(r),
      modal: { ondismiss: () => reject(new Error('Payment was cancelled')) },
    });
    rz.on('payment.failed', (r: unknown) => reject(new Error(((r as { error?: { description?: string } })?.error?.description) ?? 'Payment failed')));
    rz.open();
  });
}
