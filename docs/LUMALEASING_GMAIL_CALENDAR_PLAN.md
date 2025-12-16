# LumaLeasing Gmail & Google Calendar Integration Plan
## December 10, 2025

**Status:** PLANNING DOCUMENT  
**Owner:** Engineering Team  
**Priority:** High  
**Estimated Effort:** 3-4 weeks

---

## Executive Summary

Extend LumaLeasing to handle **email conversations** and **calendar-based tour scheduling** via Google APIs. This enables:
1. **Gmail Integration** - Receive prospect emails, auto-reply with AI, thread into CRM conversations
2. **Google Calendar Sync** - Two-way sync between tour bookings and leasing agent calendars
3. **Dynamic Availability** - Auto-generate tour slots from agent calendar availability
4. **Calendar Invites** - Send Google Calendar invites to prospects when tours are booked

---

## Current State Analysis

### What Exists Today

| Feature | Status |
|---------|--------|
| Chat widget conversations | ✅ Working |
| Manual tour slot creation | ✅ Working |
| Tour booking via widget | ✅ Working |
| Email confirmation (Resend) | ✅ Working |
| Inbound email handling | ❌ Not implemented |
| Google Calendar sync | ❌ Not implemented |
| Calendar invites to prospects | ❌ Not implemented |
| Dynamic availability | ❌ Not implemented |

### Existing OAuth/Google Patterns

The codebase already has Google OAuth patterns:
- `client_secret_*.json` - OAuth credentials present
- `google-credentials.json` - Service account for some features
- Social connections table for ForgeStudio OAuth tokens

---

## Phase 1: Gmail Integration (Week 1-2)

### 1.1 Database Schema

```sql
-- Migration: 20251211100000_gmail_calendar_integration.sql

-- Property Gmail Configuration
CREATE TABLE IF NOT EXISTS gmail_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE UNIQUE,
  gmail_address text NOT NULL, -- e.g., leasing@property.com
  access_token text, -- OAuth access token (encrypted)
  refresh_token text, -- OAuth refresh token (encrypted)
  token_expires_at timestamptz,
  history_id text, -- Gmail push notification history ID
  watch_expiration timestamptz, -- When push subscription expires
  auto_reply_enabled boolean DEFAULT true,
  auto_reply_delay_minutes int DEFAULT 5, -- Delay before AI responds
  signature text, -- Email signature to append
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Email Threads (maps to Gmail thread IDs)
CREATE TABLE IF NOT EXISTS email_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id), -- Links to existing conversation
  gmail_thread_id text NOT NULL, -- Gmail's thread ID
  subject text,
  last_message_at timestamptz,
  message_count int DEFAULT 0,
  status text DEFAULT 'open', -- 'open', 'closed', 'archived'
  assigned_agent_id uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(property_id, gmail_thread_id)
);

-- Individual Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES email_threads(id) ON DELETE CASCADE,
  gmail_message_id text NOT NULL UNIQUE,
  direction text NOT NULL, -- 'inbound', 'outbound'
  from_address text NOT NULL,
  to_address text NOT NULL,
  subject text,
  body_text text, -- Plain text version
  body_html text, -- HTML version
  ai_generated boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmail_config_property ON gmail_config(property_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_property ON email_threads(property_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_lead ON email_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_gmail ON email_threads(gmail_thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_gmail ON email_messages(gmail_message_id);

-- RLS
ALTER TABLE gmail_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to gmail_config" ON gmail_config FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to email_threads" ON email_threads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to email_messages" ON email_messages FOR ALL USING (auth.role() = 'service_role');
```

### 1.2 API Routes to Create

```
/api/lumaleasing/gmail/
├── connect/route.ts       # OAuth flow initiation
├── callback/route.ts      # OAuth callback handler
├── webhook/route.ts       # Gmail Push Notification receiver
├── sync/route.ts          # Manual sync trigger
├── config/route.ts        # Get/update gmail settings
└── threads/route.ts       # List email threads
```

### 1.3 Gmail Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GMAIL INTEGRATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. SETUP (One-time per property)                               │
│     ┌─────────┐    ┌──────────────┐    ┌─────────────┐         │
│     │ Admin   │───▶│ OAuth Flow   │───▶│ Store Token │         │
│     │ Panel   │    │ (Gmail API)  │    │ in DB       │         │
│     └─────────┘    └──────────────┘    └─────────────┘         │
│                                                                  │
│  2. WATCH (Subscribe to inbox changes)                          │
│     ┌─────────┐    ┌──────────────┐    ┌─────────────┐         │
│     │ Setup   │───▶│ Gmail Watch  │───▶│ Pub/Sub     │         │
│     │ Webhook │    │ API Call     │    │ Subscription│         │
│     └─────────┘    └──────────────┘    └─────────────┘         │
│                                                                  │
│  3. INBOUND EMAIL                                                │
│     ┌─────────┐    ┌──────────────┐    ┌─────────────┐         │
│     │ Gmail   │───▶│ Push to      │───▶│ Webhook     │         │
│     │ Inbox   │    │ Pub/Sub      │    │ Receives    │         │
│     └─────────┘    └──────────────┘    └─────────────┘         │
│                           │                                      │
│                           ▼                                      │
│     ┌─────────────────────────────────────────────┐             │
│     │              PROCESS EMAIL                   │             │
│     │  1. Fetch full message via Gmail API        │             │
│     │  2. Parse sender → match/create lead        │             │
│     │  3. Store in email_messages table           │             │
│     │  4. Link to/create conversation             │             │
│     │  5. Queue AI response (if enabled)          │             │
│     └─────────────────────────────────────────────┘             │
│                           │                                      │
│                           ▼                                      │
│  4. AI RESPONSE                                                  │
│     ┌─────────────────────────────────────────────┐             │
│     │  1. Use existing LumaLeasing RAG system     │             │
│     │  2. Generate contextual email reply         │             │
│     │  3. Send via Gmail API (same thread)        │             │
│     │  4. Store outbound message                  │             │
│     └─────────────────────────────────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Key Implementation: Webhook Handler

```typescript
// /api/lumaleasing/gmail/webhook/route.ts (pseudocode)

export async function POST(req: NextRequest) {
  // 1. Verify Pub/Sub message signature
  const message = await verifyPubSubMessage(req)
  
  // 2. Decode notification
  const { emailAddress, historyId } = JSON.parse(
    Buffer.from(message.data, 'base64').toString()
  )
  
  // 3. Find property by gmail address
  const config = await getGmailConfigByEmail(emailAddress)
  if (!config) return
  
  // 4. Fetch new messages since last historyId
  const gmail = await getGmailClient(config)
  const history = await gmail.users.history.list({
    userId: 'me',
    startHistoryId: config.history_id,
    historyTypes: ['messageAdded']
  })
  
  // 5. Process each new message
  for (const record of history.data.history || []) {
    for (const msg of record.messagesAdded || []) {
      await processInboundEmail(config, msg.message.id)
    }
  }
  
  // 6. Update history ID
  await updateHistoryId(config.id, historyId)
  
  return NextResponse.json({ success: true })
}

async function processInboundEmail(config, messageId) {
  // Fetch full message
  const gmail = await getGmailClient(config)
  const message = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  })
  
  // Parse headers
  const headers = parseHeaders(message.data.payload.headers)
  const from = headers.from
  const subject = headers.subject
  const threadId = message.data.threadId
  
  // Skip if we sent this message
  if (from.includes(config.gmail_address)) return
  
  // Find or create lead
  const email = extractEmail(from)
  let lead = await findLeadByEmail(config.property_id, email)
  if (!lead) {
    lead = await createLead({
      property_id: config.property_id,
      email,
      source: 'Email',
      first_name: extractName(from)
    })
  }
  
  // Find or create email thread
  let thread = await findEmailThread(config.property_id, threadId)
  if (!thread) {
    // Also create a conversation for unified view
    const conversation = await createConversation({
      property_id: config.property_id,
      lead_id: lead.id,
      channel: 'email'
    })
    
    thread = await createEmailThread({
      property_id: config.property_id,
      lead_id: lead.id,
      conversation_id: conversation.id,
      gmail_thread_id: threadId,
      subject
    })
  }
  
  // Store the message
  const body = extractBody(message.data.payload)
  await createEmailMessage({
    thread_id: thread.id,
    gmail_message_id: messageId,
    direction: 'inbound',
    from_address: from,
    to_address: config.gmail_address,
    subject,
    body_text: body.text,
    body_html: body.html,
    sent_at: new Date(parseInt(message.data.internalDate))
  })
  
  // Also add to conversation messages for unified view
  await createMessage({
    conversation_id: thread.conversation_id,
    role: 'user',
    content: body.text
  })
  
  // Queue AI response if enabled
  if (config.auto_reply_enabled) {
    await queueEmailResponse({
      thread_id: thread.id,
      delay_minutes: config.auto_reply_delay_minutes
    })
  }
}
```

### 1.5 AI Email Response

Reuse existing LumaLeasing RAG system:

```typescript
async function generateEmailResponse(thread) {
  // Get conversation history
  const messages = await getConversationMessages(thread.conversation_id)
  
  // Get property knowledge base
  const embedding = await generateEmbedding(messages[messages.length - 1].content)
  const context = await matchDocuments(embedding, thread.property_id)
  
  // Generate response using existing prompt structure
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: buildEmailSystemPrompt(thread, context) },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ]
  })
  
  // Send via Gmail API
  const gmail = await getGmailClient(thread.property_id)
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      threadId: thread.gmail_thread_id,
      raw: encodeEmail({
        to: thread.lead.email,
        subject: `Re: ${thread.subject}`,
        text: response.content,
        inReplyTo: thread.last_message_id
      })
    }
  })
}
```

---

## Phase 2: Google Calendar Integration (Week 2-3)

### 2.1 Database Schema (Add to same migration)

```sql
-- Agent Calendar Configuration
CREATE TABLE IF NOT EXISTS agent_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  google_email text NOT NULL, -- Agent's Google account
  calendar_id text DEFAULT 'primary', -- Which calendar to use
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  sync_enabled boolean DEFAULT true,
  working_hours jsonb DEFAULT '{"mon":{"start":"09:00","end":"18:00"},"tue":{"start":"09:00","end":"18:00"},"wed":{"start":"09:00","end":"18:00"},"thu":{"start":"09:00","end":"18:00"},"fri":{"start":"09:00","end":"18:00"}}',
  tour_duration_minutes int DEFAULT 30,
  buffer_minutes int DEFAULT 15, -- Buffer between tours
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(profile_id, property_id)
);

-- Calendar Events (for two-way sync tracking)
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_calendar_id uuid REFERENCES agent_calendars(id) ON DELETE CASCADE,
  tour_booking_id uuid REFERENCES tour_bookings(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  sync_status text DEFAULT 'synced', -- 'synced', 'pending', 'failed'
  last_synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(tour_booking_id)
);

-- Prospect Calendar Invites
CREATE TABLE IF NOT EXISTS prospect_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_booking_id uuid REFERENCES tour_bookings(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  google_event_id text, -- If we create on their behalf
  invite_sent_at timestamptz,
  invite_method text DEFAULT 'email', -- 'email' (with .ics) or 'google_calendar'
  response_status text, -- 'pending', 'accepted', 'declined', 'tentative'
  created_at timestamptz DEFAULT now(),
  UNIQUE(tour_booking_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_calendars_profile ON agent_calendars(profile_id);
CREATE INDEX IF NOT EXISTS idx_agent_calendars_property ON agent_calendars(property_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_agent ON calendar_events(agent_calendar_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_booking ON calendar_events(tour_booking_id);
CREATE INDEX IF NOT EXISTS idx_prospect_invites_booking ON prospect_invites(tour_booking_id);

-- RLS
ALTER TABLE agent_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to agent_calendars" ON agent_calendars FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to calendar_events" ON calendar_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to prospect_invites" ON prospect_invites FOR ALL USING (auth.role() = 'service_role');
```

### 2.2 API Routes to Create

```
/api/calendar/
├── connect/route.ts           # Agent OAuth flow
├── callback/route.ts          # OAuth callback
├── availability/route.ts      # GET dynamic availability
├── sync/route.ts              # Manual sync trigger
└── config/route.ts            # Agent calendar settings

/api/lumaleasing/tours/        # Modify existing
└── route.ts                   # Add calendar integration
```

### 2.3 Dynamic Availability Generation

```typescript
// /api/calendar/availability/route.ts

export async function GET(req: NextRequest) {
  const { propertyId, startDate, endDate } = parseParams(req)
  
  // Get all agents with calendars for this property
  const agentCalendars = await getAgentCalendars(propertyId)
  
  if (agentCalendars.length === 0) {
    // Fall back to manual tour_slots table
    return getManualSlots(propertyId, startDate, endDate)
  }
  
  const allAvailability: Slot[] = []
  
  for (const agent of agentCalendars) {
    const calendar = await getGoogleCalendarClient(agent)
    
    // Fetch busy times from Google Calendar
    const freeBusy = await calendar.freebusy.query({
      requestBody: {
        timeMin: startDate,
        timeMax: endDate,
        items: [{ id: agent.calendar_id }]
      }
    })
    
    const busyTimes = freeBusy.data.calendars[agent.calendar_id].busy || []
    
    // Generate available slots based on working hours minus busy times
    const slots = generateAvailableSlots({
      workingHours: agent.working_hours,
      busyTimes,
      tourDuration: agent.tour_duration_minutes,
      buffer: agent.buffer_minutes,
      startDate,
      endDate
    })
    
    // Add agent info to each slot
    slots.forEach(slot => {
      slot.agentId = agent.profile_id
      slot.agentName = agent.profile.full_name
      allAvailability.push(slot)
    })
  }
  
  // Group by date and time, return
  return NextResponse.json({
    slots: groupByDate(allAvailability),
    source: 'google_calendar'
  })
}

function generateAvailableSlots(options) {
  const { workingHours, busyTimes, tourDuration, buffer, startDate, endDate } = options
  const slots = []
  
  let currentDate = new Date(startDate)
  const end = new Date(endDate)
  
  while (currentDate <= end) {
    const dayOfWeek = ['sun','mon','tue','wed','thu','fri','sat'][currentDate.getDay()]
    const dayHours = workingHours[dayOfWeek]
    
    if (!dayHours) {
      currentDate.setDate(currentDate.getDate() + 1)
      continue
    }
    
    // Generate slots for this day
    let slotStart = parseTime(dayHours.start, currentDate)
    const dayEnd = parseTime(dayHours.end, currentDate)
    
    while (slotStart.getTime() + tourDuration * 60000 <= dayEnd.getTime()) {
      const slotEnd = new Date(slotStart.getTime() + tourDuration * 60000)
      
      // Check if this slot overlaps with any busy time
      const isBusy = busyTimes.some(busy => 
        overlaps(slotStart, slotEnd, new Date(busy.start), new Date(busy.end))
      )
      
      if (!isBusy) {
        slots.push({
          date: currentDate.toISOString().split('T')[0],
          startTime: formatTime(slotStart),
          endTime: formatTime(slotEnd)
        })
      }
      
      // Move to next potential slot (duration + buffer)
      slotStart = new Date(slotStart.getTime() + (tourDuration + buffer) * 60000)
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }
  
  return slots
}
```

### 2.4 Two-Way Sync: Booking → Agent Calendar

```typescript
// Modify /api/lumaleasing/tours/route.ts POST handler

async function createTourBooking(data) {
  // ... existing booking logic ...
  
  // After creating tour_bookings record:
  const booking = await createBooking(data)
  
  // Create Google Calendar event for agent
  if (data.agentId) {
    const agentCalendar = await getAgentCalendar(data.agentId, data.propertyId)
    
    if (agentCalendar?.sync_enabled) {
      const calendar = await getGoogleCalendarClient(agentCalendar)
      
      const event = await calendar.events.insert({
        calendarId: agentCalendar.calendar_id,
        requestBody: {
          summary: `Tour: ${lead.first_name} ${lead.last_name}`,
          description: buildTourDescription(booking, lead),
          start: {
            dateTime: `${booking.scheduled_date}T${booking.scheduled_time}`,
            timeZone: 'America/Chicago'
          },
          end: {
            dateTime: calculateEndTime(booking),
            timeZone: 'America/Chicago'
          },
          attendees: [
            { email: lead.email, displayName: `${lead.first_name} ${lead.last_name}` }
          ],
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 1440 }, // 24 hours
              { method: 'popup', minutes: 60 }    // 1 hour
            ]
          }
        },
        sendUpdates: 'all' // Sends invite to attendees
      })
      
      // Track the calendar event
      await createCalendarEvent({
        agent_calendar_id: agentCalendar.id,
        tour_booking_id: booking.id,
        google_event_id: event.data.id
      })
      
      // Track prospect invite
      await createProspectInvite({
        tour_booking_id: booking.id,
        lead_id: lead.id,
        google_event_id: event.data.id,
        invite_sent_at: new Date(),
        invite_method: 'google_calendar'
      })
    }
  }
  
  return booking
}
```

### 2.5 Calendar Event Webhook (Agent changes)

```typescript
// /api/calendar/webhook/route.ts

export async function POST(req: NextRequest) {
  const event = await req.json()
  
  // Handle calendar event updates
  if (event.resourceState === 'exists') {
    const calendarEvent = await findByGoogleEventId(event.resourceId)
    
    if (calendarEvent) {
      // Event was modified in Google Calendar
      const googleEvent = await fetchGoogleEvent(calendarEvent)
      
      if (googleEvent.status === 'cancelled') {
        // Agent cancelled in calendar → cancel our booking
        await updateTourBooking(calendarEvent.tour_booking_id, {
          status: 'cancelled',
          cancelled_via: 'google_calendar'
        })
      } else {
        // Check if time changed
        const newDate = googleEvent.start.dateTime.split('T')[0]
        const newTime = googleEvent.start.dateTime.split('T')[1].substring(0, 5)
        
        await updateTourBooking(calendarEvent.tour_booking_id, {
          scheduled_date: newDate,
          scheduled_time: newTime
        })
      }
    }
  }
  
  return NextResponse.json({ received: true })
}
```

---

## Phase 3: Lead Enrichment from Conversations (Week 3-4)

### 3.1 Schema Addition

```sql
-- Lead Interest Tracking (extracted from conversations)
CREATE TABLE IF NOT EXISTS lead_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  interest_type text NOT NULL, -- 'amenity', 'floorplan', 'pricing', 'move_in_date', 'pets', 'parking'
  interest_value text NOT NULL, -- 'pool', '2BR-A1', 'under $1500', etc.
  confidence float DEFAULT 1.0,
  extracted_from text, -- 'chat', 'email', 'manual'
  source_message_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_interests_lead ON lead_interests(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interests_type ON lead_interests(interest_type);

ALTER TABLE lead_interests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to lead_interests" ON lead_interests FOR ALL USING (auth.role() = 'service_role');

-- Add structured preferences to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferences jsonb DEFAULT '{}';
-- Structure: { amenities: [], floorplans: [], budget: { min, max }, move_in: date, pets: [], parking: boolean }
```

### 3.2 Conversation Analysis Function

```typescript
// utils/services/lead-enrichment.ts

const EXTRACTION_PROMPT = `Analyze this conversation and extract the prospect's interests and preferences.

Return JSON with these fields (null if not mentioned):
{
  "amenities": ["pool", "gym", "parking"], // Amenities they asked about or expressed interest in
  "floorplans": ["2BR", "A1"], // Bedroom counts or specific floorplan names
  "budget": { "min": 1200, "max": 1500 }, // Price range if mentioned
  "move_in_timeline": "January 2026", // When they want to move
  "pets": [{ "type": "dog", "breed": "labrador", "weight": 50 }], // Pet details
  "parking": { "needed": true, "type": "covered" }, // Parking needs
  "special_requirements": ["ground floor", "washer/dryer"], // Other requirements
  "urgency": "high" // "high", "medium", "low" based on language
}

Conversation:
`

export async function extractLeadInterests(conversationId: string) {
  const messages = await getConversationMessages(conversationId)
  const conversation = messages.map(m => 
    `${m.role === 'user' ? 'Prospect' : 'Assistant'}: ${m.content}`
  ).join('\n')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Extract structured data from conversations. Return valid JSON only.' },
      { role: 'user', content: EXTRACTION_PROMPT + conversation }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1
  })
  
  const interests = JSON.parse(response.choices[0].message.content)
  return interests
}

export async function enrichLeadFromConversation(leadId: string, conversationId: string) {
  const interests = await extractLeadInterests(conversationId)
  const supabase = createServiceClient()
  
  // Store individual interests
  const interestRecords = []
  
  if (interests.amenities?.length) {
    for (const amenity of interests.amenities) {
      interestRecords.push({
        lead_id: leadId,
        interest_type: 'amenity',
        interest_value: amenity,
        extracted_from: 'chat'
      })
    }
  }
  
  if (interests.floorplans?.length) {
    for (const fp of interests.floorplans) {
      interestRecords.push({
        lead_id: leadId,
        interest_type: 'floorplan',
        interest_value: fp,
        extracted_from: 'chat'
      })
    }
  }
  
  if (interests.budget) {
    interestRecords.push({
      lead_id: leadId,
      interest_type: 'budget',
      interest_value: JSON.stringify(interests.budget),
      extracted_from: 'chat'
    })
  }
  
  // ... similar for other fields
  
  if (interestRecords.length > 0) {
    await supabase.from('lead_interests').upsert(interestRecords, {
      onConflict: 'lead_id,interest_type,interest_value'
    })
  }
  
  // Update lead preferences (merged view)
  await supabase.from('leads').update({
    preferences: interests,
    updated_at: new Date().toISOString()
  }).eq('id', leadId)
  
  return interests
}
```

### 3.3 Integration Points

Call enrichment after:
1. **Chat session ends** (no activity for 10 min)
2. **Email thread closes**
3. **Tour is booked**
4. **Manual trigger from CRM**

```typescript
// In lumaleasing/chat/route.ts - add to response flow
if (shouldEnrichLead(widgetSession)) {
  // Queue enrichment (don't block response)
  queueLeadEnrichment(leadId, conversationId)
}
```

---

## Implementation Checklist

### Week 1: Gmail Foundation
- [ ] Create migration `20251211100000_gmail_calendar_integration.sql`
- [ ] Implement Gmail OAuth flow (`/api/lumaleasing/gmail/connect`)
- [ ] Set up Google Cloud Pub/Sub topic for Gmail push
- [ ] Implement webhook handler (`/api/lumaleasing/gmail/webhook`)
- [ ] Build email parsing and storage logic
- [ ] Create email threads UI in dashboard

### Week 2: Gmail AI + Calendar Foundation
- [ ] Implement AI email response generation
- [ ] Add email signature support
- [ ] Create Gmail admin config UI
- [ ] Implement agent calendar OAuth flow
- [ ] Build calendar config UI (working hours, etc.)

### Week 3: Calendar Features
- [ ] Implement dynamic availability generation
- [ ] Modify tour booking to create calendar events
- [ ] Implement two-way sync webhook
- [ ] Add calendar invites for prospects
- [ ] Test end-to-end tour booking flow

### Week 4: Lead Enrichment + Polish
- [ ] Implement conversation analysis
- [ ] Add lead_interests table and extraction
- [ ] Update leads UI to show extracted interests
- [ ] End-to-end testing
- [ ] Documentation and cleanup

---

## Google Cloud Setup Required

### 1. Enable APIs
```
- Gmail API
- Google Calendar API  
- Cloud Pub/Sub API
```

### 2. OAuth Consent Screen
```
Scopes needed:
- https://www.googleapis.com/auth/gmail.readonly
- https://www.googleapis.com/auth/gmail.send
- https://www.googleapis.com/auth/gmail.modify
- https://www.googleapis.com/auth/calendar
- https://www.googleapis.com/auth/calendar.events
```

### 3. Pub/Sub Setup
```
1. Create topic: lumaleasing-gmail-notifications
2. Create push subscription pointing to: 
   https://your-domain.com/api/lumaleasing/gmail/webhook
3. Grant Gmail publish permission to topic
```

### 4. Environment Variables
```env
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_PUBSUB_TOPIC=projects/xxx/topics/lumaleasing-gmail-notifications
GMAIL_WEBHOOK_SECRET=xxx
```

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Gmail quota limits | Medium | Medium | Implement rate limiting, batch operations |
| OAuth token expiry | High | Medium | Auto-refresh tokens, alert on failures |
| Pub/Sub delivery failures | Low | High | Implement retry logic, manual sync fallback |
| Calendar sync conflicts | Medium | Medium | Last-write-wins with audit log |
| AI email mistakes | Medium | High | Human approval option, confidence threshold |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Gmail connected | 3+ properties | Admin dashboard |
| Inbound emails processed | 95%+ | Webhook success rate |
| AI response accuracy | 90%+ | User feedback/overrides |
| Calendar events synced | 99%+ | Sync status tracking |
| Tour booking → Calendar | < 5 sec | Latency monitoring |
| Lead enrichment coverage | 80%+ leads | % with extracted interests |

---

## Linear Issues to Create

1. **Gmail Integration: OAuth + Webhook Foundation**
   - Priority: High
   - Due: Week 1
   
2. **Gmail Integration: AI Response System**
   - Priority: High
   - Due: Week 2
   
3. **Google Calendar: Agent OAuth + Config**
   - Priority: High
   - Due: Week 2
   
4. **Google Calendar: Dynamic Availability**
   - Priority: High
   - Due: Week 3
   
5. **Google Calendar: Two-Way Sync + Invites**
   - Priority: High
   - Due: Week 3
   
6. **Lead Enrichment: Conversation Analysis**
   - Priority: Medium
   - Due: Week 4

---

**Document Version:** 1.0  
**Created:** December 10, 2025

