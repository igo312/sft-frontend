const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@components': path.resolve(__dirname, 'src/components'),
      '@external': path.resolve(__dirname, 'src/external'),
    },
  },
};