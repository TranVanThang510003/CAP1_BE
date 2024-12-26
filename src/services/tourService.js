const db = require('../models');

exports.getFilteredTours = async (preferences) => {
  const tours = await db.Tour.findAll({
    where: {
      category: preferences,
    },
  });
  return tours;
};
