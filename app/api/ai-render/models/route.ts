import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) return NextResponse.json({ error: 'no key' })
  
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=100`)
    const data = await res.json()
    const imageModels = (data.models || [])
      .filter((m: any) => {
        const name = (m.name || '').toLowerCase()
        return name.includes('image') || name.includes('flash') || name.includes('pro')
      })
      .map((m: any) => ({
        name: m.name,
        displayName: m.displayName,
        methods: m.supportedGenerationMethods,
      }))
    return NextResponse.json({ total: data.models?.length || 0, imageModels })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
