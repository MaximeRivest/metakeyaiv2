import sys
import json

# Read all input from stdin
input_text = sys.stdin.read()

# Transform the text to lowercase
output_text = input_text.lower()

# Wrap the output in the expected JSON structure and print to stdout
result = {"output": output_text}
print(json.dumps(result)) 