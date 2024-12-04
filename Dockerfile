# development stage
FROM node:18 AS dev

# Set working directory inside the container
ENV DIR /app
WORKDIR $DIR

# Set environment variable to development
ENV NODE_ENV=development

# Copy package.json, tsconfig.json, and install dependencies
COPY package*.json $DIR
COPY tsconfig*.json $DIR
RUN npm install

# Copy source code
COPY src $DIR/src

# Compile TypeScript files to JavaScript
RUN npm run build

# Expose the port the app will run on
EXPOSE 8000

# Command to run the app in development mode using npm script
CMD ["npm", "run", "start"]
