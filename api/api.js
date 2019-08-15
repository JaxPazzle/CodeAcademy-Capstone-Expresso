const express = require('express');
const apiRouter = express.Router();

const employeeRouter = require('./employees.js');
apiRouter.use('/employees', employeeRouter);

const menuRouter = require('./menus.js');
apiRouter.use('/menus', menuRouter);

module.exports = apiRouter;