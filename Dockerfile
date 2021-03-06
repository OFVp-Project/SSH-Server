# Copy only badvpn image
FROM ghcr.io/ofvp-project/badvpn:latest AS badvpn_prebuilt

# Create (Open)ssh server
FROM debian:latest
LABEL org.opencontainers.image.title="OFVp SSH Server" \
  org.opencontainers.image.description="SSH Server for OFVp" \
  org.opencontainers.image.vendor="ofvp_project" \
  org.opencontainers.image.licenses="GPL-3.0-or-later" \
  org.opencontainers.image.source="https://github.com/OFVp-Project/OpenSSH"

# Copy badvpn
COPY --from=badvpn_prebuilt /usr/bin/badvpn-udpgw /usr/bin/badvpn

# Install core packages
ARG DEBIAN_FRONTEND="noninteractive"
RUN apt update && apt install -y wget curl procps && wget -qO- https://raw.githubusercontent.com/Sirherobrine23/DebianNodejsFiles/main/debianInstall.sh | bash && apt install -y openssh-client --no-install-recommends

# Setup Project
EXPOSE 22/tcp
VOLUME [ "/data" ]
WORKDIR /app
RUN npm i -g pm2
ENTRYPOINT [ "node", "dist/index.js" ]
ENV \
  # MongoDB Server URL
  MONGO_URL="mongodb://localhost:27017/OFVpServer" \
  # Password to decrypt users password
  PASSWORD_ENCRYPT="" \
  # Start BadVPN
  DONTSTARTBADVPN="false" \
  # Show BadVPN logs
  SHOWBADVPNLOGS="false" \
  # Show SSH Port forwarding logs
  SHOWSSHLOGS="true"

# Install Node packages and Transpiller typescript
COPY package*.json ./
RUN npm install --no-save
COPY ./ ./
RUN npm run build
ENV NODE_ENV="production"