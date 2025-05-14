const axios = require('axios');
const express = require('express');
const app = express();
app.post('/predict-dropout', async (req, res) => {
  try {
   
    const userData = req.body;

    
    const response = await axios.post('http://localhost:5000/predict', userData);

    
    const prediction = response.data.prediction;

    res.json({ prediction: prediction });
  } catch (error) {
    console.error('Error making prediction:', error);
    res.status(500).send('Error making prediction');
  }
});
