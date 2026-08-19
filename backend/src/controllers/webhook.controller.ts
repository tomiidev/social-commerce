/**
 * webhook.controller.ts
 *
 * Handles incoming webhook events from Meta (Instagram & Facebook Messenger).
 *
 * Two handlers:
 *  1. verifyWebhook  — GET  /api/webhook/meta  (Meta challenge/verification)
 *  2. handleWebhook  — POST /api/webhook/meta  (real-time events)
 *
 * When a message event arrives, the handler:
 *  - Identifies the channel (instagram / facebook) from the object field
 *  - Finds the Store by metaPageId or instagramAccountId
 *  - Finds or creates a Customer with the sender's external ID
 *  - Finds or creates a Conversation
 *  - Creates a new Message with sender:'customer'
 *  - Marks the conversation unread and updates lastIncomingMessageTime
 *    (used to enforce the 24h reply window check)
 */

import { Request, Response } from 'express';
import { Store } from '../models/Store';
import { Customer } from '../models/Customer';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { Event } from '../models/Event';
import { verifyWebhookSignature } from '../services/meta.service';

// ---------------------------------------------------------------------------
// GET /api/webhook/meta — Webhook challenge verification
// ---------------------------------------------------------------------------

export const verifyWebhook = async (req: Request, res: Response) => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  if (mode !== 'subscribe') {
    return res.sendStatus(403);
  }

  // Accept both the global env token and per-store tokens
  const globalToken = process.env.META_WEBHOOK_VERIFY_TOKEN || '';

  if (token === globalToken) {
    console.log('[Webhook] Verification successful (global token)');
    return res.status(200).send(challenge);
  }

  // Check if any store has this verify token
  const store = await Store.findOne({ metaWebhookVerifyToken: token });
  if (store) {
    console.log(`[Webhook] Verification successful for store ${store._id}`);
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed — unknown verify token');
  return res.sendStatus(403);
};

// ---------------------------------------------------------------------------
// POST /api/webhook/meta — Incoming events
// ---------------------------------------------------------------------------

export const handleWebhook = async (req: Request, res: Response) => {
  // Always acknowledge immediately — Meta retries if it doesn't receive 200 within 30s
  res.sendStatus(200);

  // Signature verification (only when APP_SECRET is configured)
  const signature = req.headers['x-hub-signature-256'] as string;
  if (process.env.META_APP_SECRET && signature) {
    const rawBody: Buffer = (req as any).rawBody;
    if (rawBody && !verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Webhook] Invalid signature — event discarded');
      return;
    }
  }

  const body = req.body;

  if (body.object !== 'instagram' && body.object !== 'page') {
    return; // Not an event we handle
  }

  const channel: 'instagram' | 'facebook' = body.object === 'instagram' ? 'instagram' : 'facebook';

  for (const entry of body.entry ?? []) {
    const messaging: any[] = entry.messaging ?? entry.messages ?? [];

    for (const event of messaging) {
      // Only handle inbound text messages
      if (!event.message || event.message.is_echo) continue;

      const senderId: string = event.sender?.id;
      const messageText: string = event.message?.text ?? '';
      const pageId: string = entry.id; // The page/IG account that received the message

      if (!senderId || !messageText) continue;

      try {
        // 1. Find the store associated with this page
        const store = await Store.findOne({
          $or: [{ metaPageId: pageId }, { instagramAccountId: pageId }],
        });

        if (!store) {
          console.warn(`[Webhook] No store found for pageId=${pageId}`);
          continue;
        }

        const storeId = store._id;

        // 2. Find or create the Customer
        let customer = await Customer.findOne({
          storeId,
          externalId: senderId,
          channel,
        });

        if (!customer) {
          // Derive a display name from the sender ID (will be updated later if profile info arrives)
          customer = await Customer.create({
            storeId,
            name: `Usuario ${senderId.slice(-6)}`,
            username: senderId,
            avatar: '',
            channel,
            externalId: senderId,
            lastInteraction: new Date(),
          });
          console.log(`[Webhook] Created new customer ${customer._id} for sender ${senderId}`);
        } else {
          customer.lastInteraction = new Date();
          await customer.save();
        }

        // 3. Find or create the Conversation
        let conversation = await Conversation.findOne({
          storeId,
          customerId: customer._id,
          channel,
        });

        if (!conversation) {
          conversation = await Conversation.create({
            storeId,
            customerId: customer._id,
            channel,
            status: 'open',
            unread: true,
            lastMessageText: messageText,
            lastMessageTime: new Date(),
            lastIncomingMessageTime: new Date(),
          });
          console.log(`[Webhook] Created new conversation ${conversation._id}`);
        } else {
          conversation.unread = true;
          conversation.lastMessageText = messageText;
          conversation.lastMessageTime = new Date();
          conversation.lastIncomingMessageTime = new Date();
          await conversation.save();
        }

        // 4. Save the inbound message
        await Message.create({
          conversationId: conversation._id,
          sender: 'customer',
          text: messageText,
          aiSuggested: false,
        });

        // Record event
        await Event.create({
          storeId,
          type: 'question',
          text: `Nuevo mensaje en ${channel}: "${messageText.substring(0, 30)}..."`,
          channel: channel,
        });

        console.log(
          `[Webhook] Saved incoming ${channel} message from ${senderId} → conversation ${conversation._id}`
        );
      } catch (err: any) {
        console.error('[Webhook] Error processing messaging event:', err?.message);
      }
    }
  }
};
