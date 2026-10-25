FROM denoland/deno:alpine

WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["deno", "run", "--allow-all", "bot/server.ts"]
