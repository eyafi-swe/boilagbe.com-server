const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bz2bbta.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {

        const categoriesCollection = client.db("boilagbedb").collection("categories");

        app.get('/admin/categories', async(req,res)=>{
            const query = {};
            const cursor = categoriesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })


    }finally {

    }
}

run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Boilagbe server running!')
})



app.listen(port, () => {
    console.log(`Boilagbe server listening on port ${port}`)
})