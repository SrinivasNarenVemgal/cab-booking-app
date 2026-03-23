# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .

ARG REACT_APP_API_URL=http://localhost/api
ARG REACT_APP_SOCKET_URL=http://localhost
ARG REACT_APP_STRIPE_PUBLIC_KEY=pk_test_placeholder
ENV VITE_API_URL=$REACT_APP_API_URL
ENV VITE_SOCKET_URL=$REACT_APP_SOCKET_URL
ENV VITE_STRIPE_PUBLIC_KEY=$REACT_APP_STRIPE_PUBLIC_KEY

RUN npm run build

# ─── Stage 2: Serve with Nginx ─────────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
