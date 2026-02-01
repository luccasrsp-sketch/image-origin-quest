// Send Push Notification - Edge Function
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push library for Deno
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth: string }, payload: object) {
  // For now, we'll use a simple fetch approach
  // In production, you'd want to use proper VAPID signing
  
  const payloadString = JSON.stringify(payload);
  
  console.log(`Sending push to ${subscription.endpoint}`);
  console.log(`Payload: ${payloadString}`);
  
  // Note: This is a simplified version. Full Web Push requires VAPID signature
  // For a production app, consider using a service like Firebase Cloud Messaging
  // or implementing full VAPID signing
  
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
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, title, body, url, leadId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

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
