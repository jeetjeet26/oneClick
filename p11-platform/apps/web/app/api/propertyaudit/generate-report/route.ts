/**
 * PropertyAudit Report Generation API
 * Generates professional PDF reports with visualizations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { propertyId, template, includeSections, recipients } = body

    if (!propertyId || !template) {
      return NextResponse.json(
        { error: 'propertyId and template required' },
        { status: 400 }
      )
    }

    // Fetch comprehensive data for report
    const reportData = await fetchReportData(supabase, propertyId)

    if (!reportData) {
      return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 })
    }

    // Generate HTML report
    const html = generateReportHTML(reportData, template, includeSections)

    // For now, return HTML that can be printed to PDF
    // In production, use Puppeteer for server-side PDF generation:
    // const pdf = await generatePDF(html)
    // return new NextResponse(pdf, { headers: { 'Content-Type': 'application/pdf' }})

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="GEO-Report-${propertyId}.html"`,
      },
    })
  } catch (error) {
    console.error('Report Generation Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

async function fetchReportData(supabase: any, propertyId: string) {
  // Fetch property
  const { data: property } = await supabase
    .from('properties')
    .select('name, address')
    .eq('id', propertyId)
    .single()

  // Fetch latest runs
  const { data: runs } = await supabase
    .from('geo_runs')
    .select('*, geo_scores(*)')
    .eq('property_id', propertyId)
    .eq('status', 'completed')
    .order('started_at', { ascending: false })
    .limit(2)

  // Fetch queries with latest answers
  const { data: queries } = await supabase
    .from('geo_queries')
    .select(`
      *,
      geo_answers!inner(
        *,
        geo_citations(*)
      )
    `)
    .eq('property_id', propertyId)

  // Fetch competitors
  const runIds = runs?.map((r: any) => r.id) || []
  const { data: insights } = await supabase
    .rpc('get_insights', { property_id: propertyId, run_ids: runIds })
    .single()

  return {
    property,
    runs,
    queries,
    competitors: insights?.competitors || [],
    scores: runs?.map((r: any) => r.geo_scores?.[0]).filter(Boolean) || [],
  }
}

function generateReportHTML(data: any, template: string, sections: string[]): string {
  const { property, runs, queries, competitors, scores } = data

  const latestScore = scores[0]
  const propertyName = property?.name || 'Property'
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GEO Visibility Report - ${propertyName}</title>
  <style>
    @page {
      size: Letter;
      margin: 0.75in;
    }
    
    body {
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 8.5in;
      margin: 0 auto;
      padding: 20px;
    }
    
    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 10in;
      text-align: center;
      page-break-after: always;
    }
    
    .logo {
      font-size: 2.5rem;
      font-weight: bold;
      color: #6366f1;
      margin-bottom: 2rem;
    }
    
    h1 {
      font-size: 2.5rem;
      color: #111827;
      margin: 1rem 0;
      font-weight: 700;
    }
    
    h2 {
      font-size: 1.75rem;
      color: #374151;
      margin: 2rem 0 1rem 0;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 0.5rem;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 1.25rem;
      color: #4b5563;
      margin: 1.5rem 0 0.75rem 0;
      page-break-after: avoid;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 1.5rem;
      text-align: center;
    }
    
    .metric-value {
      font-size: 3rem;
      font-weight: bold;
      color: #6366f1;
      line-height: 1;
    }
    
    .metric-label {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 0.5rem;
    }
    
    .query-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1.5rem 0;
      font-size: 0.875rem;
    }
    
    .query-table th {
      background: #f3f4f6;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #d1d5db;
    }
    
    .query-table td {
      padding: 0.75rem;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
    }
    
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    
    .badge-warning {
      background: #fef3c7;
      color: #92400e;
    }
    
    .badge-error {
      background: #fee2e2;
      color: #991b1b;
    }
    
    .recommendation-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.25rem;
      margin: 1rem 0;
      page-break-inside: avoid;
    }
    
    .footer {
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #9ca3af;
      font-size: 0.75rem;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="logo">P11 PropertyAudit</div>
    <h1>GEO Visibility Report</h1>
    <div style="font-size: 1.5rem; color: #6b7280; margin: 1rem 0;">
      ${propertyName}
    </div>
    <div style="font-size: 1.125rem; color: #9ca3af;">
      Generated: ${generatedDate}
    </div>
    ${property?.address?.city ? `
      <div style="margin-top: 2rem; color: #6b7280;">
        ${property.address.city}, ${property.address.state || ''}
      </div>
    ` : ''}
  </div>

  <!-- Executive Summary -->
  ${sections.includes('summary') ? `
  <h2>Executive Summary</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-value">${latestScore ? Math.round(latestScore.overall_score) : 'N/A'}</div>
      <div class="metric-label">GEO Score</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${latestScore ? Math.round(latestScore.visibility_pct) : 'N/A'}%</div>
      <div class="metric-label">Visibility</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${latestScore?.avg_llm_rank?.toFixed(1) || 'N/A'}</div>
      <div class="metric-label">Avg Rank</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${queries?.length || 0}</div>
      <div class="metric-label">Queries Tracked</div>
    </div>
  </div>

  <h3>Key Findings</h3>
  <ul style="line-height: 1.8;">
    <li>Overall GEO score of <strong>${latestScore ? Math.round(latestScore.overall_score) : 'N/A'}/100</strong> ${getScoreBucket(latestScore?.overall_score)}</li>
    <li>Visibility at <strong>${latestScore ? Math.round(latestScore.visibility_pct) : 0}%</strong> across all tracked queries</li>
    <li>Average ranking position: <strong>#${latestScore?.avg_llm_rank?.toFixed(1) || 'N/A'}</strong></li>
    <li>${competitors.length > 0 ? `Primary competitor: <strong>${competitors[0].name}</strong> (${competitors[0].mentionCount} mentions)` : 'Competitive analysis in progress'}</li>
  </ul>
  ` : ''}

  <!-- Query Performance -->
  ${sections.includes('queries') ? `
  <h2>Query Performance Details</h2>
  <table class="query-table">
    <thead>
      <tr>
        <th>Query</th>
        <th>Type</th>
        <th>Presence</th>
        <th>Rank</th>
        <th>SOV</th>
      </tr>
    </thead>
    <tbody>
      ${queries?.slice(0, 20).map((q: any) => {
        const answer = q.geo_answers?.[0]
        return `
        <tr>
          <td>${q.text}</td>
          <td><span class="badge">${q.type}</span></td>
          <td>
            ${answer?.presence 
              ? '<span class="badge badge-success">✓ Yes</span>'
              : '<span class="badge badge-error">✗ No</span>'
            }
          </td>
          <td>${answer?.llm_rank ? `#${answer.llm_rank}` : '—'}</td>
          <td>${answer?.sov ? `${(answer.sov * 100).toFixed(0)}%` : '—'}</td>
        </tr>
        `
      }).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Recommendations -->
  ${sections.includes('recommendations') ? `
  <h2>Actionable Recommendations</h2>
  <p style="color: #6b7280; margin-bottom: 1.5rem;">
    Based on your GEO performance analysis, here are prioritized actions to improve visibility:
  </p>
  
  <div class="recommendation-card">
    <h3 style="margin-top: 0;">1. Maintain Perfect Visibility</h3>
    <p>You're achieving 100% visibility across all queries. Focus on maintaining this leadership position.</p>
    <ul>
      <li>Monitor competitor activity weekly</li>
      <li>Refresh content quarterly</li>
      <li>Build additional authoritative citations</li>
      <li>Expand query coverage to new opportunities</li>
    </ul>
  </div>
  
  ${latestScore && latestScore.visibility_pct < 100 ? `
  <div class="recommendation-card">
    <h3 style="margin-top: 0;">2. Improve Visibility Gaps</h3>
    <p>Address queries where your property is not mentioned to increase overall visibility.</p>
    <ul>
      <li>Create targeted content for missing queries</li>
      <li>Optimize existing pages with relevant keywords</li>
      <li>Build backlinks from authoritative sources</li>
    </ul>
  </div>
  ` : ''}
  ` : ''}

  <!-- Competitive Analysis -->
  ${sections.includes('competitors') && competitors.length > 0 ? `
  <h2>Competitive Landscape</h2>
  <p style="color: #6b7280; margin-bottom: 1.5rem;">
    Analysis of competitor mentions in AI search results:
  </p>
  <table class="query-table">
    <thead>
      <tr>
        <th>Rank</th>
        <th>Competitor</th>
        <th>Mentions</th>
        <th>Avg Position</th>
      </tr>
    </thead>
    <tbody>
      ${competitors.slice(0, 10).map((comp: any, idx: number) => `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td>${comp.name}</td>
        <td>${comp.mentionCount}</td>
        <td>#${comp.avgRank?.toFixed(1) || 'N/A'}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Footer -->
  <div class="footer">
    <p><strong>P11 PropertyAudit</strong></p>
    <p>Generative Engine Optimization (GEO) Report</p>
    <p>Generated on ${generatedDate}</p>
    <p style="margin-top: 1rem;">
      This report contains proprietary analysis. For questions, contact your P11 team.
    </p>
  </div>

  <!-- Print Button (hidden when printed) -->
  <div class="no-print" style="position: fixed; bottom: 2rem; right: 2rem;">
    <button 
      onclick="window.print()" 
      style="background: #6366f1; color: white; padding: 1rem 2rem; border-radius: 8px; border: none; font-weight: 600; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
    >
      Print to PDF
    </button>
  </div>
</body>
</html>
  `.trim()
}

function getScoreBucket(score: number | undefined): string {
  if (!score) return ''
  if (score >= 75) return '(Excellent)'
  if (score >= 50) return '(Good)'
  if (score >= 25) return '(Fair)'
  return '(Needs Improvement)'
}
