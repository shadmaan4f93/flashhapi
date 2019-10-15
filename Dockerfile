FROM node:8

EXPOSE 3005
EXPOSE 3012
EXPOSE 3002
EXPOSE 3203
EXPOSE 3103
EXPOSE 6379

WORKDIR /home/dev/api-dev
COPY ./ /home/dev/api-dev
RUN npm install
CMD [ "npm", "start" ]
