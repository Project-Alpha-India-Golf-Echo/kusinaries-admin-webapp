import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailRequest {
  cookEmail: string;
  cookName: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const getEmailTemplate = (status: 'approved' | 'rejected', cookName: string, rejectionReason?: string): EmailTemplate => {
  if (status === 'approved') {
    return {
      subject: '🎉 Welcome to Kusinaries - Your Cook Application is Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #10b981; margin-bottom: 10px;">Congratulations, ${cookName}!</h1>
            <p style="font-size: 18px; color: #374151;">Your cook application has been approved!</p>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #059669; margin-top: 0;">What's Next?</h2>
            <ul style="color: #374151; line-height: 1.6;">
              <li>Proceed to kusinaries.vercel.app</li>
              <li>Login with the email you used to apply</li>
              <li>Start adding your signature dishes!</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://kusinaries.vercel.app/login" 
               style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Proceed to Kusinaries Web app!
            </a>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Welcome to the Kusinaries family! We're excited to have you on board.</p>
            <p>If you have any questions, reply to this email or contact our support team.</p>
          </div>
        </div>
      `,
      text: `
Congratulations, ${cookName}!

Your cook application has been approved!

What's Next?
- Proceed to kusinaries.vercel.app
- Login with the email you used to apply
- Start adding your signature dishes!

Access your cook dashboard: https://kusinaries.vercel.app/login

Welcome to the Kusinaries family! We're excited to have you on board.
      `
    };
  } else {
    return {
      subject: 'Update on Your Kusinaries Cook Application',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #374151; margin-bottom: 10px;">Update on Your Cook Application</h1>
            <p style="font-size: 16px; color: #6b7280;">Hi ${cookName},</p>
          </div>
          
          <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p style="color: #374151; line-height: 1.6;">
              Thank you for your interest in becoming a Kusinaries cook. After careful review, 
              we're unable to approve your application at this time.
            </p>
            ${rejectionReason ? `
              <div style="margin-top: 15px;">
                <strong style="color: #dc2626;">Reason:</strong>
                <p style="color: #374151; margin: 5px 0;">${rejectionReason}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h2 style="color: #0369a1; margin-top: 0;">Don't Give Up!</h2>
            <p style="color: #374151; line-height: 1.6;">
              You're welcome to reapply again through the mobile app. Consider addressing the feedback above 
              and we'll be happy to review your application again.
            </p>
          </div>
                    
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Thank you for your understanding.</p>
            <p>If you have any questions, reply to this email or contact our support team.</p>
          </div>
        </div>
      `,
      text: `
Hi ${cookName},

Thank you for your interest in becoming a Kusinaries cook. After careful review, we're unable to approve your application at this time.

${rejectionReason ? `Reason: ${rejectionReason}` : ''}

Don't Give Up!
You're welcome to reapply again through the mobile app. Consider addressing the feedback above and we'll be happy to review your application again.

Thank you for your understanding.
      `
    };
  }
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Parse request body
    const { cookEmail, cookName, status, rejectionReason }: EmailRequest = await req.json();

    // Validate required fields
    if (!cookEmail || !cookName || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: cookEmail, cookName, status' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return new Response(
        JSON.stringify({ error: 'Status must be either "approved" or "rejected"' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Get Resend API key from environment
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'Email service configuration error' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    // Generate email template
    const template = getEmailTemplate(status, cookName, rejectionReason);

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Kusinaries Team <notifications@kusinaries.app>', // Your verified domain
        to: [cookEmail], // Now we can send to the actual cook's email
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Resend API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }

    const emailData = await emailResponse.json();
    console.log('Email sent successfully:', emailData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        emailId: emailData.id 
      }),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
