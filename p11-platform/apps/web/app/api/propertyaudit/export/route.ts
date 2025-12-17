/**
 * PropertyAudit Export API
 * Generate PDF/Markdown reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET: Export run report in PDF or Markdown format
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = req.nextUrl.searchParams
    const runId = searchParams.get('runId')
    const format = searchParams.get('format') || 'markdown'

    if (!runId) {
      return NextResponse.json({ error: 'runId required' }, { status: 400 })
    }

    // Fetch run with all details
    const { data: run, error: runError } = await supabase
      .from('geo_runs')
      .select(`
        *,
        properties (name, address),
        geo_scores (*),
        geo_answers (
          *,
          geo_queries (text, type),
          geo_citations (url, domain, is_brand_domain)
        )
      `)
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    const property = run.properties as { name: string; address: any } | null
    const score = run.geo_scores?.[0]
    const answers = run.geo_answers || []

    if (format === 'markdown') {
      const markdown = generateMarkdown(run, property, score, answers)
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="geo_report_${runId}.md"`
        }
      })
    }

    // For PDF, return a simple HTML that can be converted to PDF client-side
    // In production, use a proper PDF library like @react-pdf/renderer
    const html = generateHTML(run, property, score, answers)
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="geo_report_${runId}.html"`
      }
    })
  } catch (error) {
    console.error('PropertyAudit Export Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateMarkdown(run: any, property: any, score: any, answers: any[]): string {
  const lines: string[] = []
  
  lines.push(`# GEO Audit Report`)
  lines.push(``)
  lines.push(`**Property:** ${property?.name || 'Unknown'}`)
  lines.push(`**Surface:** ${run.surface.toUpperCase()}`)
  lines.push(`**Model:** ${run.model_name}`)
  lines.push(`**Date:** ${new Date(run.started_at).toLocaleString()}`)
  lines.push(``)
  
  if (score) {
    lines.push(`## Overall Score: ${score.overall_score.toFixed(1)}`)
    lines.push(``)
    lines.push(`- **Visibility:** ${score.visibility_pct.toFixed(1)}%`)
    lines.push(`- **Avg LLM Rank:** ${score.avg_llm_rank?.toFixed(1) ?? 'N/A'}`)
    lines.push(`- **Avg Link Rank:** ${score.avg_link_rank?.toFixed(1) ?? 'N/A'}`)
    lines.push(`- **Avg SOV:** ${score.avg_sov ? (score.avg_sov * 100).toFixed(1) + '%' : 'N/A'}`)
    lines.push(``)
    lines.push(`### Score Breakdown`)
    lines.push(``)
    lines.push(`- Position (45%): ${score.breakdown.position.toFixed(0)}`)
    lines.push(`- Link (25%): ${score.breakdown.link.toFixed(0)}`)
    lines.push(`- SOV (20%): ${score.breakdown.sov.toFixed(0)}`)
    lines.push(`- Accuracy (10%): ${score.breakdown.accuracy.toFixed(0)}`)
    lines.push(``)
  }
  
  lines.push(`## Query Results (${answers.length})`)
  lines.push(``)
  
  answers.forEach((answer: any, idx: number) => {
    const query = answer.geo_queries
    lines.push(`### ${idx + 1}. ${query?.text}`)
    lines.push(``)
    lines.push(`- **Type:** ${query?.type}`)
    lines.push(`- **Presence:** ${answer.presence ? '✓' : '✗'}`)
    lines.push(`- **LLM Rank:** ${answer.llm_rank ?? 'N/A'}`)
    lines.push(`- **Link Rank:** ${answer.link_rank ?? 'N/A'}`)
    lines.push(`- **SOV:** ${answer.sov ? (answer.sov * 100).toFixed(1) + '%' : 'N/A'}`)
    
    if (answer.flags && answer.flags.length > 0) {
      lines.push(`- **Flags:** ${answer.flags.join(', ')}`)
    }
    
    lines.push(``)
    lines.push(`**Answer:** ${answer.answer_summary}`)
    lines.push(``)
    
    if (answer.ordered_entities && answer.ordered_entities.length > 0) {
      lines.push(`**Entities:**`)
      answer.ordered_entities.forEach((entity: any) => {
        lines.push(`- ${entity.position}. ${entity.name} (${entity.domain})`)
      })
      lines.push(``)
    }
    
    if (answer.geo_citations && answer.geo_citations.length > 0) {
      lines.push(`**Citations:**`)
      answer.geo_citations.forEach((citation: any, i: number) => {
        const brandTag = citation.is_brand_domain ? ' 🏷️' : ''
        lines.push(`${i + 1}. ${citation.domain}${brandTag}`)
        lines.push(`   ${citation.url}`)
      })
      lines.push(``)
    }
    
    lines.push(`---`)
    lines.push(``)
  })
  
  return lines.join('\n')
}

function generateHTML(run: any, property: any, score: any, answers: any[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>GEO Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
    h1 { color: #1f2937; border-bottom: 3px solid #6366f1; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #4b5563; margin-top: 20px; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #f3f4f6; border-radius: 8px; }
    .metric-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .metric-value { font-size: 24px; font-weight: bold; color: #1f2937; }
    .query-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 15px 0; }
    .entity { padding: 10px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin: 8px 0; }
    .citation { padding: 8px; background: white; border-left: 3px solid #d1d5db; margin: 5px 0; font-size: 14px; }
    .brand-citation { border-left-color: #10b981; background: #f0fdf4; }
  </style>
</head>
<body>
  <h1>GEO Audit Report</h1>
  <p><strong>Property:</strong> ${property?.name || 'Unknown'}</p>
  <p><strong>Surface:</strong> ${run.surface.toUpperCase()}</p>
  <p><strong>Model:</strong> ${run.model_name}</p>
  <p><strong>Date:</strong> ${new Date(run.started_at).toLocaleString()}</p>
  
  ${score ? `
  <h2>Overall Score: ${score.overall_score.toFixed(1)}</h2>
  <div class="metric">
    <div class="metric-label">Visibility</div>
    <div class="metric-value">${score.visibility_pct.toFixed(1)}%</div>
  </div>
  <div class="metric">
    <div class="metric-label">Avg LLM Rank</div>
    <div class="metric-value">${score.avg_llm_rank?.toFixed(1) ?? 'N/A'}</div>
  </div>
  <div class="metric">
    <div class="metric-label">Avg SOV</div>
    <div class="metric-value">${score.avg_sov ? (score.avg_sov * 100).toFixed(1) + '%' : 'N/A'}</div>
  </div>
  ` : ''}
  
  <h2>Query Results (${answers.length})</h2>
  
  ${answers.map((answer: any, idx: number) => {
    const query = answer.geo_queries
    return `
    <div class="query-card">
      <h3>${idx + 1}. ${query?.text}</h3>
      <p><strong>Type:</strong> ${query?.type} | <strong>Presence:</strong> ${answer.presence ? '✓' : '✗'} | <strong>LLM Rank:</strong> ${answer.llm_rank ?? 'N/A'}</p>
      <p>${answer.answer_summary}</p>
      
      ${answer.ordered_entities && answer.ordered_entities.length > 0 ? `
        <h4>Entities:</h4>
        ${answer.ordered_entities.map((entity: any) => `
          <div class="entity">
            <strong>${entity.position}. ${entity.name}</strong> (${entity.domain})
            <p style="margin: 5px 0 0 0; font-size: 14px;">${entity.rationale}</p>
          </div>
        `).join('')}
      ` : ''}
      
      ${answer.geo_citations && answer.geo_citations.length > 0 ? `
        <h4>Citations:</h4>
        ${answer.geo_citations.map((citation: any, i: number) => `
          <div class="citation ${citation.is_brand_domain ? 'brand-citation' : ''}">
            <strong>${i + 1}. ${citation.domain}</strong>${citation.is_brand_domain ? ' (Your Brand)' : ''}
            <br/><small>${citation.url}</small>
          </div>
        `).join('')}
      ` : ''}
    </div>
    `
  }).join('')}
  
  <hr style="margin-top: 40px; border: none; border-top: 2px solid #e5e7eb;">
  <p style="text-align: center; color: #9ca3af; font-size: 12px;">Generated by P11 PropertyAudit</p>
</body>
</html>
  `.trim()
}
