import random
import json
import time
import base64
import hmac
import hashlib
from datetime import datetime
from typing import List, Dict, Any
import httpx
from app.models import LocalTransaction
from app.config import settings


def _base_price_for(symbol: str) -> float:
    # simple base prices for demo
    base = {
        "BTCUSD": 60000.0,
        "ETHUSD": 4000.0,
        "SOLUSD": 150.0,
    }
    return base.get(symbol.upper(), 1.0)


async def get_price(symbol: str) -> dict:
    """Return a market price for the given symbol.

    If Gemini public API is reachable, use it; otherwise fall back to demo random price.
    """
    symbol_norm = symbol.upper()
    # try Gemini public ticker
    try:
        base_url = settings.gemini_base_url.rstrip('/')
        # public endpoint expects lowercase symbol (e.g., btcusd)
        sym = symbol_norm.lower()
        url = f"{base_url}/v1/pubticker/{sym}"
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(url)
            if r.status_code == 200:
                j = r.json()
                # many Gemini pubticker responses include 'last' as string
                price = float(j.get('last') or j.get('last_price') or j.get('close') or 0)
                return {"symbol": symbol_norm, "price": round(price, 2), "ts": datetime.utcnow().isoformat()}
    except Exception:
        pass

    # fallback demo price
    base = _base_price_for(symbol)
    price = round(base * (1 + random.uniform(-0.03, 0.03)), 2)
    return {"symbol": symbol_norm, "price": price, "ts": datetime.utcnow().isoformat()}


async def simulate_trade(user, side: str, amount_usd: float, symbol: str, session=None) -> dict:
    """Simulate a trade: for demo, reduce/add USD balance by amount_usd and return executed price info.

    side: 'buy' reduces USD balance (creates negative LocalTransaction), 'sell' increases USD balance.
    """
    info = await get_price(symbol)
    executed_price = info["price"]
    # amount_usd is the USD value to buy/sell
    qty = round(amount_usd / executed_price, 8) if executed_price else 0
    # If real Gemini credentials + execute flag are configured, attempt a real order
    try:
        api_key = settings.gemini_api_key
        api_secret = settings.gemini_api_secret
        execute_real = bool(settings.gemini_execute_trades)
    except Exception:
        api_key = api_secret = None
        execute_real = False

    symbol_norm = symbol.upper()
    if api_key and api_secret and execute_real:
        # place a limit order at current price using Gemini v1 private endpoint
        try:
            base_url = settings.gemini_base_url.rstrip('/')
            sym = symbol_norm.lower()
            # compute amount in base currency
            qty = round(amount_usd / executed_price, 8) if executed_price else 0
            payload = {
                "request": "/v1/order/new",
                "nonce": str(int(time.time() * 1000)),
                "symbol": sym,
                "amount": str(qty),
                "price": str(executed_price),
                "side": side.lower(),
                "type": "exchange limit"
            }
            raw = json.dumps(payload)
            b64 = base64.b64encode(raw.encode())
            signature = hmac.new(api_secret.encode(), b64, hashlib.sha384).hexdigest()
            headers = {
                'X-GEMINI-APIKEY': api_key,
                'X-GEMINI-PAYLOAD': b64.decode(),
                'X-GEMINI-SIGNATURE': signature
            }
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(f"{base_url}/v1/order/new", headers=headers)
                if r.status_code in (200, 201):
                    j = r.json()
                    # record a LocalTransaction for USD effect if session provided
                    if session is not None:
                        try:
                            usd_delta = -amount_usd if side.lower() == 'buy' else amount_usd
                            tx = LocalTransaction(created_at=datetime.utcnow(), amount=usd_delta, description=f"gemini {side} {symbol} ${amount_usd}")
                            session.add(tx)
                            await session.flush()
                        except Exception:
                            pass
                    return {"executed": True, "api_response": j}
                else:
                    return {"executed": False, "error": r.text, "status_code": r.status_code}
        except Exception as e:
            return {"executed": False, "error": str(e)}

    # fallback demo behavior: create LocalTransaction to reflect USD delta
    if session is not None:
        try:
            usd_delta = -amount_usd if side.lower() == 'buy' else amount_usd
            tx = LocalTransaction(created_at=datetime.utcnow(), amount=usd_delta, description=f"demo {side} {symbol} ${amount_usd}")
            session.add(tx)
            await session.flush()
        except Exception:
            pass

    return {"symbol": symbol_norm, "side": side.lower(), "amount_usd": amount_usd, "executed_price": executed_price, "qty": qty, "ts": datetime.utcnow().isoformat(), "simulated": True}


async def generate_recommendations(user_summary: Dict[str, Any]) -> Dict[str, Any]:
    """Generate heuristic recommendations based on the provided user summary.

    user_summary expected keys (all optional but some recommended):
      - total_usd: float  (cash + liquid)
      - monthly_income: float
      - monthly_expenses: float
      - transactions: list of {amount, description, created_at}
      - risk_profile: 'conservative'|'balanced'|'aggressive'

    Returns a structured dict with recommendations and rationale.
    """
    total = float(user_summary.get('total_usd') or 0.0)
    income = float(user_summary.get('monthly_income') or 0.0)
    expenses = float(user_summary.get('monthly_expenses') or 0.0)
    txs: List[Dict[str, Any]] = user_summary.get('transactions') or []
    risk = (user_summary.get('risk_profile') or 'balanced').lower()

    # Basic safety checks
    emergency_months = 3
    emergency_target = expenses * emergency_months if expenses > 0 else income * emergency_months if income>0 else 1000

    recommendations: List[Dict[str, Any]] = []
    rationale: List[str] = []

    # Sugerencia de fondo de emergencia
    if total < emergency_target:
        need = emergency_target - total
        recommendations.append({
            'type': 'save',
            'amount': round(need,2),
            'rationale': f'Construir un fondo de emergencia para cubrir ~{emergency_months} meses de gastos (${emergency_target:.2f}).'
        })
        rationale.append(f'El efectivo actual ${total:.2f} está por debajo del objetivo de emergencia ${emergency_target:.2f}.')
    else:
        # surplus available for investing
        surplus = total - emergency_target
        if surplus > 50:
            # allocation by risk
            if risk == 'conservative':
                alloc = {'bonds_pct':0.6,'equities_pct':0.3,'crypto_pct':0.1}
            elif risk == 'aggressive':
                alloc = {'bonds_pct':0.2,'equities_pct':0.3,'crypto_pct':0.5}
            else:
                alloc = {'bonds_pct':0.4,'equities_pct':0.4,'crypto_pct':0.2}

            # recommend target instruments
            equities_amount = round(surplus * alloc['equities_pct'],2)
            bonds_amount = round(surplus * alloc['bonds_pct'],2)
            crypto_amount = round(surplus * alloc['crypto_pct'],2)

            if equities_amount>0:
                recommendations.append({'type':'invest','instrument':'SPY (ETF)','amount':equities_amount,'rationale':'Exposición diversificada a renta variable mediante un ETF de bajo coste.'})
            if bonds_amount>0:
                recommendations.append({'type':'invest','instrument':'BND (ETF bonos)','amount':bonds_amount,'rationale':'Estabilidad mediante un ETF de renta fija amplia.'})
            if crypto_amount>0:
                # split crypto recommendation
                btc = round(crypto_amount*0.6,2)
                eth = round(crypto_amount*0.4,2)
                if btc>0:
                    recommendations.append({'type':'invest','instrument':'BTC','amount':btc,'rationale':'Exposición a activo de reserva a largo plazo.'})
                if eth>0:
                    recommendations.append({'type':'invest','instrument':'ETH','amount':eth,'rationale':'Exposición a plataformas de contratos inteligentes.'})

            rationale.append(f'Superávit ${surplus:.2f} asignado según perfil de riesgo "{risk}" entre renta variable/renta fija/cripto.')

    # Look for recurring income in transactions
    recurring = any(str(tx.get('description','')).lower().find('payroll')>=0 or str(tx.get('description','')).lower().find('salary')>=0 for tx in txs)
    if recurring:
        rationale.append('Detectadas entradas recurrentes de nómina — considere automatizar ahorros en cada salario.')
        recommendations.append({'type':'automation','action':'auto-save','amount':'10% de la nómina','rationale':'Mover automáticamente un porcentaje fijo de cada nómina a inversiones/ahorros.'})

    # If many small expenses, recommend budgeting
    small_expenses = sum(1 for tx in txs if tx.get('amount') and abs(tx.get('amount'))<20)
    if small_expenses > 10:
        recommendations.append({'type':'advice','advice':'Reducir gastos pequeños diarios','rationale':'Se encontraron muchas transacciones pequeñas; recortarlas puede aumentar el ahorro.'})

    # Add market-aware suggestion: check BTC/ETH prices (demo) to provide context
    try:
        prices = {}
        for s in ('BTCUSD','ETHUSD'):
            p = await get_price(s)
            prices[s] = p['price']
        market_note = f"Precios de mercado (demo): BTC ${prices['BTCUSD']}, ETH ${prices['ETHUSD']}"
        rationale.append(market_note)
    except Exception:
        pass

    score = 100
    if total < emergency_target: score = 40
    elif total < emergency_target*2: score = 70

    # Build a human-friendly narrative in Spanish with an advisor tone
    name = user_summary.get('user_first_name') or ''
    account_id = user_summary.get('account_id') or ''
    # gastos hormiga: pequeñas transacciones
    small_count = small_expenses
    small_sum = round(sum(abs(tx.get('amount') or 0) for tx in txs if tx.get('amount') and abs(tx.get('amount'))<20),2)

    salutation = f"Hola {name}, " if name else "Hola, "
    balance_line = f"Actualmente tienes ${total:.2f} en tu cuenta principal{(' (id: '+account_id+')' if account_id else '')}."
    hormiga_line = small_count > 0 and f"He detectado {small_count} gastos pequeños ('gastos hormiga') que suman aproximadamente ${small_sum:.2f}. Reducir estos puede aumentar tu ahorro mensual." or "No se han detectado muchos gastos pequeños recientes."

    narrative_lines = [
        salutation + "soy tu asesor financiero automatizado. Aquí tienes un resumen y recomendaciones prácticas:",
        balance_line,
        hormiga_line,
        "",
        "Opciones de inversión sugeridas:",
    ]

    # Add investment lines similar to recommendations above
    for rec in recommendations:
        if rec.get('type') == 'invest':
            instrument = rec.get('instrument')
            amt = rec.get('amount')
            rationale_text = rec.get('rationale','')
            narrative_lines.append(f"- INVERTIR en {instrument}: ${amt} — {rationale_text}")
    # automation/ saving suggestions
    for rec in recommendations:
        if rec.get('type') == 'save' or rec.get('type') == 'automation':
            if rec.get('type') == 'save':
                narrative_lines.append(f"- AHORRAR: ${rec.get('amount')} — {rec.get('rationale')}")
            else:
                narrative_lines.append(f"- {rec.get('rationale')} ({rec.get('amount')})")

    narrative_lines.append("")
    narrative_lines.append("Si quieres, puedo aplicar una de estas recomendaciones de forma simulada para que veas el efecto en tu saldo.")

    narrative = "\n".join([ln for ln in narrative_lines if ln])

    return {
        'summary':{'total_usd':total,'monthly_income':income,'monthly_expenses':expenses,'risk_profile':risk},
        'recommendations':recommendations,
        'rationale':rationale,
        'score':score,
        'narrative': narrative
    }
