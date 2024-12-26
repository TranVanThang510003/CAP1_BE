const sql = require('mssql');
const { connectToDB } = require('../config/db');

const db = {};

// Connect models
db.User = require('./user');
db.Question = require('./question');
db.UserAnswer = require('./userAnswer');
db.Tour = require('./tour');
db.TourPreference = require('./tourPreference');

module.exports = db;
