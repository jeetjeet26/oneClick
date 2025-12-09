'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Property = {
  id: string;
  name: string;
  city?: string;
};

type PropertyContextValue = {
  properties: Property[];
  currentProperty: Property;
  loading: boolean;
  setProperty: (id: string) => void;
};

const PropertyContext = createContext<PropertyContextValue | null>(null);

const DEFAULT_PROPERTY_ID =
  process.env.NEXT_PUBLIC_DEFAULT_PROPERTY_ID ||
  '123e4567-e89b-12d3-a456-426614174000';

const DEFAULT_PROPERTIES: Property[] = [
  { id: DEFAULT_PROPERTY_ID, name: 'The Reserve at Sandpoint', city: 'Sandpoint, ID' },
  { id: '223e4567-e89b-12d3-a456-426614174000', name: 'Lakeside Flats', city: 'Austin, TX' },
  { id: '323e4567-e89b-12d3-a456-426614174000', name: 'Parkview Commons', city: 'Seattle, WA' },
];

export function PropertyProvider({ children }: { children: React.ReactNode }) {
  const [properties, setProperties] = useState<Property[]>(DEFAULT_PROPERTIES);
  const [selectedId, setSelectedId] = useState<string>(DEFAULT_PROPERTY_ID);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/properties');
        if (!res.ok) throw new Error('Failed to fetch properties');
        const data = await res.json();
        const fetched: Property[] = data.properties?.map((p: any) => ({
          id: p.id,
          name: p.name,
          city: p.settings?.city ?? p.address?.city,
        })) ?? [];
        if (!cancelled && fetched.length) {
          setProperties(fetched);
          // Reset selection if current is missing
          const stillExists = fetched.some((p) => p.id === selectedId);
          if (!stillExists) {
            setSelectedId(fetched[0].id);
          }
        }
      } catch (err) {
        console.error('Property load error, using defaults', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const contextValue = useMemo<PropertyContextValue>(() => {
    const fallback = properties[0];
    const current = properties.find((p) => p.id === selectedId) || fallback;
    return {
      properties,
      currentProperty: current,
      loading,
      setProperty: setSelectedId,
    };
  }, [properties, selectedId, loading]);

  return <PropertyContext.Provider value={contextValue}>{children}</PropertyContext.Provider>;
}

export function usePropertyContext() {
  const ctx = useContext(PropertyContext);
  if (!ctx) {
    throw new Error('usePropertyContext must be used within PropertyProvider');
  }
  return ctx;
}


