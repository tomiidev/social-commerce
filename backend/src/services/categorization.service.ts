import { GeminiService } from './gemini.service';
import { BillingTransaction } from '../models/BillingTransaction';

export class CategorizationService {
  private static categories = [
    'Envío',
    'Comisión Plataforma',
    'Publicidad',
    'Devolución',
    'Impuestos',
    'Otros'
  ];

  static async categorizeTransaction(transactionId: string): Promise<string> {
    const transaction = await BillingTransaction.findById(transactionId);
    if (!transaction) throw new Error('Transaction not found');

    const modelName = 'gemini-3.1-flash-lite';
    
    // Use Gemini for classification
    const prompt = `Clasifica la siguiente transacción de facturación en una de estas categorías: ${this.categories.join(', ')}.
    Descripción: "${transaction.description}"
    Responde SOLO con el nombre de la categoría, sin explicaciones.`;

    // Assuming existing GeminiService structure, might need adjustment if it doesn't support generic prompts
    // For now, using a direct call pattern
    const category = await GeminiService.classifyTransaction(transaction.storeId.toString(), prompt);
    
    transaction.category = category;
    await transaction.save();
    
    return category;
  }
}
