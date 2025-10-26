import asyncio, json
import sys
sys.path.append('.')
from app.gemini_client import generate_recommendations

async def main():
    sample = {
        'total_usd': 5000,
        'monthly_income': 2000,
        'monthly_expenses': 1500,
        'transactions': [
            {'amount': -3.5, 'description': 'Starbucks', 'created_at':'2025-10-01T12:00:00'},
            {'amount': -12.0, 'description': 'Uber', 'created_at':'2025-10-02T08:00:00'},
            {'amount': 2000, 'description': 'Paycheck', 'created_at':'2025-09-30T09:00:00'},
        ],
        'risk_profile': 'moderado',
        'user_first_name': 'Hanna',
        'account_id': 'LOCALACC-TEST'
    }
    res = await generate_recommendations(sample)
    print(json.dumps(res, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    asyncio.run(main())
