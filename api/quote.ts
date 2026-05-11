import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchQuotes } from './_lib/yahoo'

const MAX_SYMBOLS = 20

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = req.query['symbols']
  if (!raw || typeof raw !== 'string') {
    return res.status(400).json({ error: 'symbols query parameter required' })
  }

  const symbols = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (symbols.length === 0) {
    return res.status(400).json({ error: 'No valid symbols provided' })
  }
  if (symbols.length > MAX_SYMBOLS) {
    return res.status(400).json({ error: `Maximum ${MAX_SYMBOLS} symbols per request` })
  }

  try {
    const data = await fetchQuotes(symbols)

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(data)
  } catch (err) {
    console.error('[api/quote] error:', err)
    return res.status(500).json({ error: 'Failed to fetch quotes' })
  }
}
