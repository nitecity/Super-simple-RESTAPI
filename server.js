require('dotenv').config();

const CryptoJS = require('crypto-js');
const express = require('express');
const mongoose = require('mongoose');
const app = express();

const path = '/items';
const PORT = process.env.PORT || 3000;

const SECRET_BEARER_TOKEN = process.env.SECRET_BEARER_TOKEN;

const client_credentials = {
    api_key: process.env.API_KEY,
    secret: process.env.SECRET
}

app.use(express.json());

const dbURI = process.env.MONGODB_URI;

if(!dbURI) {
    console.error('Error: MONGODB_URI is not defined in the .env file.');
    process.exit(1);
}

mongoose.connect(dbURI)
    .then( () => console.log('MongoDB connected successfully'))
    .catch( err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'MongoDB connection error during runtime:'));
db.once('open', () => {
    console.log("we're connected to the database!");
});

db.on('disconnected', () => {
    console.log('MongoDB disconnected');
});

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
    },
}, {timestamps: true});

const Item = mongoose.model('Item', itemSchema);

function check_signature(headers, res, next){

    if (headers.api_key !== client_credentials.api_key) {
        console.log('Invalid Credential');
        return res.status(401).json({ message: "Invalid Credential" });
    }

    if (!headers.body){
        const prehash = headers.method + path + headers.ts;
        const hmac = CryptoJS.HmacSHA256(prehash, client_credentials.secret);
        const expectedSignature = CryptoJS.enc.Base64.stringify(hmac);
        if (expectedSignature !== headers.signiture) {
            console.log('Signature Failure');
            return res.status(401).json({ message: "Signature Failure" });
        }
        
        console.log('Authentication successful.');
        next();
    } else {

        const prehash = headers.method + path + headers.ts + JSON.stringify(headers.body);
        const hmac = CryptoJS.HmacSHA256(prehash, client_credentials.secret);
        const expectedSignature = CryptoJS.enc.Base64.stringify(hmac);
        if (expectedSignature !== headers.signiture) {
            console.log('Signature Failure');
            return res.status(401).json({ message: "Signature Failure" });
        }
        
        console.log('Authentication successful.');
        next();
    }

    
}

const APICredentials = (req, res, next) => {

    const rdata = req.headers;

    const headers = {
        method:    req.method,
        api_key:   rdata.access_key,
        signiture: rdata.access_sign,
        ts:        rdata.access_timestamp,
        body:      req.body
    }

    check_signature(headers, res, next);

};

app.use(path, APICredentials);
app.use(express.urlencoded());

app.get(path, async (req, res) => {
    console.log('GET /items request received');
    try {
        const items = await Item.find({});
        res.status(200).json(items);
    } catch(error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items from database', error: error.message });
    }
});





app.get(`${path}/:id`, async (req, res) => {
    const {id} = req.params;
    console.log(`GET /items/${id} request received`);

    if(!mongoose.Types.ObjectId.isValid(id)){
        return res.status(400).json({ message: 'Invalid Item ID format'});
    }

    try {
        const item = await Item.findById(id);

        if (item) {
            res.status(200).json(item);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        console.error(`Error fetching item ${id}:`, error);
        res.status(500).json({ message: 'Error fetching item from database', error: error.message });
    }
});




app.post(path, async (req, res) => {
    console.log('POST /items request received with body:', req.body);
    const { name } = req.body;

    if(!name) {
        return res.status(400).json({ message: 'Item name is required in the request body' });
    }

    try {
        const newItem = new Item({ name });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (error) {
        console.error('Error creating item:', error);

        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Error', errors: error.errors} );
        }

        res.status(500).json({ message: 'Error saving item to database', error: error.message});
    }
});



app.put(`${path}/:id`, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    console.log(`PUT /items/${id} request received with body:`, req.body);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid Item ID format' });
    }

    if (!name) {
        return res.status(400).json({ message: 'Item name is required for update' });
    }

    try {
        const updatedItem = await Item.findByIdAndUpdate(
            id,
            { name },
            { new: true, runValidators: true }
        );

        if (updatedItem) {
            res.status(200).json(updatedItem);
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        console.error(`Error updating item ${id}:`, error);
        if (error.name === 'ValidationError') {
            return res.status(400).json( { message: 'Validation Error', errors: error.error });
        }

        res.status(500).json({ message: 'Error updating item in database', error: error.message });
    }
});




app.delete(`${path}/:id`, async (req, res) => {
    const { id } = req.params;
    console.log(`request param is: ${id}`);
    console.log(`DELETE /items/${id} request received`);

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid Item ID format' });
    }

    try {
        const deletedItem = await Item.findByIdAndDelete(id);

        if (deletedItem) {
            res.status(200).json({ message: 'Item deleted successfully', deletedItem });
        } else {
            res.status(404).json({ message: 'Item not found' });
        }
    } catch (error) {
        console.error(`Error deleting item ${id}:`, error);
        res.status(500).json({ message: 'Error deleting item from database', error: error.message });
    }
});










app.use( (err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, ()=> {
    console.log(`Server is running on http://localhost:${PORT}`);
});