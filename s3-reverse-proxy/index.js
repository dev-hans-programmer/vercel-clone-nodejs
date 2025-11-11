const express = require('express');
const app = express();
const httpProxy = require('http-proxy');

const PORT = 8000;

const proxy = httpProxy.createProxy();
const BASE_PATH = 'https://vercel-nodejs.s3.us-east-1.amazonaws.com/__output';

app.use((req, res) => {
   const hostname = req.hostname;
   const subdomain = hostname.split('.')[0];

   const resolvesTo = `${BASE_PATH}/${subdomain}`;

   return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});

// automatically include index.html
proxy.on('proxyReq', (proxyReq, req, res) => {
   const url = req.url;

   if (url === '/') proxyReq.path += 'index.html';
});

app.listen(PORT, () => console.log(`Reverse proxy running on ${PORT}`));
