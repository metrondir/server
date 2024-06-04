FROM node:20

WORKDIR /app

COPY package*.json ./

RUN npm install --ignore-scripts

COPY . .

CMD ["npm", "run", "dev"]