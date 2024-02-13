FROM node:20.11-alpine3.18
WORKDIR /usr/src/app
COPY . .
RUN npm install

RUN apk add --no-cache gettext
RUN mv public/ads.js public/ads.js.template
CMD /bin/sh -c "envsubst < public/ads.js.template > public/ads.js && npm start"

EXPOSE 3000
