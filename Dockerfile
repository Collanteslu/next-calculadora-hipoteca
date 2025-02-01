FROM node:18-alpine

WORKDIR /app

# Install Prisma dependencies
RUN apk add --no-cache openssl

RUN npm install

COPY . .


# Build the application
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["npm", "start"]