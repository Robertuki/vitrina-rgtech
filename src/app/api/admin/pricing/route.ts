import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";

// Schema de validación para asegurar que los datos sean correctos
const PricingSchema = z.object({
  iva_percentage: z.number().min(0, "El IVA no puede ser negativo").max(100, "El IVA no puede superar el 100%"),
  profit_margin_percentage: z.number().min(0, "El margen no puede ser negativo").max(500, "El margen no puede superar el 500%"),
});

// Función auxiliar para verificar que el usuario sea admin
async function verifyAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get: (n: string) => cookieStore.get(n)?.value } }
  );

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { supabase: null, error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) };
  
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { supabase: null, error: NextResponse.json({ error: "Solo administradores" }, { status: 403 }) };

  return { supabase, error: null };
}

// ✅ GET: Leer la configuración actual
export async function GET() {
  const { supabase, error } = await verifyAdmin();
  if (error) return error;
  if (!supabase) return NextResponse.json({ error: "Error interno" }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("pricing_config")
    .select("id, iva_percentage, profit_margin_percentage, updated_at")
    .limit(1)
    .maybeSingle();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Si no hay configuración, devolver valores por defecto
  if (!data) {
    return NextResponse.json({ 
      iva_percentage: 15.0, 
      profit_margin_percentage: 30.0, 
      updated_at: null 
    });
  }

  return NextResponse.json(data);
}

// ✅ PUT: Actualizar la configuración
export async function PUT(req: NextRequest) {
  const { supabase, error } = await verifyAdmin();
  if (error) return error;
  if (!supabase) return NextResponse.json({ error: "Error interno" }, { status: 500 });

  try {
    const body = await req.json();
    const parsed = PricingSchema.parse(body);

    // Obtener el ID de la fila actual para actualizarla
    const { data: existingConfig } = await supabase.from("pricing_config").select("id").limit(1).maybeSingle();

    if (existingConfig?.id) {
      // Si existe, actualizamos
      const { error: updateError } = await supabase
        .from("pricing_config")
        .update({ 
          iva_percentage: parsed.iva_percentage, 
          profit_margin_percentage: parsed.profit_margin_percentage,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingConfig.id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    } else {
      // Si por alguna razón está vacío, lo insertamos
      const { error: insertError } = await supabase
        .from("pricing_config")
        .insert({
          iva_percentage: parsed.iva_percentage,
          profit_margin_percentage: parsed.profit_margin_percentage
        });

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Precios actualizados correctamente. Se aplicarán en la próxima importación de Excel." });
  } catch (e: any) {
    // ✅ CORREGIDO: En Zod v4 se usa 'issues' en lugar de 'errors'. 
    // Mapeamos solo los mensajes para evitar errores de serialización JSON.
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues.map(i => i.message) }, { status: 400 });
    }
    return NextResponse.json({ error: e.message || "Error al procesar la solicitud" }, { status: 500 });
  }
}