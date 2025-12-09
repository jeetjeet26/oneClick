-- ============================================
-- Migration: Security Fixes - RLS Policies
-- Purpose: Fix RLS issues flagged by security advisor
-- ============================================

-- 1. Enable RLS on profiles table (has policies but RLS was disabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Add RLS policies for organizations
CREATE POLICY "org_select_own" ON public.organizations
    FOR SELECT USING (
        id IN (
            SELECT org_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    );

CREATE POLICY "org_service_all" ON public.organizations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 3. Add RLS policies for conversations
CREATE POLICY "conversations_select_own" ON public.conversations
    FOR SELECT USING (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.profiles pr ON p.org_id = pr.org_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "conversations_service_all" ON public.conversations
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Add RLS policies for messages
CREATE POLICY "messages_select_own" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT c.id FROM public.conversations c
            JOIN public.properties p ON c.property_id = p.id
            JOIN public.profiles pr ON p.org_id = pr.org_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "messages_service_all" ON public.messages
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 5. Add RLS policies for leads
CREATE POLICY "leads_select_own" ON public.leads
    FOR SELECT USING (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.profiles pr ON p.org_id = pr.org_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "leads_service_all" ON public.leads
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. Add RLS policies for documents
CREATE POLICY "documents_select_own" ON public.documents
    FOR SELECT USING (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.profiles pr ON p.org_id = pr.org_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "documents_insert_own" ON public.documents
    FOR INSERT WITH CHECK (
        property_id IN (
            SELECT p.id FROM public.properties p
            JOIN public.profiles pr ON p.org_id = pr.org_id
            WHERE pr.id = auth.uid()
        )
    );

CREATE POLICY "documents_service_all" ON public.documents
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Fix function search paths for better security
ALTER FUNCTION public.execute_readonly_query(TEXT) SET search_path = public;
ALTER FUNCTION public.match_documents(vector, double precision, integer, uuid) SET search_path = public;

