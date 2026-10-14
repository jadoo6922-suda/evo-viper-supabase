import { supabase } from './supabase';

export interface OcrVerificationResponse {
  matchStatus: 'match' | 'partial_match' | 'mismatch' | 'not_found';
  extracted: {
    amount?: number | null;
    currency?: string | null;
    date?: string | null;
    reference?: string | null;
    senderName?: string | null;
    receiverName?: string | null;
    bankOrApp?: string | null;
  } | null;
  transaction?: {
    id: string;
    reference: string;
    amount: number;
    senderName: string;
    receiverName: string;
    status: string;
    timestamp: string;
    securityVerificationHash: string;
  };
  confidence: number;
  notes: string;
  serverTimestamp: string;
}

/**
 * 1. Perform Real Gemini Vision OCR analysis via Supabase-backed server API
 */
export async function verifyReceiptWithGemini(
  imageBase64: string,
  expectedTxId?: string
): Promise<OcrVerificationResponse> {
  // First attempt: Server API route (uses server-side GEMINI_API_KEY)
  try {
    const { data } = await supabase?.auth.getSession() || { data: { session: null } };
    const token = data.session?.access_token;
    const res = await fetch('/api/verify-receipt-ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ imageBase64, expectedTxId }),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (apiErr) {
    console.warn('Direct server OCR endpoint error, ', apiErr);
  }

  throw new Error('تعذر استدعاء خدمة فحص الإيصالات على الخادم. تحقق من إعدادات Supabase وGemini.');
}


