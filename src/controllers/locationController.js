const axios = require('axios');

const getProvinces = async (req, res) => {
  try {
    const response = await axios.get('https://provinces.open-api.vn/api/p/');
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching provinces:", error);
    res.status(500).json({ message: "Error fetching provinces", error: error.message });
  }
};

const getDistricts = async (req, res) => {
  const { provinceId } = req.params;
  try {
    const response = await axios.get(`https://provinces.open-api.vn/api/d/search/?p=${provinceId}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({ message: "Error fetching districts", error: error.message });
  }
};

const getWards = async (req, res) => {
  const { districtId } = req.params;
  try {
    const response = await axios.get(`https://provinces.open-api.vn/api/w/search/?d=${districtId}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching wards:", error);
    res.status(500).json({ message: "Error fetching wards", error: error.message });
  }
};


module.exports = {
  getProvinces,
  getDistricts,
  getWards,
};
