import { createClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { tradeId, notifierUsername, message } = await request.json();

    if (!tradeId || !notifierUsername) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the trade post
    const { data: tradePost, error: tradeError } = await supabase
      .from("trade_posts")
      .select(`
        *,
        user:user_id(*)
      `)
      .eq("id", tradeId)
      .single();

    if (tradeError || !tradePost) {
      return NextResponse.json(
        { error: "Trade post not found" },
        { status: 404 }
      );
    }

    // Check if user has notification preferences
    if (!tradePost.user || !tradePost.user.notification_preference) {
      return NextResponse.json(
        { success: true, message: "No notification preferences set" },
        { status: 200 }
      );
    }

    const user = tradePost.user;
    const emailEnabled = user.notification_preference.email;
    const textEnabled = user.notification_preference.text;
    const emailAddress = user.notification_contact?.email;
    const phoneNumber = user.notification_contact?.phone;

    // Prepare message content
    const messageContent = message 
      ? `Message: "${message}"`
      : "No additional message provided.";

    // Send email notification if enabled
    if (emailEnabled && emailAddress) {
      // In a real application, you would use an email service (SendGrid, Mailgun, etc.)
      console.log(`Sending email to ${emailAddress} about trade interest from ${notifierUsername}`);
      console.log(`Email includes message: ${messageContent}`);
      // Sample email code (not implemented)
      /*
      const emailData = {
        to: emailAddress,
        subject: "New Trade Interest Notification",
        text: `User "${notifierUsername}" is interested in your trade for card ${tradePost.card_wanted}. ${messageContent} Please check your notifications in the app.`,
      };
      await sendEmail(emailData);
      */
    }

    // Send text notification if enabled
    if (textEnabled && phoneNumber) {
      // In a real application, you would use an SMS service (Twilio, etc.)
      console.log(`Sending SMS to ${phoneNumber} about trade interest from ${notifierUsername}`);
      console.log(`SMS includes message: ${messageContent}`);
      // Sample SMS code (not implemented)
      /*
      const smsData = {
        to: phoneNumber,
        body: `PKMN TCG Pocket Trade: User "${notifierUsername}" is interested in your trade for card ${tradePost.card_wanted}. ${messageContent}`,
      };
      await sendSMS(smsData);
      */
    }

    return NextResponse.json(
      { 
        success: true, 
        emailSent: emailEnabled, 
        smsSent: textEnabled,
        messageIncluded: !!message
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}