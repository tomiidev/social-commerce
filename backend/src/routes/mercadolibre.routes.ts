import { Router } from 'express';
import { protect } from '../middleware/auth';
import * as controller from '../controllers/mercadolibre.controller';
import * as billingAnalysisController from '../controllers/billing-analysis.controller';

const router = Router();

// OAuth flow
router.get('/auth/url', protect, controller.getAuthUrl);
router.get('/auth/callback', controller.handleOAuthCallback);

// Status and management
router.get('/status', protect, controller.getMeliStatus);
router.post('/disconnect', protect, controller.disconnectMeli);

// Questions
router.get('/items/:itemId/questions', protect, controller.getProductQuestions);

// Sales import
router.post('/sales/import', protect, controller.importMeliSales);

// Billing import
router.post('/billing/import', protect, controller.importBilling);
router.delete('/billing/transaction/:id', protect, controller.deleteTransaction);
router.delete('/billing/all', protect, controller.deleteAllTransactions);
router.post('/billing/analyze', protect, billingAnalysisController.analyzeBilling);
router.post('/billing/reconcile', protect, billingAnalysisController.reconcileBilling);

// Customers import
router.post('/customers/import', protect, controller.importMeliCustomers);

// Reports
router.get('/reports', protect, controller.getMeliBillingDocuments);
router.get('/reports/history', protect, controller.getMeliReports);

export default router;
