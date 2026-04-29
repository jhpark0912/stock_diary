// Supabase 데이터베이스 타입 정의 (design.md 4.1)

export type Market = 'US' | 'KR'
export type Currency = 'KRW' | 'USD'
export type TradeType = 'buy' | 'sell'
export type CategoryType = 'buy' | 'sell' | 'both'

export interface Stock {
  id: string
  user_id: string
  ticker: string
  stock_name: string
  market: Market
  created_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  is_default: boolean
  sort_order: number
}

export interface Trade {
  id: string
  user_id: string
  stock_id: string
  trade_date: string
  trade_type: TradeType
  quantity: number
  price: number
  currency: Currency
  category_id: string | null
  memo: string | null
  created_at: string
}

// Supabase generic DB type (supabase-js v2 제네릭 구조)
export interface Database {
  public: {
    Tables: {
      stocks: {
        Row: Stock
        Insert: Omit<Stock, 'id' | 'created_at'>
        Update: Partial<Omit<Stock, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
      categories: {
        Row: Category
        Insert: Omit<Category, 'id'>
        Update: Partial<Omit<Category, 'id' | 'user_id'>>
        Relationships: []
      }
      trades: {
        Row: Trade
        Insert: Omit<Trade, 'id' | 'created_at'>
        Update: Partial<Omit<Trade, 'id' | 'user_id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// 조인 포함 타입 (컴포넌트에서 사용)
export interface TradeWithStock extends Trade {
  stocks: Pick<Stock, 'ticker' | 'stock_name' | 'market'>
  categories: Pick<Category, 'name' | 'type'> | null
}
