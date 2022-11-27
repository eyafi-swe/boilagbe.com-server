const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
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
        const productCollection = client.db("boilagbedb").collection("products");
        const bookingCollection = client.db("boilagbedb").collection("bookings");
        const paymentCollection = client.db("boilagbedb").collection("payments");
        const blogsCollection = client.db("boilagbedb").collection("blogs");

        const verifySeller = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);

            if (user?.accountType !== 'Seller') {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next();
        }


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
            res.send({ alreadyStored: true });
        });

        app.get('/admin/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const accountType = user?.accountType;
            res.send({ accountType });
        })

        app.post('/products', verifyJWT, verifySeller, async (req, res) => {
            const product = req.body;
            const date = new Date();
            const options = {
                weekday: "long", year: "numeric", month: "short",
                day: "numeric", hour: "2-digit", minute: "2-digit"
            };
            const formatedDateTime = date.toLocaleTimeString("en-us", options);
            product.postTime = formatedDateTime;
            const result = await productCollection.insertOne(product);
            res.send(result);
        })

        app.put('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    advertisement: 'Advertised'
                }
            }
            const result = await productCollection.updateOne(filter, updatedDoc, options);
            res.send(result);
        });

        app.delete('/products/:id', verifyJWT, verifySeller, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await productCollection.deleteOne(filter);
            res.send(result);
        })

        app.get('/products', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const allProducts = await productCollection.find(query).toArray();
            res.send(allProducts);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const result = await productCollection.find(query).toArray();
            const unsoldProducts = result.filter(res=> res?.status !== 'Sold');
            console.log(unsoldProducts);

            res.send(unsoldProducts);
        })

        app.get('/advertised', async (req, res) => {
            const query = { advertisement: 'Advertised' };
            const advertisedProducts = await productCollection.find(query).toArray();
            const unsoldProducts = advertisedProducts.filter(res=> res?.status !== 'Sold');
            res.send(unsoldProducts);
        })


        app.post('/booking', async(req,res)=>{
            const book = req.body;
            const result = await bookingCollection.insertOne(book);
            res.send(result);
        })

        app.get('/booking',verifyJWT,async(req,res)=>{
            const email = req.query.email;
            const query = {buyerEmail:email};
            const myOrders = await bookingCollection.find(query).toArray();
            res.send(myOrders);
        })

        app.get('/booking/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {
                _id:ObjectId(id)
            };
            const booking = await bookingCollection.findOne(query);
            res.send(booking);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const booking = req.body;
            const price = booking.sellingPrice;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ]
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payments', async (req, res) =>{
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.bookingId
            const filter = {_id: ObjectId(id)}
            const updatedDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updatedResult = await bookingCollection.updateOne(filter, updatedDoc);
            const productId = payment.productId;
            const filterProduct = {_id:ObjectId(productId)};
            const updateStatus = {
                $set:{
                    status:'Sold',
                }
            }
            const updatedProduct = await productCollection.updateOne(filterProduct,updateStatus);
            res.send(result);
        })

        app.get('/blogs', async(req,res)=>{
            const query = {};
            const result = await blogsCollection.find(query).toArray();
            res.send(result);
        })

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