import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  VERTICAL_LEAD: 'Vertical Lead',
  MEMBER: 'Member',
  VIEWER: 'Viewer',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { workspaceId, email, role } = await req.json()

    if (!workspaceId || !email || !role) {
      return new Response(JSON.stringify({ error: 'workspaceId, email, and role are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client — bypasses RLS for workspace/member lookups and invite insert
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // User-scoped client — validates the caller's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Confirm caller is ADMIN in this workspace
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single()

    if (!membership || membership.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Forbidden — only ADMINs can invite' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get workspace name for the email
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('name')
      .eq('id', workspaceId)
      .single()

    // Create the invite record
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('workspace_invites')
      .insert({
        workspace_id: workspaceId,
        email: email.toLowerCase().trim(),
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (inviteError) throw inviteError

    // Send email via Resend
    const appUrl = Deno.env.get('APP_URL') ?? 'https://planzo.io'
    const fromEmail = Deno.env.get('FROM_EMAIL') ?? 'invites@planzo.io'
    const inviteUrl = `${appUrl}/invite/${invite.token}`

    const emailController = new AbortController()
    const emailTimeout = setTimeout(() => emailController.abort(), 8000)
    let emailRes: Response | null = null
    try {
      emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `Planzo <${fromEmail}>`,
          to: [email],
          subject: `You've been invited to join ${workspace?.name ?? 'a workspace'} on Planzo`,
          html: buildEmailHtml({
            workspaceName: workspace?.name ?? '',
            roleLabel: ROLE_LABELS[role] ?? role,
            inviteUrl,
          }),
        }),
        signal: emailController.signal,
      })
    } catch (fetchErr) {
      console.error('[send-invite] Resend fetch error:', fetchErr)
    } finally {
      clearTimeout(emailTimeout)
    }

    const emailSent = emailRes?.ok ?? false
    if (!emailSent) {
      const emailErr = await emailRes?.json().catch(() => ({}))
      console.error('[send-invite] Resend error:', emailErr)
    }

    return new Response(JSON.stringify({ ...invite, email_sent: emailSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-invite] error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function buildEmailHtml({ workspaceName, roleLabel, inviteUrl }: {
  workspaceName: string
  roleLabel: string
  inviteUrl: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:32px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="display:inline-table;">
              <tr>
                <td style="background:#6366f1;border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                  <span style="color:#fff;font-size:20px;font-weight:700;line-height:40px;">P</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Planzo</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 36px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You've been invited!</h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#6b7280;">
              You've been invited to join
              <strong style="color:#111827;">${workspaceName}</strong>
              on Planzo as a
              <strong style="color:#111827;">${roleLabel}</strong>.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding-bottom:28px;">
                  <a href="${inviteUrl}"
                    style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 36px;border-radius:8px;letter-spacing:0.1px;">
                    Accept Invitation
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.7;">
              Or paste this link into your browser:<br>
              <a href="${inviteUrl}" style="color:#6366f1;word-break:break-all;">${inviteUrl}</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 36px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              This invitation expires in 7 days.<br>
              If you weren't expecting this, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
