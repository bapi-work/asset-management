FROM node:22-alpine

WORKDIR /app

# Install dependencies
COPY server/package.json server/package-lock.json* ./
RUN npm install --production

# Copy application files
COPY server/ ./

# Create necessary directories
RUN mkdir -p scripts logs

# Set environment variables for auto-initialization
ENV NODE_ENV=production
ENV AUTO_INIT_DB=true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 5000) + '/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Expose port
EXPOSE 5000

# Start application
CMD ["node", "server.js"]
