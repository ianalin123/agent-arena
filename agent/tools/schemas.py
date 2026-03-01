"""Shared tool definitions for the agent's native tool use API.

Defines tools in a provider-agnostic format and provides converters
for Anthropic, OpenAI, and Gemini tool calling APIs.
"""

from typing import Any

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "browser_task",
        "description": (
            "Execute a high-level browser task. Describe WHAT you want to accomplish "
            "in natural language (e.g. 'Go to twitter.com and post a tweet about AI agents'). "
            "The browser automation system handles all clicking, typing, and navigation."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "description": "Natural language description of the browser task to perform",
                },
            },
            "required": ["task"],
        },
    },
    {
        "name": "send_email",
        "description": "Send an email from the agent's email address.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Recipient email address",
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line",
                },
                "body": {
                    "type": "string",
                    "description": "Email body content",
                },
            },
            "required": ["to", "subject", "body"],
        },
    },
    {
        "name": "send_usdc",
        "description": (
            "Send USDC from the agent's wallet to a Base wallet address. "
            "Use this to pay for services, tip people, or transfer funds on-chain."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "to_address": {
                    "type": "string",
                    "description": "Recipient wallet address on Base (0x...)",
                },
                "amount": {
                    "type": "number",
                    "description": "Amount of USDC to send",
                },
                "memo": {
                    "type": "string",
                    "description": "Description of what this payment is for",
                },
            },
            "required": ["to_address", "amount", "memo"],
        },
    },
    {
        "name": "send_usdc_email",
        "description": (
            "Send USDC to someone via their email address. Funds are held in escrow "
            "until the recipient claims them — no wallet needed on their end."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "email": {
                    "type": "string",
                    "description": "Recipient email address",
                },
                "amount": {
                    "type": "number",
                    "description": "Amount of USDC to send",
                },
                "memo": {
                    "type": "string",
                    "description": "Description of what this payment is for",
                },
            },
            "required": ["email", "amount", "memo"],
        },
    },
    {
        "name": "finish_reasoning",
        "description": (
            "Use this when you need to think through your strategy without taking an action, "
            "or when you've determined the goal is complete."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "reasoning": {
                    "type": "string",
                    "description": "Your detailed reasoning about the current situation and strategy",
                },
                "should_stop": {
                    "type": "boolean",
                    "description": "Set to true if you believe the goal has been achieved",
                },
            },
            "required": ["reasoning"],
        },
    },
]


def to_anthropic_tools() -> list[dict[str, Any]]:
    """Convert to Anthropic tool format for messages.create(tools=...)."""
    return [
        {
            "name": schema["name"],
            "description": schema["description"],
            "input_schema": schema["parameters"],
        }
        for schema in TOOL_SCHEMAS
    ]


def to_openai_tools() -> list[dict[str, Any]]:
    """Convert to OpenAI tool format for chat.completions.create(tools=...)."""
    return [
        {
            "type": "function",
            "function": {
                "name": schema["name"],
                "description": schema["description"],
                "parameters": schema["parameters"],
            },
        }
        for schema in TOOL_SCHEMAS
    ]


def to_gemini_tools() -> list[Any]:
    """Convert to Gemini tool format for generate_content(tools=...)."""
    try:
        from google.generativeai.types import FunctionDeclaration, Tool
    except ImportError:
        return []

    declarations = []
    for schema in TOOL_SCHEMAS:
        declarations.append(
            FunctionDeclaration(
                name=schema["name"],
                description=schema["description"],
                parameters=schema["parameters"],
            )
        )
    return [Tool(function_declarations=declarations)]
