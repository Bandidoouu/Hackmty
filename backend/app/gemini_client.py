import random
from datetime import datetime
from typing import List, Dict, Any
from app.models import LocalTransaction


def _base_price_for(symbol: str) -> float:
    # simple base prices for demo
    base = {
        "BTCUSD": 60000.0,
        "ETHUSD": 4000.0,
        "SOLUSD": 150.0,
    }
    return base.get(symbol.upper(), 1.0)


async def get_price(symbol: str) -> dict:
    """Return a simulated market price for the given symbol."""
    base = _base_price_for(symbol)
    # small random walk around base
    price = round(base * (1 + random.uniform(-0.03, 0.03)), 2)
    return {"symbol": symbol.upper(), "price": price, "ts": datetime.utcnow().isoformat()}


async def simulate_trade(user, side: str, amount_usd: float, symbol: str, session=None) -> dict:
    """Simulate a trade: for demo, reduce/add USD balance by amount_usd and return executed price info.

    side: 'buy' reduces USD balance (creates negative LocalTransaction), 'sell' increases USD balance.
    """
    info = await get_price(symbol)
    executed_price = info["price"]
    # amount_usd is the USD value to buy/sell
    qty = round(amount_usd / executed_price, 8) if executed_price else 0
    # simulate effect on USD balance via LocalTransaction when session provided
    # For demo we create a LocalTransaction record representing the USD change
    if session is not None:
        try:
            from app.models import LocalTransaction
            # buy => negative USD delta, sell => positive USD delta
            usd_delta = -amount_usd if side.lower() == 'buy' else amount_usd
            tx = LocalTransaction(created_at=datetime.utcnow(), amount=usd_delta, description=f"demo {side} {symbol} ${amount_usd}")
            session.add(tx)
            await session.flush()
        except Exception:
            # non-fatal for demo
            pass

    return {"symbol": symbol.upper(), "side": side.lower(), "amount_usd": amount_usd, "executed_price": executed_price, "qty": qty, "ts": datetime.utcnow().isoformat()}


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

    # Emergency fund suggestion
    if total < emergency_target:
        need = emergency_target - total
        recommendations.append({
            'type': 'save',
            'amount': round(need,2),
            'rationale': f'Build emergency fund to cover ~{emergency_months} months of expenses (${emergency_target:.2f}).'
        })
        rationale.append(f'Current cash ${total:.2f} is below emergency target ${emergency_target:.2f}.')
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
                recommendations.append({'type':'invest','instrument':'SPY (ETF)','amount':equities_amount,'rationale':'Diversified equity exposure via low-cost ETF.'})
            if bonds_amount>0:
                recommendations.append({'type':'invest','instrument':'BND (Bond ETF)','amount':bonds_amount,'rationale':'Stability via broad bond ETF.'})
            if crypto_amount>0:
                # split crypto recommendation
                btc = round(crypto_amount*0.6,2)
                eth = round(crypto_amount*0.4,2)
                if btc>0:
                    recommendations.append({'type':'invest','instrument':'BTC','amount':btc,'rationale':'Long-term store of value exposure.'})
                if eth>0:
                    recommendations.append({'type':'invest','instrument':'ETH','amount':eth,'rationale':'Smart contract platform exposure.'})

            rationale.append(f'Surplus ${surplus:.2f} allocated by risk profile "{risk}" to equities/bonds/crypto.')

    # Look for recurring income in transactions
    recurring = any(str(tx.get('description','')).lower().find('payroll')>=0 or str(tx.get('description','')).lower().find('salary')>=0 for tx in txs)
    if recurring:
        rationale.append('Detected recurring payroll entries — consider automated savings into investments each payday.')
        recommendations.append({'type':'automation','action':'auto-save','amount':'10% of paycheck','rationale':'Automatically move a fixed percent of each paycheck into investments/savings.'})

    # If many small expenses, recommend budgeting
    small_expenses = sum(1 for tx in txs if tx.get('amount') and abs(tx.get('amount'))<20)
    if small_expenses > 10:
        recommendations.append({'type':'advice','advice':'Reduce small daily expenses','rationale':'Found many small transactions; trimming these can increase savings.'})

    # Add market-aware suggestion: check BTC/ETH prices (demo) to provide context
    try:
        prices = {}
        for s in ('BTCUSD','ETHUSD'):
            p = await get_price(s)
            prices[s] = p['price']
        market_note = f"Market prices (demo): BTC ${prices['BTCUSD']}, ETH ${prices['ETHUSD']}"
        rationale.append(market_note)
    except Exception:
        pass

    score = 100
    if total < emergency_target: score = 40
    elif total < emergency_target*2: score = 70

    return {'summary':{'total_usd':total,'monthly_income':income,'monthly_expenses':expenses,'risk_profile':risk}, 'recommendations':recommendations, 'rationale':rationale, 'score':score}
