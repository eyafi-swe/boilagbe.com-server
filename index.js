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


function verifyJWT(req, res, next) {

    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthorized access');
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

const run = async () => {
    try {

        const categoriesCollection = client.db("boilagbedb").collection("categories");
        const userCollection = client.db("boilagbedb").collection("users");
        app.get('/admin/categories', async (req, res) => {
            const query = {};
            const cursor = categoriesCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })
        });


        app.post('/admin/users', async (req, res) => {
            const user = req.body;
            const email = user.email;
            console.log(user);
            const query = { email: email };
            const foundUser = await userCollection.findOne(query);
            if (!foundUser) {

                const result = await userCollection.insertOne(user);
                return res.send(result);
            }
            res.send({alreadyStored:true});
        });

    } finally {

    }
}

run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Boilagbe server running!')
})



app.listen(port, () => {
    console.log(`Boilagbe server listening on port ${port}`)
})