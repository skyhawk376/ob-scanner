FROM python:3.12-slim
WORKDIR /app
COPY server.py index.html app.js styles.css ./
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["python3", "server.py"]
