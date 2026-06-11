const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

cds.on('bootstrap', app => {
    app.use('/webapp', express.static(path.join(__dirname, 'app', 'webapp')));
    app.get('/', (_, res) => res.redirect('/webapp/'));
});

module.exports = cds.server;
