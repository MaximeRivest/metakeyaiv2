import sys
import json

input_text = sys.stdin.read()
# Reverse the string
output_text = input_text[::-1]

result = {"output": output_text}
print(json.dumps(result)) 