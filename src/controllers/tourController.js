const { getTour } = require('../services/tourService');

const mapPriceRange = (priceCategory) => {
  switch (priceCategory) {
    case 'economy':
      return [100000, 1500000];
    case 'moderate':
      return [2000000, 4000000];
    case 'luxury':
      return [5000000, Infinity];
    default:
      throw new Error('Invalid price category');
  }
};

const getFilteredTours = async (req, res) => {
    try {
      const { tourTypeId, startDate, endDate, priceCategory, serviceType, province } = req.query;
  
      if (!tourTypeId || !startDate || !endDate || !priceCategory || !serviceType || !province) {
        return res.status(400).json({
          message: 'Missing required filters: tourTypeId, startDate, endDate, priceCategory, serviceType, province',
        });
      }
  
      // Map price range
      const [minPrice, maxPrice] = mapPriceRange(priceCategory);
  
      const filters = {
        tourTypeId: parseInt(tourTypeId, 10),
        startDate,
        endDate,
        minPrice,
        maxPrice,
        serviceType,
        province,
      };
  
      const tours = await getFilteredTours(filters);
      res.status(200).json({ tours });
    } catch (error) {
      console.error('Error fetching filtered tours:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };

module.exports = {getFilteredTours};
