FROM node:16

WORKDIR /service

COPY package*.json ./

RUN npm install -g npm@8.11.0 && npm i core-util-is && npm install

EXPOSE $PORT 3001

COPY config/default.json.sample config/default.json

COPY . /service
RUN chmod +x bootstrap.sh

# bootstarp the application
ENTRYPOINT ["/service/bootstrap.sh"]