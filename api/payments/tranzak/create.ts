const TRANZAK_API_KEY = 'tk_test_Jqixv0iPHkh6khkp7AqQAQew8ReVgyej5dp7TOST';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { amount, currency = 'HTG', payment_method, phone, customer_email, reference } = req.body || {};

    const payload = {
      amount: Number(amount) || 500,
      currency: currency || 'HTG',
      payment_method: payment_method || 'moncash',
      phone: phone || '',
      customer_email: customer_email || '',
      reference: reference || `IFLEX-${Date.now()}`,
      callback_url: 'https://paye.iflexstream.site/api/payments/tranzak/callback',
      return_url: 'https://paye.iflexstream.site/payment/return',
      cancel_url: 'https://paye.iflexstream.site/payment/cancel'
    };

    let tranzakResponse: any = null;
    try {
      const response = await fetch('https://api.tranzak.co/api/gateway/v1/payments', {
        method: 'POST',
        headers: {
          'X-Api-Key': TRANZAK_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      tranzakResponse = await response.json();
    } catch (e: any) {
      console.warn('Direct Tranzak API call error:', e.message);
    }

    return res.status(200).json({
      success: true,
      tranzak: tranzakResponse,
      transactionId: tranzakResponse?.data?.transaction_id || tranzakResponse?.transaction_id || `TRZ-${payload.reference}`,
      paymentUrl: tranzakResponse?.data?.payment_url || tranzakResponse?.payment_url || null
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create payment', message: err?.message });
  }
}
