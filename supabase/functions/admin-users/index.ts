import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AdminRequest {
  action: "list-users" | "add-role" | "remove-role" | "ban-user" | "unban-user";
  userId?: string;
  email?: string;
  role?: "admin" | "moderator";
  page?: number;
  pageSize?: number;
}

// Audit log helper - uses any type to avoid complex generic issues
async function logAuditAction(
  supabaseAdmin: any,
  actionType: string,
  performedBy: string,
  performedByEmail: string | undefined,
  targetUserId?: string,
  targetUserEmail?: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      action_type: actionType,
      target_user_id: targetUserId,
      target_user_email: targetUserEmail,
      performed_by: performedBy,
      performed_by_email: performedByEmail,
      details: details || {},
    });

    if (error) {
      console.error("Failed to log audit action:", error);
    } else {
      console.log(`Audit log created: ${actionType} by ${performedByEmail}`);
    }
  } catch (err) {
    console.error("Error creating audit log:", err);
  }
}

// Email notification for ban/unban
async function sendBanNotification(userEmail: string, isBanned: boolean): Promise<void> {
  try {
    const subject = isBanned
      ? "Votre compte Floorence a été suspendu"
      : "Votre compte Floorence a été réactivé";

    const html = isBanned
      ? `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #800020; font-size: 24px; margin-bottom: 20px;">Compte suspendu</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Bonjour,
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Nous vous informons que votre compte Floorence a été temporairement suspendu par notre équipe de modération.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Durant cette suspension, vous ne pourrez pas vous connecter à votre compte ni accéder à vos espaces mémoriels.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Si vous pensez qu'il s'agit d'une erreur ou souhaitez contester cette décision, veuillez nous contacter à l'adresse : 
            <a href="mailto:contact@floorence.org" style="color: #800020;">contact@floorence.org</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 14px;">
            L'équipe Floorence
          </p>
        </div>
      `
      : `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2e7d32; font-size: 24px; margin-bottom: 20px;">Compte réactivé</h1>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Bonjour,
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Bonne nouvelle ! Votre compte Floorence a été réactivé par notre équipe de modération.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            Vous pouvez désormais vous reconnecter et accéder à l'ensemble de vos espaces mémoriels.
          </p>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            <a href="https://floorence.org" style="display: inline-block; background-color: #800020; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
              Se connecter
            </a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #888; font-size: 14px;">
            L'équipe Floorence
          </p>
        </div>
      `;

    const { error } = await resend.emails.send({
      from: "Floorence <noreply@floorence.org>",
      to: [userEmail],
      subject,
      html,
    });

    if (error) {
      console.error("Failed to send ban notification email:", error);
    } else {
      console.log(`Ban notification email sent to ${userEmail} (isBanned: ${isBanned})`);
    }
  } catch (err) {
    console.error("Error sending ban notification:", err);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with user's token to verify admin status
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if user is admin using RPC
    const { data: isAdmin, error: roleError } = await supabaseUser.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      console.error("Role check error:", roleError, "isAdmin:", isAdmin);
      return new Response(
        JSON.stringify({ error: "Accès refusé - Admin requis" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create admin client for privileged operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: AdminRequest = await req.json();
    const { action, userId, email, role, page = 1, pageSize = 20 } = body;

    console.log(`Admin action: ${action} by user ${user.id}`);

    switch (action) {
      case "list-users": {
        // List all users with pagination
        const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: pageSize,
        });

        if (listError) {
          console.error("List users error:", listError);
          throw listError;
        }

        // Get profiles for additional info
        const userIds = usersData.users.map((u) => u.id);
        const { data: profiles } = await supabaseAdmin
          .from("profiles")
          .select("user_id, display_name, phone, profile_completed")
          .in("user_id", userIds);

        // Get roles for these users
        const { data: roles } = await supabaseAdmin
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds);

        // Merge data
        const enrichedUsers = usersData.users.map((u) => {
          const profile = profiles?.find((p) => p.user_id === u.id);
          const userRoles = roles?.filter((r) => r.user_id === u.id).map((r) => r.role) ?? [];
          // Cast to access banned_until which exists but may not be in type definitions
          const userData = u as unknown as { 
            id: string; 
            email?: string; 
            created_at: string; 
            last_sign_in_at?: string; 
            banned_until?: string;
            email_confirmed_at?: string;
          };
          return {
            id: userData.id,
            email: userData.email,
            created_at: userData.created_at,
            last_sign_in_at: userData.last_sign_in_at,
            banned_until: userData.banned_until,
            email_confirmed_at: userData.email_confirmed_at,
            display_name: profile?.display_name,
            phone: profile?.phone,
            profile_completed: profile?.profile_completed ?? false,
            roles: userRoles,
          };
        });

        return new Response(
          JSON.stringify({
            users: enrichedUsers,
            total: usersData.users.length,
            page,
            pageSize,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "add-role": {
        if (!email || !role) {
          return new Response(
            JSON.stringify({ error: "Email et rôle requis" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Find user by email
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers();
        const targetUser = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (!targetUser) {
          return new Response(
            JSON.stringify({ error: "Utilisateur non trouvé" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check if role already exists
        const { data: existingRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", targetUser.id)
          .eq("role", role)
          .single();

        if (existingRole) {
          return new Response(
            JSON.stringify({ error: "Cet utilisateur a déjà ce rôle" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Add role
        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: targetUser.id, role });

        if (insertError) {
          console.error("Insert role error:", insertError);
          throw insertError;
        }

        console.log(`Role ${role} added to user ${targetUser.id} (${email})`);

        // Log audit action
        await logAuditAction(
          supabaseAdmin,
          "add_role",
          user.id,
          user.email,
          targetUser.id,
          email,
          { role }
        );

        return new Response(
          JSON.stringify({ success: true, message: `Rôle ${role} ajouté à ${email}` }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "remove-role": {
        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: "ID utilisateur et rôle requis" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Prevent removing own admin role
        if (userId === user.id && role === "admin") {
          return new Response(
            JSON.stringify({ error: "Vous ne pouvez pas retirer votre propre rôle admin" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Get target user email for audit
        const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        const targetEmail = targetUserData?.user?.email;

        const { error: deleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);

        if (deleteError) {
          console.error("Delete role error:", deleteError);
          throw deleteError;
        }

        console.log(`Role ${role} removed from user ${userId}`);

        // Log audit action
        await logAuditAction(
          supabaseAdmin,
          "remove_role",
          user.id,
          user.email,
          userId,
          targetEmail,
          { role }
        );

        return new Response(
          JSON.stringify({ success: true, message: "Rôle supprimé" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "ban-user": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "ID utilisateur requis" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Prevent self-ban
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: "Vous ne pouvez pas vous bloquer vous-même" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Get user email before banning
        const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        const targetEmail = targetUserData?.user?.email;

        // Ban for 100 years (effectively permanent but reversible)
        const banUntil = new Date();
        banUntil.setFullYear(banUntil.getFullYear() + 100);

        const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "876000h", // ~100 years in hours
        });

        if (banError) {
          console.error("Ban error:", banError);
          throw banError;
        }

        console.log(`User ${userId} banned by admin ${user.id}`);

        // Log audit action
        await logAuditAction(
          supabaseAdmin,
          "ban_user",
          user.id,
          user.email,
          userId,
          targetEmail,
          { ban_duration: "876000h" }
        );

        // Send email notification (async, don't wait)
        if (targetEmail) {
          sendBanNotification(targetEmail, true);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Utilisateur bloqué" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      case "unban-user": {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "ID utilisateur requis" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Get user email before unbanning
        const { data: targetUserData } = await supabaseAdmin.auth.admin.getUserById(userId);
        const targetEmail = targetUserData?.user?.email;

        const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          ban_duration: "none",
        });

        if (unbanError) {
          console.error("Unban error:", unbanError);
          throw unbanError;
        }

        console.log(`User ${userId} unbanned by admin ${user.id}`);

        // Log audit action
        await logAuditAction(
          supabaseAdmin,
          "unban_user",
          user.id,
          user.email,
          userId,
          targetEmail,
          {}
        );

        // Send email notification (async, don't wait)
        if (targetEmail) {
          sendBanNotification(targetEmail, false);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Utilisateur débloqué" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Action non reconnue" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
    }
  } catch (error: any) {
    console.error("Error in admin-users:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Une erreur est survenue" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
