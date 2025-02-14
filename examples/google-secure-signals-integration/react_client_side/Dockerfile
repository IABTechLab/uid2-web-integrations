FROM node:20.11.0-alpine3.18

WORKDIR /usr/src/app

COPY . .
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]
