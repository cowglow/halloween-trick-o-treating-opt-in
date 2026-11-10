FROM node:22
WORKDIR /app
COPY . /app
RUN corepack enable
