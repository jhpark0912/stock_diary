import type { VercelRequest, VercelResponse } from '@vercel/node'
import { fetchQuotes } from './_lib/yahoo'
import { toKQSymbol } from './_lib/ticker'

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
    let data = await fetchQuotes(symbols)

    // .KS 실패 심볼은 .KQ로 재시도 (KOSDAQ 종목 대응)
    const ksSymbols = symbols.filter(s => s.endsWith('.KS') && !data[s])
    if (ksSymbols.length > 0) {
      const kqSymbols = ksSymbols.map(s => toKQSymbol(s.replace('.KS', '')))
      const kqData   = await fetchQuotes(kqSymbols)

      // KQ 결과를 원래 KS 키로 병합 (프론트에서 원래 심볼로 조회 가능하게)
      for (let i = 0; i < ksSymbols.length; i++) {
        const kqResult = kqData[kqSymbols[i]]
        if (kqResult) {
          data[ksSymbols[i]] = { ...kqResult, symbol: ksSymbols[i] }
        }
      }
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json(data)
  } catch (err) {
    console.error('[api/quote] error:', err)
    return res.status(500).json({ error: 'Failed to fetch quotes' })
  }
}
