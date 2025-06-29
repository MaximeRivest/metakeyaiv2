import sys
import json

# Read all input from stdin
input_text = sys.stdin.read()

# Transform the text to uppercase
output_text = input_text.upper()

# Wrap the output in the expected JSON structure and print to stdout
result = {"output": output_text}
print(json.dumps(result)) 