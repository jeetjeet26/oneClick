-- Add write policies leveraging service role for server/ETL operations
-- and allow authenticated users in the same org to read their data.

-- DOCUMENTS
create policy "documents_service_write" on documents
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "documents_org_read" on documents
for select using (
  exists (
    select 1 from profiles p
    join properties pr on pr.id = documents.property_id
    where p.id = auth.uid() and p.org_id = pr.org_id
  ) or auth.role() = 'service_role'
);

-- FACT MARKETING PERFORMANCE
create policy "fact_mp_service_write" on fact_marketing_performance
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "fact_mp_org_read" on fact_marketing_performance
for select using (
  exists (
    select 1 from profiles p
    join properties pr on pr.id = fact_marketing_performance.property_id
    where p.id = auth.uid() and p.org_id = pr.org_id
  ) or auth.role() = 'service_role'
);

-- LEADS
create policy "leads_service_write" on leads
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "leads_org_read" on leads
for select using (
  exists (
    select 1 from profiles p
    join properties pr on pr.id = leads.property_id
    where p.id = auth.uid() and p.org_id = pr.org_id
  ) or auth.role() = 'service_role'
);

-- CONVERSATIONS
create policy "conversations_service_write" on conversations
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "conversations_org_read" on conversations
for select using (
  exists (
    select 1 from profiles p
    join properties pr on pr.id = conversations.property_id
    where p.id = auth.uid() and p.org_id = pr.org_id
  ) or auth.role() = 'service_role'
);

-- MESSAGES
create policy "messages_service_write" on messages
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create policy "messages_org_read" on messages
for select using (
  exists (
    select 1 from profiles p
    join conversations c on c.id = messages.conversation_id
    join properties pr on pr.id = c.property_id
    where p.id = auth.uid() and p.org_id = pr.org_id
  ) or auth.role() = 'service_role'
);

-- PROPERTIES/ORGANIZATIONS SELECT FOR AUTH USERS
create policy "properties_org_read_all" on properties
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.org_id = properties.org_id
  ) or auth.role() = 'service_role'
);

create policy "organizations_self_read" on organizations
for select using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.org_id = organizations.id
  ) or auth.role() = 'service_role'
);

















