import { authService } from "@/lib/server/services/auth";
import { clientService } from "@/lib/server/services";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const payload = await authService.verifyApiRequest(request);
    if ("error" in payload) return payload.error;

    const { returnUrl } = (await request.json()) as { returnUrl: string };

    const client = await clientService.getClientById(payload.payload.clientId);
    if (!client?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No Stripe customer found" },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
      apiVersion: "2026-03-25.dahlia",
    });

    const session = await stripe.billingPortal.sessions.create({
      customer: client.stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    logWithContext("error", "Stripe portal error", { error });
    return NextResponse.json({ error: "Portal failed" }, { status: 500 });
  }
}
