import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import crypto from "crypto";

const leadSchema = z.object({
  full_name: z.string().min(3).max(150),
  email: z.string().email().max(150),
  phone: z.string().min(7).max(30),
  message: z.string().max(1000).optional(),
  product_of_interest_id: z.string().uuid().nullable().optional(),
  consent: z.boolean().refine((v) => v === true, "Debes aceptar la política de privacidad"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    const data = parsed.data;

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Hash anónimo de IP (LOPDP: no almacenamos la IP cruda)
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");

    const { data: consent, error: consentErr } = await supabase
      .from("consent_logs")
      .insert({
        anonymous_ip_hash: ipHash,
        user_agent: req.headers.get("user-agent") || "unknown",
        purpose: "contacto_web",
        policy_version: "v1.0",
        legal_text_accepted: "Acepto la política de privacidad y el tratamiento de mis datos para ser contactado (checkbox formulario de contacto).",
      })
      .select("id")
      .single();
    if (consentErr) throw new Error(consentErr.message);

    const { error: leadErr } = await supabase.from("leads").insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      message: data.message || null,
      product_of_interest_id: data.product_of_interest_id || null,
      consent_id: consent.id,
    });
    if (leadErr) throw new Error(leadErr.message);

    // Alerta al admin (si falla el correo, el lead YA quedó guardado)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "RG Tech Solutions <onboarding@resend.dev>",
        to: [process.env.ADMIN_ALERT_EMAIL || "rgonzalez@rgtechsolutions.ec"],
        subject: `🔔 Nuevo lead: ${data.full_name}`,
        html: `
          <h2>Nuevo lead desde la web</h2>
          <p><strong>Nombre:</strong> ${data.full_name}</p>
          <p><strong>Correo:</strong> ${data.email}</p>
          <p><strong>Teléfono:</strong> ${data.phone}</p>
          <p><strong>Mensaje:</strong> ${data.message || "(sin mensaje)"}</p>
          <p style="color:#888">Recibido: ${new Date().toLocaleString("es-EC")}</p>
        `,
      });
    } catch (emailErr) {
      console.error("Fallo alerta Resend:", emailErr);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}
