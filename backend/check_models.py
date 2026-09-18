import os
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY")

if not api_key:
    print("GROQ_API_KEY is not set.")
    exit()

client = Groq(api_key=api_key)

models = client.models.list()

for model in models.data:
    print(model.id)