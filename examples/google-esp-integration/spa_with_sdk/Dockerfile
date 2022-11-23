FROM node:14.17.3-alpine3.11 AS BUILD
COPY . .
RUN npm install
RUN npm run uid2-examples

FROM node:14.17.3-alpine3.11
WORKDIR /usr/src/app
COPY ./examples/google-esp-integration/spa_with_sdk .
COPY --from=build /dist/ ./public/js/
RUN npm install

EXPOSE 3000
CMD [ "npm", "start" ]
