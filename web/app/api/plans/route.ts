import { getPlans } from "@/lib/services/master";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const plans = await getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("プラン一覧取得エラー:", error);
    return NextResponse.json(
      { error: "プラン一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}
