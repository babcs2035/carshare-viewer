module.exports = {
  apps: [
    {
      name: 'timescar',
      script: 'export `cat .env` && PORT=3200 node .next/standalone/server.js ',
    },
  ],
};
