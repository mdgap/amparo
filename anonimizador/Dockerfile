FROM python:3.12-slim

# O modelo pt do spaCy é o que reconhece nome de pessoa em texto corrido, sem
# depender de rótulo. É a razão de existir deste contêiner.
RUN pip install --no-cache-dir \
      "presidio-analyzer==2.2.359" \
      "spacy==3.8.7" \
      "fastapi==0.118.0" \
      "uvicorn==0.37.0" \
 && python -m spacy download pt_core_news_lg \
 && rm -rf /root/.cache

WORKDIR /app
COPY anonimizador/app.py .

EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=90s --retries=5 \
  CMD python -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
