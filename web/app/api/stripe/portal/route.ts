import { authService } from "@/lib/server/services/auth";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

export async function POST(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload) return payload.error;

    const { returnUrl } = (await request.json()) as { returnUrl: string };

    // clientId から Stripe customer ID を取得 (将来実装)
    // 現状は直接 customer ID を渡す
    const { customerId } = (await request.json().catch(() => ({}))) as {
      customerId?: string;
    };

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logWithContext("error", "Stripe portal error", { error });
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
