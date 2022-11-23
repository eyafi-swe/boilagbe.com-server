const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Boilagbe server running!')
})



app.listen(port, () => {
    console.log(`Boilagbe server listening on port ${port}`)
})