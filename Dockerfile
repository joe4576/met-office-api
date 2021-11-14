FROM node:16

# Create app directory
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --include-dev

COPY . .

RUN tsc

EXPOSE 8080

CMD [ "node", "dist/main.js" ]