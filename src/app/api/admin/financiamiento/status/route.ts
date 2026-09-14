import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "under_review", "approved", "rejected", "cancelled"]),
  rejection_reason: z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

    const { error } = await supabase
      .from("financing_applications")
      .update({
        application_status: parsed.data.status,
        rejection_reason: parsed.data.rejection_reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
