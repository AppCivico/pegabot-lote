FROM node:14.4.0

WORKDIR /home/node/app

COPY package.json package-lock.json* ./

RUN yarn install && yarn global add pm2 && yarn cache clean

COPY . .

CMD [ "pm2-runtime", "yarn run start" ]



