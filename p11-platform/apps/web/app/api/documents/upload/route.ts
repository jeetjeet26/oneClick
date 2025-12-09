import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import OpenAI from 'openai'
import { extractText } from 'unpdf'

const MAX_CHUNK = 800
const CHUNK_OVERLAP = 100

// Smarter chunking that tries to break at sentence boundaries
function chunkText(text: string, maxSize = MAX_CHUNK, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length > maxSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      // Keep some overlap for context
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.floor(overlap / 5))
      currentChunk = overlapWords.join(' ') + ' ' + sentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 50) // Filter out tiny chunks
}

// Extract text from PDF using unpdf (works in Node.js/serverless)
async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  try {
    const { text } = await extractText(buffer)
    // unpdf returns text as array of strings (one per page)
    if (Array.isArray(text)) {
      return text.join('\n\n')
    }
    return typeof text === 'string' ? text : String(text || '')
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error('Failed to extract text from PDF')
  }
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabaseAuth = await createClient()
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const propertyId = formData.get('propertyId') as string
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    // Check file type - PDF, TXT, MD supported
    const allowedTypes = ['text/plain', 'text/markdown', 'application/pdf']
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    const isTxt = file.type === 'text/plain' || file.name.endsWith('.txt')
    const isMd = file.type === 'text/markdown' || file.name.endsWith('.md')
    
    if (!isPdf && !isTxt && !isMd) {
      return NextResponse.json({ 
        error: 'Invalid file type. Supported: PDF, TXT, MD' 
      }, { status: 400 })
    }

    // Check file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 10MB' 
      }, { status: 400 })
    }

    // Extract text content based on file type
    let textContent: string
    
    if (isPdf) {
      const arrayBuffer = await file.arrayBuffer()
      textContent = await extractPdfText(arrayBuffer)
    } else {
      textContent = await file.text()
    }

    if (!textContent || textContent.trim().length < 50) {
      return NextResponse.json({ 
        error: 'Could not extract enough text from file' 
      }, { status: 400 })
    }

    // Clean up text
    textContent = textContent
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .trim()

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const supabase = createServiceClient()

    // Chunk the text
    const chunks = chunkText(textContent)

    if (chunks.length === 0) {
      return NextResponse.json({ 
        error: 'Could not create text chunks from file' 
      }, { status: 400 })
    }

    // Generate embeddings in batches (OpenAI allows up to 2048 inputs)
    const BATCH_SIZE = 100
    const allEmbeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })
      allEmbeddings.push(...embeddingResponse.data.map(e => e.embedding))
    }

    // Prepare documents for insertion
    const documentTitle = title || file.name.replace(/\.[^/.]+$/, '')
    const payload = chunks.map((chunk, idx) => ({
      content: chunk,
      metadata: { 
        title: documentTitle,
        source: file.name,
        chunk_index: idx,
        total_chunks: chunks.length,
        uploaded_by: user.id,
        uploaded_at: new Date().toISOString(),
      },
      property_id: propertyId,
      embedding: allEmbeddings[idx],
    }))

    // Insert into database
    const { error: insertError } = await supabase.from('documents').insert(payload)
    
    if (insertError) {
      console.error('Document insert error:', insertError)
      return NextResponse.json({ error: 'Failed to store document' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      filename: file.name,
      title: documentTitle,
      chunks: chunks.length,
      characters: textContent.length,
    })
  } catch (error) {
    console.error('Document upload error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status: 500 })
  }
}

