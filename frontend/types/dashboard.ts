export interface Event {
  _id: string;
  text: string;
  createdAt: string;
  channel?: 'instagram' | 'facebook' | 'mercadolibre';
  type?: 'sale' | 'conversation';
}

export interface KPI {
  queries: number;
  queriesDiff: string;
  conversations: number;
  conversationsDiff: string;
  products: number;
  productsDiff: string;
  sales: number;
  salesDiff: string;
  income: number;
  incomeDiff: string;
  salesBreakdown: {
    instagram: number;
    facebook: number;
    mercadolibre: number;
    shopify: number;
  };
  responseRate: number;
}

export interface ChartData {
  dailyQueries: { date: string; dayName: string; consultas: number }[];
  channelDistribution: { name: string; value: number; queries: number }[];
  topProducts: { name: string; queriesCount: number; price: number; image: string }[];
}
