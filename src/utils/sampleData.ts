import { ImpactReport } from '../types';

export interface SampleRepo {
  id: string;
  name: string;
  description: string;
  language: string;
  files: Record<string, string>;
}

export interface SampleDiff {
  id: string;
  title: string;
  category: string;
  description: string;
  diff: string;
}

export const SAMPLE_REPOSITORIES: SampleRepo[] = [
  {
    id: 'repo-ecommerce-python',
    name: 'ecommerce-core (Python / FastAPI)',
    description: 'Order processing, user cart calculation, tax engine, and payment gateways',
    language: 'Python',
    files: {
      'services/user_service.py': `class UserService:
    def __init__(self, db_client=None):
        self.db = db_client

    def calculate_total(self, items, tax_rate=0.08, currency='USD'):
        """Calculate order subtotal with progressive tax and currency conversion."""
        subtotal = sum(item.price * getattr(item, 'quantity', 1) for item in items)
        tax = subtotal * tax_rate
        return round(subtotal + tax, 2)

    def get_user_profile(self, user_id: str):
        return {"id": user_id, "tier": "gold"}
`,
      'services/checkout.py': `from services.user_service import UserService
from services.payment_gateway import StripePaymentProcessor

class CheckoutService:
    def __init__(self):
        self.user_service = UserService()
        self.payment = StripePaymentProcessor()

    def process_order(self, cart_id: str, cart):
        """Processes customer checkout, calculates final total, and charges credit card."""
        total_amount = self.user_service.calculate_total(cart.items)
        charge_result = self.payment.charge(cart.customer_id, total_amount)
        return {
            "status": "success" if charge_result.success else "failed",
            "order_total": total_amount,
            "transaction_id": charge_result.tx_id
        }
`,
      'api/order_controller.py': `from fastapi import APIRouter, HTTPException, Depends
from services.checkout import CheckoutService
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/api/v1/orders")

class CartItem(BaseModel):
    item_id: str
    price: float
    quantity: int = 1

class CheckoutRequest(BaseModel):
    customer_id: str
    items: List[CartItem]

@router.post("/checkout")
def execute_checkout(payload: CheckoutRequest):
    """Public customer checkout endpoint."""
    checkout_svc = CheckoutService()
    try:
        result = checkout_svc.process_order("cart_default", payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
`,
      'services/payment_gateway.py': `class ChargeResult:
    def __init__(self, success: bool, tx_id: str):
        self.success = success
        self.tx_id = tx_id

class StripePaymentProcessor:
    def charge(self, customer_id: str, amount: float):
        if amount <= 0:
            raise ValueError("Charge amount must be positive.")
        return ChargeResult(True, f"ch_{customer_id}_99182")
`,
      'tests/test_checkout.py': `import pytest
from services.user_service import UserService
from services.checkout import CheckoutService

def test_calculate_total_basic():
    svc = UserService()
    class MockItem:
        price = 100.0
        quantity = 2
    total = svc.calculate_total([MockItem()])
    # Expects 100 * 2 = 200 + 8% tax = 216.0
    assert total == 216.0

def test_process_order_integration():
    checkout = CheckoutService()
    class CartMock:
        customer_id = "cust_123"
        class MockItem:
            price = 50.0
        items = [MockItem()]
    res = checkout.process_order("cart_1", CartMock())
    assert res["status"] == "success"
    assert res["order_total"] == 54.0
`,
      'docs/API_DOCUMENTATION.md': `# Checkout and Order API
The checkout endpoint \`POST /api/v1/orders/checkout\` invokes \`calculate_total()\`
to compute total billed currency. The returned order_total reflects the current sales tax.
`,
      'utils/logger.py': `import logging
logger = logging.getLogger("ecommerce")
def log_event(name: str, payload: dict):
    logger.info(f"Event {name}: {payload}")
`
    }
  },
  {
    id: 'repo-auth-typescript',
    name: 'auth-gateway (TypeScript / Express)',
    description: 'OAuth2 session management, JWT tokens, Redis cache, and RBAC middleware',
    language: 'TypeScript',
    files: {
      'src/tokens/tokenService.ts': `import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'dev_secret_key';

export interface TokenPayload {
  userId: string;
  role: string;
  orgId: string;
  exp?: number;
}

export function generateToken(payload: TokenPayload, expirySeconds: number = 3600): string {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: expirySeconds });
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
  return decoded;
}
`,
      'src/middleware/authMiddleware.ts': `import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../tokens/tokenService';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Bearer token' });
  }
  const token = authHeader.substring(7);
  try {
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
`,
      'src/controllers/userController.ts': `import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';

export const userRouter = Router();

userRouter.get('/api/users/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ id: user.userId, role: user.role, org: user.orgId });
});
`,
      'test/tokenService.test.ts': `import { generateToken, verifyToken } from '../src/tokens/tokenService';

describe('Token Service', () => {
  it('should generate and verify valid token', () => {
    const token = generateToken({ userId: 'u_1', role: 'admin', orgId: 'org_1' });
    const payload = verifyToken(token);
    expect(payload.userId).toBe('u_1');
  });
});
`
    }
  }
];

export const SAMPLE_DIFFS: SampleDiff[] = [
  {
    id: 'diff-breaking-signature',
    title: 'Breaking Signature & Calculation Logic in calculate_total()',
    category: 'Core Logic & Breaking Change',
    description: 'Adds mandatory currency parameter, alters rounding formula and adds discount multiplier.',
    diff: `diff --git a/services/user_service.py b/services/user_service.py
index a41bc82..98f21e0 100644
--- a/services/user_service.py
+++ b/services/user_service.py
@@ -4,6 +4,9 @@ class UserService:
     def __init__(self, db_client=None):
         self.db = db_client

-    def calculate_total(self, items, tax_rate=0.08, currency='USD'):
+    def calculate_total(self, items, currency: str, tax_rate=0.08, discount_code=None):
         """Calculate order subtotal with progressive tax and currency conversion."""
-        subtotal = sum(item.price * getattr(item, 'quantity', 1) for item in items)
+        multiplier = 0.90 if discount_code == "VIP10" else 1.0
+        subtotal = sum(item.price * getattr(item, 'quantity', 1) for item in items) * multiplier
+        if currency not in ['USD', 'EUR', 'GBP']:
+            raise ValueError(f"Unsupported billing currency: {currency}")
         tax = subtotal * tax_rate
         return round(subtotal + tax, 2)
`
  },
  {
    id: 'diff-token-algorithm',
    title: 'JWT Token Security Algorithm Hardening & Claim Validation',
    category: 'Security & Auth',
    description: 'Enforces RS256 asymmetric signing, adds mandatory tenant validation, and modifies token payload interface.',
    diff: `diff --git a/src/tokens/tokenService.ts b/src/tokens/tokenService.ts
index b73e911..4f83dc2 100644
--- a/src/tokens/tokenService.ts
+++ b/src/tokens/tokenService.ts
@@ -8,3 +8,6 @@ export interface TokenPayload {
   userId: string;
   role: string;
   orgId: string;
+  tenantId: string;
+  deviceFingerprint: string;
   exp?: number;
 }

@@ -16,4 +19,7 @@ export function verifyToken(token: string): TokenPayload {
-  const decoded = jwt.verify(token, SECRET_KEY) as TokenPayload;
+  const decoded = jwt.verify(token, SECRET_KEY, {
+    algorithms: ['RS256']
+  }) as TokenPayload;
+  if (!decoded.tenantId) throw new Error("Missing required tenant claim");
   return decoded;
 }
`
  },
  {
    id: 'diff-api-route-deprecation',
    title: 'FastAPI Checkout Route Rewrite & Deprecation Notice',
    category: 'API & Documentation',
    description: 'Changes POST /checkout response payload structure from flat status to nested order object.',
    diff: `diff --git a/api/order_controller.py b/api/order_controller.py
index c54218a..d92a17f 100644
--- a/api/order_controller.py
+++ b/api/order_controller.py
@@ -19,4 +19,8 @@ def execute_checkout(payload: CheckoutRequest):
     checkout_svc = CheckoutService()
     try:
-        result = checkout_svc.process_order("cart_default", payload)
-        return result
+        raw_res = checkout_svc.process_order("cart_default", payload)
+        return {
+            "data": {
+                "order": raw_res,
+                "processed_by_cluster": "us-east-prod-1"
+            }
+        }
     except Exception as e:
`
  },
  {
    id: 'diff-isolated-helper',
    title: 'Isolated Helper Optimization (Zero Blast Radius Test)',
    category: 'Grounding / Zero-Impact Test',
    description: 'Updates logger formatting in utils/logger.py. Verified: zero callers or tests affected downstream.',
    diff: `diff --git a/utils/logger.py b/utils/logger.py
index e82910a..f1082c3 100644
--- a/utils/logger.py
+++ b/utils/logger.py
@@ -2,3 +2,3 @@ import logging
 logger = logging.getLogger("ecommerce")
 def log_event(name: str, payload: dict):
-    logger.info(f"Event {name}: {payload}")
+    logger.info(f"[AUDIT] Event {name} at timestamp: {payload}")
`
  }
];

export const INITIAL_PRECOMPUTED_REPORTS: Record<string, ImpactReport> = {
  'diff-breaking-signature': {
    id: 'ANL-98124',
    repository_name: 'ecommerce-core (Python / FastAPI)',
    analyzed_at: '2026-09-30 12:45:00 UTC',
    model_used: 'gemini-3.8-flash',
    summary:
      'High blast-radius change: calculate_total() introduces a mandatory `currency` positional argument without default value, immediately breaking downstream caller `CheckoutService.process_order()` and causing failures across unit tests and public `/checkout` API.',
    changed_files: ['services/user_service.py'],
    affected_components: [
      {
        file: 'services/checkout.py',
        component: 'CheckoutService.process_order()',
        component_type: 'method',
        impact_level: 'HIGH',
        reason: 'Direct caller: invokes user_service.calculate_total(cart.items) without passing required currency parameter.',
        evidence: `def process_order(self, cart_id: str, cart):
    total_amount = self.user_service.calculate_total(cart.items)
    charge_result = self.payment.charge(cart.customer_id, total_amount)`,
        line_range: '10-18',
        dependency_type: 'Direct Caller',
        is_grounded: true
      },
      {
        file: 'api/order_controller.py',
        component: 'execute_checkout()',
        component_type: 'api_route',
        impact_level: 'HIGH',
        reason: 'Indirect caller: delegates payload to CheckoutService.process_order() which will throw TypeError.',
        evidence: `@router.post("/checkout")
def execute_checkout(payload: CheckoutRequest):
    checkout_svc = CheckoutService()
    result = checkout_svc.process_order("cart_default", payload)`,
        line_range: '18-28',
        dependency_type: 'Caller Chain',
        is_grounded: true
      },
      {
        file: 'tests/test_checkout.py',
        component: 'test_calculate_total_basic()',
        component_type: 'test',
        impact_level: 'HIGH',
        reason: 'Direct test invocation: calls svc.calculate_total([MockItem()]) without currency parameter, will fail with TypeError.',
        evidence: `def test_calculate_total_basic():
    svc = UserService()
    total = svc.calculate_total([MockItem()])
    assert total == 216.0`,
        line_range: '5-12',
        dependency_type: 'Unit Test Coverage',
        is_grounded: true
      },
      {
        file: 'tests/test_checkout.py',
        component: 'test_process_order_integration()',
        component_type: 'test',
        impact_level: 'HIGH',
        reason: 'Integration test: invokes CheckoutService.process_order which fails downstream.',
        evidence: `def test_process_order_integration():
    checkout = CheckoutService()
    res = checkout.process_order("cart_1", CartMock())`,
        line_range: '14-23',
        dependency_type: 'Integration Test',
        is_grounded: true
      },
      {
        file: 'docs/API_DOCUMENTATION.md',
        component: 'Billing Documentation',
        component_type: 'documentation',
        impact_level: 'LOW',
        reason: 'Documentation mentions calculate_total() without documenting currency requirement.',
        evidence: `The checkout endpoint POST /api/v1/orders/checkout invokes calculate_total()
to compute total billed currency.`,
        line_range: '1-6',
        dependency_type: 'Documentation Reference',
        is_grounded: true
      }
    ],
    api_impact: [
      {
        endpoint: '/api/v1/orders/checkout',
        method: 'POST',
        impact_level: 'HIGH',
        reason: 'Endpoint crashes with unhandled 500 error when customer attempts checkout due to missing argument in service layer.'
      }
    ],
    test_impact: [
      {
        test_file: 'tests/test_checkout.py',
        test_name: 'test_calculate_total_basic',
        reason: 'TypeError: calculate_total() missing 1 required positional argument: currency',
        action_required: 'Update test call with currency="USD" and assert new VIP10 discount branches.'
      },
      {
        test_file: 'tests/test_checkout.py',
        test_name: 'test_process_order_integration',
        reason: 'Fails downstream in CheckoutService invocation.',
        action_required: 'Pass currency parameter in checkout service call.'
      }
    ],
    documentation_impact: [
      {
        doc_file: 'docs/API_DOCUMENTATION.md',
        section: 'Order & Billing Formula',
        reason: 'Outdated parameter list: needs to document currency validation and supported codes (USD, EUR, GBP).'
      }
    ],
    risks: [
      {
        risk: 'Immediate runtime crash in production checkout pipeline.',
        severity: 'HIGH',
        mitigation: 'Provide default parameter value: currency: str = "USD".'
      },
      {
        risk: 'Currency validation raises ValueError for non-whitelisted currencies.',
        severity: 'MEDIUM',
        mitigation: 'Add frontend client validation and graceful HTTP 422 error handling.'
      }
    ],
    recommended_validation: [
      'Provide default argument currency="USD" in calculate_total to preserve backward compatibility.',
      'Run pytest tests/test_checkout.py and verify 100% passing test assertions.',
      'Trigger end-to-end checkout via POST /api/v1/orders/checkout with sample cart payload.',
      'Update docs/API_DOCUMENTATION.md with currency support matrix.'
    ],
    metrics: {
      changed_files: 1,
      affected_files: 4,
      high: 3,
      medium: 1,
      low: 1
    }
  }
};
