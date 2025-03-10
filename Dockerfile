FROM node:lts-alpine

EXPOSE 9090

COPY . .

ENTRYPOINT [ "npm" ]
CMD [ "run" , "server"]