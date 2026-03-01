#!/usr/bin/env python3
"""Test Locus USDC functions: balance, history, and optional send.

Usage:
  # Balance + recent transactions only
  python scripts/test_locus.py

  # Also send a small amount to a Base address (use an address you control for testing)
  python scripts/test_locus.py --send 0.01 0xYourBaseAddress "Test from Agent Arena"

  # Send USDC via email (escrow)
  python scripts/test_locus.py --send-email 0.01 your@email.com "Test payment"
"""

import argparse
import asyncio
import os
import sys

# Load agent/.env and make agent modules importable
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
agent_dir = os.path.join(repo_root, "agent")
env_path = os.path.join(agent_dir, ".env")
if os.path.exists(env_path):
    from dotenv import load_dotenv
    load_dotenv(env_path)
sys.path.insert(0, agent_dir)

from tools.payments import PaymentsTool


async def main() -> None:
    parser = argparse.ArgumentParser(description="Test Locus USDC balance and optional send")
    parser.add_argument("--send", nargs=3, metavar=("AMOUNT", "TO_ADDRESS", "MEMO"),
                        help="Send AMOUNT USDC to TO_ADDRESS (Base) with MEMO")
    parser.add_argument("--send-email", nargs=3, metavar=("AMOUNT", "EMAIL", "MEMO"),
                        help="Send AMOUNT USDC to EMAIL via escrow with MEMO")
    args = parser.parse_args()

    payments = PaymentsTool()
    if not payments._available:
        print("ERROR: LOCUS_API_KEY not set in agent/.env")
        sys.exit(1)

    print("Locus USDC test (agent/.env)\n")

    # 1. Balance
    print("1. Balance")
    balance = await payments.get_balance()
    print(f"   Balance: {balance} USDC\n")

    # 2. Transaction history
    print("2. Recent transactions (x402)")
    history = await payments.get_transaction_history(limit=5)
    print(f"   Count: {len(history)}")
    for i, tx in enumerate(history[:5], 1):
        print(f"   - {i}. {tx.get('slug', tx.get('id', '?'))} | {tx.get('amount_usdc', '?')} USDC | {tx.get('status', '?')}")
    print()

    # 3. Optional: send to address
    if args.send:
        amount_str, to_address, memo = args.send
        amount = float(amount_str)
        print(f"3. Sending {amount} USDC to {to_address[:10]}... with memo: {memo[:30]}...")
        result = await payments.send_usdc({
            "to_address": to_address,
            "amount": amount,
            "memo": memo,
        })
        print(f"   Result: {result}\n")
        if result.get("status") in ("error", "policy_rejected"):
            sys.exit(1)

    # 4. Optional: send via email
    if args.send_email:
        amount_str, email, memo = args.send_email
        amount = float(amount_str)
        print(f"4. Sending {amount} USDC to {email} (escrow) with memo: {memo[:30]}...")
        result = await payments.send_usdc_email({
            "email": email,
            "amount": amount,
            "memo": memo,
        })
        print(f"   Result: {result}\n")
        if result.get("status") in ("error", "policy_rejected"):
            sys.exit(1)

    await payments.close()
    print("Done. All USDC functions available.")


if __name__ == "__main__":
    asyncio.run(main())
