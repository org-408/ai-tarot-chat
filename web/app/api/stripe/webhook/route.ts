import { clientService } from "@/lib/server/services";
import { logWithContext } from "@/lib/server/logger/logger";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error) {
    logWithContext("error", "Stripe webhook signature verification failed", { error });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientId = session.metadata?.clientId;
        const planCode = session.metadata?.planCode;

        if (clientId && planCode) {
          await clientService.changePlan(clientId, planCode);
          logWithContext("info", "Stripe: plan updated", { clientId, planCode });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const clientId = subscription.metadata?.clientId;
        if (clientId) {
          await clientService.changePlan(clientId, "FREE");
          logWithContext("info", "Stripe: subscription cancelled, plan reset to FREE", { clientId });
        }
        break;
      }

      default:
        logWithContext("info", `Stripe webhook: unhandled event ${event.type}`);
    }
  } catch (error) {
    logWithContext("error", "Stripe webhook processing error", { error });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
