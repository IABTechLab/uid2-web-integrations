FROM nginx:latest
COPY ./nginx/default.conf.template /etc/nginx/templates/
COPY ./html /usr/share/nginx/html
ARG UID2_BASE_URL=https://global.prod.uidapi.com
ARG UID2_JS_SDK_URL
ENV UID2_BASE_URL=${UID2_BASE_URL}
ENV UID2_JS_SDK_URL=${UID2_JS_SDK_URL}