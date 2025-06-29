import sys
import json

input_text = sys.stdin.read()
output_text = input_text.lower()

result = {"output": output_text}
print(json.dumps(result)) 