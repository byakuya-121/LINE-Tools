FROM denoland/deno:alpine-1.40.5

WORKDIR /app

COPY . .

EXPOSE 8080

CMD ["deno", "run", "--allow-all", "bot/server.ts"]
