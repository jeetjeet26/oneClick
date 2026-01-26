"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, MousePointer, Eye, Target, Download, Clock, CheckCircle, XCircle, History } from 'lucide-react';

interface PropertyMarketingDashboardProps {
  propertyId: string;
  propertyName: string;
}

interface MarketingData {
  property: {
    id: string;
    name: string;
    google_ads_account?: string;
    meta_ads_account?: string;
  };
  date_range: {
    start: string;
    end: string;
    days: number;
  };
  channels: Array<{
    channel: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
    campaign_count: number;
  }>;
  campaigns: Array<{
    campaign_id: string;
    campaign_name: string;
    channel: string;
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
  }>;
  totals: {
    spend: number;
    clicks: number;
    impressions: number;
    conversions: number;
  };
}

interface ImportJob {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'failed';
  progress_pct: number;
  current_step: string;
  records_imported: number;
  campaigns_found: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export default function PropertyMarketingDashboard({ 
  propertyId, 
  propertyName 
}: PropertyMarketingDashboardProps) {
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [importHistory, setImportHistory] = useState<ImportJob[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [selectedChannels, setSelectedChannels] = useState('google_ads,meta_ads');

  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await fetchData();
        await fetchImportHistory();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, [propertyId, dateRange, selectedChannels]);

  const fetchData = async (realtime = false) => {
    // Don't clear existing data during refetch
    if (!data) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const params = new URLSearchParams({
        dateRange,
        channels: selectedChannels,
        ...(realtime && { realtime: 'true' }),
      });

      console.log('Fetching marketing data:', { propertyId, dateRange, channels: selectedChannels });
      const response = await fetch(`/api/marketvision/${propertyId}?${params}`);
      const result = await response.json();
      
      console.log('Marketing data response:', { ok: response.ok, hasData: !!result, channels: result?.channels?.length });
      
      if (response.ok) {
        // Ensure we have valid data before setting
        if (result && (result.channels || result.campaigns || result.totals)) {
          setData(result);
          console.log('Data set successfully:', {
            channels: result.channels?.length,
            campaigns: result.campaigns?.length,
            totalSpend: result.totals?.spend
          });
        } else {
          console.warn('API returned success but no valid data');
          setError('No marketing data available for this property');
        }
      } else {
        console.error('Failed to fetch marketing data:', result.error);
        setError(result.error || 'Failed to load marketing data');
      }
    } catch (error) {
      console.error('Error fetching marketing data:', error);
      setError(error instanceof Error ? error.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchImportHistory = async () => {
    try {
      const response = await fetch(`/api/marketvision/import?property_id=${propertyId}`);
      const result = await response.json();
      
      if (response.ok) {
        setImportHistory(Array.isArray(result.job) ? result.job : [result.job]);
      }
    } catch (error) {
      console.error('Failed to fetch import history:', error);
    }
  };

  const triggerImport = async () => {
    setImporting(true);
    setImportJob(null);
    
    try {
      // Start import
      const response = await fetch('/api/marketvision/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          channels: selectedChannels.split(','),
          date_range: `LAST_${dateRange}`.replace('d', '_DAYS'),
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to start import');
      }

      const jobId = result.job_id;
      
      // Poll for status updates
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/marketvision/import?job_id=${jobId}`);
          const statusData = await statusRes.json();
          
          if (statusData.job) {
            setImportJob(statusData.job);
            
            // If complete or failed, stop polling
            if (statusData.job.status === 'complete' || statusData.job.status === 'failed') {
              clearInterval(pollInterval);
              setImporting(false);
              
              // Refresh data
              await fetchData();
              await fetchImportHistory();
              
              // Clear job status after 3 seconds
              setTimeout(() => setImportJob(null), 3000);
            }
          }
        } catch (error) {
          console.error('Status poll error:', error);
          clearInterval(pollInterval);
          setImporting(false);
        }
      }, 2000);

      // Safety timeout (stop polling after 5 minutes)
      setTimeout(() => {
        clearInterval(pollInterval);
        setImporting(false);
      }, 300000);

    } catch (error) {
      console.error('Import error:', error);
      setImporting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00';
    return ((clicks / impressions) * 100).toFixed(2);
  };

  const calculateCPC = (spend: number, clicks: number) => {
    if (clicks === 0) return '$0.00';
    return formatCurrency(spend / clicks);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">
            {error || 'No marketing data available'}
          </p>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}
          <Button onClick={() => fetchData()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Make sure ad accounts are linked in Settings → Integrations
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{propertyName}</h2>
          <p className="text-sm text-muted-foreground">
            Marketing Performance Dashboard
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            
            <Button
              size="sm"
              onClick={triggerImport}
              disabled={importing}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className={`h-4 w-4 mr-2 ${importing ? 'animate-bounce' : ''}`} />
              {importing ? 'Importing...' : 'Import Latest Data'}
            </Button>
          </div>
        </div>
      </div>

      {/* Import Status Banner */}
      {importJob && (
        <Card className={`border-2 ${
          importJob.status === 'complete' ? 'border-green-500 bg-green-50' :
          importJob.status === 'failed' ? 'border-red-500 bg-red-50' :
          'border-indigo-500 bg-indigo-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {importJob.status === 'running' && (
                  <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
                )}
                {importJob.status === 'complete' && (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                )}
                {importJob.status === 'failed' && (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="font-medium text-sm">
                  {importJob.status === 'running' && `${importJob.current_step || 'Processing'}...`}
                  {importJob.status === 'complete' && `✅ Import complete! ${importJob.records_imported} records imported`}
                  {importJob.status === 'failed' && `❌ Import failed: ${importJob.error_message}`}
                </span>
              </div>
              <span className="text-sm font-medium">{importJob.progress_pct}%</span>
            </div>
            {importJob.status === 'running' && (
              <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full transition-all duration-500"
                  style={{ width: `${importJob.progress_pct}%` }}
                />
              </div>
            )}
            {importJob.status === 'complete' && (
              <p className="text-sm text-green-700 mt-1">
                {importJob.campaigns_found} campaigns synced from ad platforms
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import History */}
      {showHistory && importHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import History</CardTitle>
            <CardDescription>Recent marketing data imports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {importHistory.map((job) => (
                <div 
                  key={job.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {job.status === 'complete' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                    {job.status === 'running' && <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />}
                    <div>
                      <p className="text-sm font-medium">
                        {job.status === 'complete' && `${job.records_imported} records imported`}
                        {job.status === 'failed' && 'Import failed'}
                        {job.status === 'running' && 'Import in progress...'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={job.status === 'complete' ? 'default' : 'secondary'}>
                    {job.campaigns_found || 0} campaigns
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <div className="flex gap-2">
        {data?.property?.google_ads_account && (
          <Badge variant="secondary">
            Google Ads: {data.property.google_ads_account}
          </Badge>
        )}
        {data?.property?.meta_ads_account && (
          <Badge variant="secondary">
            Meta Ads: {data.property.meta_ads_account}
          </Badge>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totals.spend)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.date_range.days} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MousePointer className="h-4 w-4 text-blue-600" />
              Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totals.clicks)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculateCPC(data.totals.spend, data.totals.clicks)} CPC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-600" />
              Impressions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totals.impressions)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {calculateCTR(data.totals.clicks, data.totals.impressions)}% CTR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(data.totals.conversions)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totals.conversions > 0 
                ? formatCurrency(data.totals.spend / data.totals.conversions) 
                : '$0'} CPA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Channel */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Channel</CardTitle>
          <CardDescription>
            Breakdown of spend and engagement across advertising channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.channels.map((channel) => (
              <div key={channel.channel} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold capitalize">
                    {channel.channel.replace('_', ' ')}
                  </h3>
                  <Badge>{channel.campaign_count} campaigns</Badge>
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Spend</p>
                    <p className="font-semibold">{formatCurrency(channel.spend)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clicks</p>
                    <p className="font-semibold">{formatNumber(channel.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Impressions</p>
                    <p className="font-semibold">{formatNumber(channel.impressions)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Conversions</p>
                    <p className="font-semibold">{formatNumber(channel.conversions)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns by Spend</CardTitle>
          <CardDescription>
            Most expensive campaigns in the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.campaigns
              .sort((a, b) => b.spend - a.spend)
              .slice(0, 10)
              .map((campaign) => (
                <div 
                  key={`${campaign.channel}_${campaign.campaign_id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{campaign.campaign_name}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {campaign.channel.replace('_', ' ')}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-8 text-sm text-right">
                    <div>
                      <p className="font-semibold">{formatCurrency(campaign.spend)}</p>
                      <p className="text-xs text-muted-foreground">Spend</p>
                    </div>
                    <div>
                      <p className="font-semibold">{formatNumber(campaign.clicks)}</p>
                      <p className="text-xs text-muted-foreground">Clicks</p>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {calculateCTR(campaign.clicks, campaign.impressions)}%
                      </p>
                      <p className="text-xs text-muted-foreground">CTR</p>
                    </div>
                    <div>
                      <p className="font-semibold">{formatNumber(campaign.conversions)}</p>
                      <p className="text-xs text-muted-foreground">Conv</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

