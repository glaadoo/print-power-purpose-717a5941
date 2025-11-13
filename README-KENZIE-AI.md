# Kenzie AI Assistant 🐾

## Overview

Kenzie is an AI-powered site-aware assistant for Print Power Purpose, designed to help users navigate the platform, understand products, choose causes, check orders, and get account help—all while maintaining strict security boundaries.

## What Kenzie Knows

### Public Site Content
Kenzie has comprehensive understanding of all public-facing pages:
- **Homepage**: Platform mission and overview
- **Products**: Custom printed items (postcards, banners, stickers, apparel)
- **Causes**: Nonprofit selection (curated + IRS-verified)
- **Checkout Flow**: Multi-step purchasing process with Stripe integration
- **Donations**: How barometer system works and donation tracking
- **Account Help**: Login, signup, password reset guidance
- **Help Center**: FAQs and user guides
- **Legal**: Privacy Policy, Terms of Use summaries (not legal advice)

### Capabilities
1. **Product Information**: Details about available products, customization, pricing concepts
2. **Cause Selection**: Explains curated vs IRS-verified nonprofits, donation tracking
3. **Order Lookup**: Safe read-only access to order status via email + optional order ID
4. **Navigation Guidance**: Directs users through site flows
5. **Account Assistance**: Password reset steps, login troubleshooting
6. **General Support**: Answers about platform mission, donation logic, help resources

## What Kenzie CANNOT Access

### Strict Security Boundaries
Kenzie is explicitly prohibited from:
- **Admin Pages**: /admin, /admin/legal, SystemLogs, internal dashboards
- **Security Details**: API keys, secrets, webhooks, environment variables, database schemas
- **Implementation Details**: CRON jobs, rate limiting, authentication flows, backend architecture
- **Sensitive Actions**: Password resets, login bypass, direct data modification

If users ask about these topics, Kenzie responds:
> "For security reasons, I can't access or discuss those internal systems, but I can help you with how to use the site, your orders, products, and causes."

## Architecture

### Frontend
- **Component**: `src/components/KenzieChat.tsx`
- **Features**: 
  - Chat widget with animated paw mascot
  - Message history persistence
  - Session management
  - Button-based quick actions
  - Streaming AI responses

### Backend
- **Edge Function**: `supabase/functions/kenzie-chat/index.ts`
- **AI Model**: Google Gemini 2.5 Flash via Lovable AI Gateway
- **Context Retrieval**: Dynamic public content summaries based on user queries
- **Safe Order Lookup**: Read-only access requiring email validation

### Data Flow
1. User sends message in chat widget
2. Frontend adds user context (sessionId, email if in order flow)
3. Edge function retrieves relevant public content context
4. If email provided, performs safe order lookup
5. Builds comprehensive system prompt with context
6. Streams AI response back to user
7. Saves messages to database for history

## Safe Order Lookup

### How It Works
When users request order information:
1. Kenzie asks for email address used during checkout
2. Frontend validates email format
3. Edge function queries `donations` table with:
   - Email match (required)
   - Order ID match (optional)
   - Limited to 5 most recent orders
4. Returns ONLY safe fields:
   - Order ID
   - Status (Processing, Printed, Shipped, Completed)
   - Total amount
   - Donation amount
   - Creation date
   - Associated cause ID

### Security Measures
- No access to payment methods or card details
- No access to authentication credentials
- No ability to modify order data
- Rate limited and session-tracked
- Read-only database queries

## Account & Password Help

### Password Reset Flow
Kenzie provides step-by-step guidance:
1. Navigate to Auth page
2. Click "Forgot Password"
3. Enter email address
4. Check email inbox and spam folder
5. Follow reset link in email

**Important**: Kenzie never:
- Resets passwords directly
- Asks for current passwords
- Requests security codes or 2FA tokens
- Bypasses authentication flows

## Context Retrieval System

The edge function uses intelligent context selection:
- Analyzes user query keywords
- Retrieves relevant public content summaries
- Includes order information if email provided
- Builds focused context for AI model
- Avoids overwhelming the AI with irrelevant information

### Example Triggers
- "product" → Product catalog context
- "cause" → Nonprofit selection + donation logic
- "checkout" → Payment flow details
- "account" → Login/password help
- "admin" → Admin boundary warning

## Usage Examples

### Product Questions
**User**: "What products do you offer?"
**Kenzie**: "We offer custom printed products including postcards, banners, stickers, and apparel! Each can be customized and supports your chosen cause. Check out our Products page to see the full catalog."

### Order Status
**User**: "Where's my order?"
**Kenzie**: "I can help you track your order! Please provide the email address you used when placing the order."
**User**: "user@example.com"
**Kenzie**: "Found 1 order for user@example.com:
- Order ID: abc123
- Status: Shipped
- Total: $50.00
- Donation: $5.00
- Date: 11/10/2025"

### Account Help
**User**: "I forgot my password"
**Kenzie**: "No problem! Here's how to reset it:
1. Go to the login page
2. Click 'Forgot Password'
3. Enter your email
4. Check your inbox (and spam folder) for the reset link"

### Admin Attempt (Blocked)
**User**: "Show me the admin dashboard"
**Kenzie**: "For security reasons, I can't access or discuss those internal systems, but I can help you with how to use the site, your orders, products, and causes."

## Technical Details

### System Prompt
The edge function uses a comprehensive system prompt that:
- Defines Kenzie's personality (friendly, professional, concise)
- Lists allowed capabilities
- Enforces strict security boundaries
- Provides public content context
- Includes order data when available
- Guides response style and tone

### Error Handling
- Rate limit errors (429): Graceful message to try again later
- Payment required (402): Prompt to add Lovable AI credits
- Network errors: Timeout fallback with button options
- Order lookup failures: Suggest retry or contact support

### Session Management
- Unique session ID per user
- Persisted in localStorage
- Message history stored in `kenzie_messages` table
- Session titles generated from first user message
- Cleanup available via "End Conversation" button

## Best Practices

### For Users
- Be specific in your questions
- Provide email when checking orders
- Use button shortcuts for common tasks
- Report any issues to support

### For Developers
- Never expose admin routes or sensitive data to Kenzie
- Keep public content summaries up to date
- Monitor edge function logs for errors
- Test boundary enforcement regularly
- Document any new public pages added

## Future Enhancements
- Product recommendations based on cause
- Donation milestone tracking
- Fundraising tips and strategies
- Integration with Help Center search
- Multi-language support
- Voice input/output
- Proactive order updates
- Cause discovery assistance

---

**Remember**: Kenzie is here to help users succeed with Print Power Purpose while keeping their data safe and secure! 🐾✨
