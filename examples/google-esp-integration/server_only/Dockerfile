FROM node:14.17.3-alpine3.11
WORKDIR /usr/src/app
COPY . .
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]