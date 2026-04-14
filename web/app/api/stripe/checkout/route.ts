import { authService } from "@/lib/server/services/auth";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

const PRICE_MAP: Record<string, string | undefined> = {
  STANDARD: process.env.STRIPE_PRICE_STANDARD,
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM,
};

export async function POST(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload) return payload.error;

    const { planCode, successUrl, cancelUrl } = (await request.json()) as {
      planCode: string;
      successUrl: string;
      cancelUrl: string;
    };

    const priceId = PRICE_MAP[planCode];
    if (!priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        clientId: payload.payload.clientId,
        planCode,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logWithContext("error", "Stripe checkout error", { error });
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
