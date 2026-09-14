import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import crypto from "crypto";

const financingSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string(),
  full_name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(7),
  national_id: z.string().min(10).max(13),
  employment_status: z.enum(["empleado", "independiente", "jubilado", "estudiante", "desempleado"]),
  monthly_income: z.number().min(100),
  workplace: z.string().max(200).optional(),
  references: z.object({
    personal_name: z.string(),
    personal_phone: z.string(),
    commercial_name: z.string().optional(),
    commercial_phone: z.string().optional(),
  }),
  requested_terms_months: z.enum(["3", "6", "12", "18", "24"]).transform(Number),
  estimated_down_payment: z.number().min(0),
  consent: z.boolean().refine((v) => v === true, "Debes aceptar la política de privacidad"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = financingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Datos inválidos" }, { status: 400 });
    }
    const data = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Hash anónimo de IP (LOPDP)
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(rawIp).digest("hex");

    const { data: consent, error: consentErr } = await supabase
      .from("consent_logs")
      .insert({
        anonymous_ip_hash: ipHash,
        user_agent: req.headers.get("user-agent") || "unknown",
        purpose: "financing_application",
        policy_version: "v1.0",
        legal_text_accepted:
          "Acepto el tratamiento de mis datos sensibles (cédula, ingresos) cifrados en reposo para evaluar mi solicitud de crédito (LOPDP).",
      })
      .select("id")
      .single();
    if (consentErr) throw new Error(consentErr.message);

    // Inserción cifrada vía función SQL (SIN crear usuarios fantasma)
    const { data: appId, error: rpcErr } = await supabase.rpc("submit_encrypted_financing_application", {
      p_product_id: data.product_id,
      p_national_id: data.national_id,
      p_employment_status: data.employment_status,
      p_monthly_income: String(data.monthly_income),
      p_workplace: data.workplace || "N/A",
      p_references: data.references,
      p_terms: data.requested_terms_months,
      p_down_payment: data.estimated_down_payment,
      p_encryption_key: process.env.PGP_ENCRYPTION_KEY!,
      p_consent_id: consent.id,
      p_full_name: data.full_name,
      p_email: data.email,
      p_phone: data.phone,
    });
    if (rpcErr) throw new Error(rpcErr.message);

    // Alerta al admin (sin datos sensibles en el correo)
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "RG Tech Solutions <onboarding@resend.dev>",
        to: [process.env.ADMIN_ALERT_EMAIL || "rgonzalez@rgtechsolutions.ec"],
        subject: `🏦 Nueva solicitud de financiamiento: ${data.full_name}`,
        html: `
          <h2>Nueva solicitud de crédito</h2>
          <p><strong>Cliente:</strong> ${data.full_name} (${data.email} / ${data.phone})</p>
          <p><strong>Producto:</strong> ${data.product_name}</p>
          <p><strong>Plazo:</strong> ${data.requested_terms_months} meses | <strong>Entrada:</strong> $${data.estimated_down_payment}</p>
          <p style="color:#888;font-size:12px">
            Cédula, ingresos y referencias están CIFRADOS en Supabase.<br>
            Descifra con: pgp_sym_decrypt(encrypted_national_id::bytea, 'TU_KEY')
          </p>
        `,
      });
    } catch (e) {
      console.error("Fallo alerta Resend:", e);
    }

    return NextResponse.json({ success: true, application_id: appId }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error interno" }, { status: 500 });
  }
}