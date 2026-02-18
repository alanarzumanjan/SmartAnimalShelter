FROM cloudflare/cloudflared:latest

COPY .cloudflared /etc/cloudflared

CMD ["tunnel", "--config", "/etc/cloudflared/config.yml", "run"]