"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Save, Loader2 } from 'lucide-react';

interface ImportScheduleSettingsProps {
  propertyId: string;
  currentSchedule?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    time?: string;
  };
}

export default function ImportScheduleSettings({ 
  propertyId, 
  currentSchedule 
}: ImportScheduleSettingsProps) {
  const [enabled, setEnabled] = useState(currentSchedule?.enabled || false);
  const [frequency, setFrequency] = useState(currentSchedule?.frequency || 'daily');
  const [time, setTime] = useState(currentSchedule?.time || '02:00');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/marketvision/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          enabled,
          frequency,
          time,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save schedule');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Save schedule error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Auto-Import Schedule
        </CardTitle>
        <CardDescription>
          Automatically import fresh data on a schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Auto-Import</p>
            <p className="text-sm text-muted-foreground">
              Automatically pull latest data from ad platforms
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">
                Frequency
              </label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Every hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(frequency === 'daily' || frequency === 'weekly') && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Time (UTC)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : saved ? (
                  <><Save className="h-4 w-4 mr-2" /> Saved!</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Save Schedule</>
                )}
              </Button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Next import:</strong> {frequency === 'hourly' ? 'Within the next hour' : `Today at ${time} UTC`}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

