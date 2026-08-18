// Definición de las 5 preguntas predeterminadas y sus intenciones de consulta
export const PREDEFINED_QUESTIONS = [
  {
    id: 1,
    question: "¿Cuál es el producto más vendido este mes?",
    queryType: 'TOP_SALES'
  },
  {
    id: 2,
    question: "¿Qué productos tienen stock crítico?",
    queryType: 'LOW_STOCK'
  },
  {
    id: 3,
    question: "¿Cuál es la facturación total de esta semana?",
    queryType: 'TOTAL_REVENUE'
  },
  {
    id: 4,
    question: "¿Quién es mi cliente más destacado?",
    queryType: 'TOP_CUSTOMER'
  },
  {
    id: 5,
    question: "¿Cuántas consultas recibí en el último mes?",
    queryType: 'TOTAL_QUERIES'
  }
];
