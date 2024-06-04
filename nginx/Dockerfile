# Use the official NGINX image as the base image
FROM nginx

# Remove the default NGINX configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates from the host to the container
COPY letsencrypt /etc/letsencrypt

# Expose the ports your NGINX server will listen on
EXPOSE 80
EXPOSE 443