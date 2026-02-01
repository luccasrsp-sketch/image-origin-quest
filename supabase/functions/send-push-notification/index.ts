// Send Push Notification - Edge Function (Secured)
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Web Push library for Deno
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  const payloadString = JSON.stringify(payload);
  
  console.log(`Sending push to ${subscription.endpoint}`);
  console.log(`Payload: ${payloadString}`);
  
  try {
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payloadString,
    });
    
    if (!response.ok) {
      console.error(`Push failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ========== AUTHORIZATION CHECK ==========
    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth client to verify the user
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify JWT and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuthClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Invalid token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub;
    console.log("Authenticated user:", authenticatedUserId);

    // Service role client for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, url, leadId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "userId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========== AUTHORIZATION: Check if user can send to target ==========
    // Get the authenticated user's profile ID
    const { data: callerProfile } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("user_id", authenticatedUserId)
      .single();

    if (!callerProfile) {
      console.error("Caller profile not found");
      return new Response(
        JSON.stringify({ error: "Forbidden - caller profile not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is sending to themselves OR is an admin
    const isTargetSelf = callerProfile.id === userId;
    
    if (!isTargetSelf) {
      // Check if caller is admin
      const { data: roles } = await supabaseClient
        .from("user_roles")
        .select("role")
        .eq("user_id", authenticatedUserId);
      
      const isAdmin = roles?.some(r => r.role === "admin");
      
      if (!isAdmin) {
        console.error(`User ${authenticatedUserId} attempted to send notification to ${userId} without admin role`);
        return new Response(
          JSON.stringify({ error: "Forbidden - only admins can send notifications to other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Admin sending notification to another user");
    }

    // ========== SEND NOTIFICATION ==========
    console.log(`Sending notification to user ${userId}: ${title}`);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = {
      title: title || "Novo Lead",
      body: body || "Você tem um novo lead!",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: leadId ? `lead-${leadId}` : "new-lead",
      url: url || "/kanban",
      leadId,
    };

    // Send push to all subscriptions
    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendWebPush(sub, payload);
      if (success) {
        sentCount++;
      } else {
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Clean up failed subscriptions (they might be expired)
    if (failedEndpoints.length > 0) {
      await supabaseClient
        .from("push_subscriptions")
        .delete()
        .in("endpoint", failedEndpoints);
      
      console.log(`Cleaned up ${failedEndpoints.length} failed subscriptions`);
    }

    // Also create an in-app notification
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert({
        user_id: userId,
        title: title || "Novo Lead",
        message: body || "Você tem um novo lead atribuído!",
        type: "lead",
      });

    if (notifError) {
      console.error("Error creating in-app notification:", notifError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: subscriptions.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
