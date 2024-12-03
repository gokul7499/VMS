# Use the official Node.js image as the base image
FROM node:20.10.0

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies and build the TypeScript code
RUN npm install && npm build

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Define environment variables

ENV NODE_ENV=development

# Start the application
CMD ["npm", "start"]