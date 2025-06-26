#!/usr/bin/env python3
"""
MetaKey AI Spell: Text Summarizer
Implements the stdin/stdout JSON IPC contract defined in spec section 6.2
"""

import json
import sys
import time
import requests
from typing import Dict, Any


def call_ollama(input_text: str, model: str) -> str:
    """Call local Ollama API"""
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": model,
                "prompt": f"Summarize the following text in 2-3 sentences, focusing on key points:\n\n{input_text}",
                "stream": False
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()["response"]
    except Exception as e:
        raise Exception(f"Ollama API error: {str(e)}")


def call_openai(input_text: str, model: str, api_key: str) -> str:
    """Call OpenAI API"""
    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": model,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Summarize the following text in 2-3 sentences, focusing on key points:\n\n{input_text}"
                    }
                ],
                "max_tokens": 150
            },
            timeout=30
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        raise Exception(f"OpenAI API error: {str(e)}")


def main():
    """Main spell execution following MetaKey AI IPC contract"""
    start_time = time.time()
    
    try:
        # Read JSON input from stdin (spec section 6.2)
        input_line = sys.stdin.readline().strip()
        if not input_line:
            raise ValueError("No input received")
        
        request = json.loads(input_line)
        
        # Validate required fields
        input_text = request.get("input", "").strip()
        if not input_text:
            raise ValueError("Empty input text")
        
        model = request.get("model", "llama3.2:1b")
        api_key = request.get("api_key")
        
        # Route to appropriate provider
        if model.startswith("gpt-"):
            if not api_key:
                raise ValueError("OpenAI API key required for GPT models")
            output = call_openai(input_text, model, api_key)
        else:
            # Assume Ollama for local models
            output = call_ollama(input_text, model)
        
        # Calculate execution time
        execution_time = int((time.time() - start_time) * 1000)
        
        # Return success response (spec section 6.2)
        response = {
            "output": output.strip(),
            "metadata": {
                "t": execution_time,
                "model": model,
                "input_length": len(input_text),
                "output_length": len(output)
            }
        }
        
        print(json.dumps(response))
        
    except Exception as e:
        # Return error response (spec section 6.2)
        error_response = {
            "error": str(e),
            "code": 500,
            "details": f"Spell execution failed after {int((time.time() - start_time) * 1000)}ms"
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == "__main__":
    main() 