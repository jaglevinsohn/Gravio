from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import Dict, Any
import stripe
import os
import logging
from db.database import get_db
from db.models import UserSubscription

router = APIRouter()
logger = logging.getLogger(__name__)

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "sk_test_placeholder")
webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "whsec_placeholder")
price_id = os.environ.get("STRIPE_PRICE_ID", "price_placeholder")
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")

@router.post("/create-checkout-session")
async def create_checkout_session(payload: Dict[str, str], db: Session = Depends(get_db)):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
        
    try:
        # Check if user already has a customer ID
        sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
        customer_id = sub.stripe_customer_id if sub else None

        if not customer_id:
            customer = stripe.Customer.create(metadata={"firebase_uid": user_id})
            customer_id = customer.id
            if not sub:
                sub = UserSubscription(user_id=user_id, stripe_customer_id=customer_id)
                db.add(sub)
            else:
                sub.stripe_customer_id = customer_id
            db.commit()

        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            subscription_data={
                'trial_period_days': 7,
            },
            success_url=f"{frontend_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/dashboard",
            client_reference_id=user_id,
        )

        return {"url": checkout_session.url}
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error("Invalid stripe signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = getattr(session, 'client_reference_id', None)
        subscription_id = getattr(session, 'subscription', None)
        
        if user_id and subscription_id:
            sub = db.query(UserSubscription).filter(UserSubscription.user_id == user_id).first()
            if sub:
                sub.stripe_subscription_id = subscription_id
                sub.status = "active"
                db.commit()

    elif event['type'] in ['customer.subscription.updated', 'customer.subscription.deleted']:
        subscription = event['data']['object']
        sub_id = getattr(subscription, 'id', None)
        status = getattr(subscription, 'status', None)
        
        sub = db.query(UserSubscription).filter(UserSubscription.stripe_subscription_id == sub_id).first()
        if sub:
            sub.status = status
            db.commit()

    return {"status": "success"}
