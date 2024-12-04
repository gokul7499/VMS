# development stage
FROM node:18 AS dev
 
# Set working directory inside the container
ENV DIR /app
WORKDIR $DIR
 
# Set environment variable to development
ENV NODE_ENV=development
 
# Copy package.json, tsconfig.json and source code to the container
COPY package*.json $DIR
COPY tsconfig*.json $DIR
COPY src $DIR/src
 
RUN npm install
 
EXPOSE 3000
 
CMD ["npm", "run", "dev"]