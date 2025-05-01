require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const app = express();

const PORT = process.env.PORT || 3000;

const SECRET_BEARER_TOKEN = process.env.SECRET_BEARER_TOKEN;


if (!SECRET_BEARER_TOKEN) {
    console.error("FATAL ERROR: AUTH_USER and AUTH_PASSWORD enviroment variables must be set");
    process.exit(1);
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

const bearerTokenMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: 'Authentication required.' });
    }

    const parts = authHeader.split(' ');
    console.log(parts);

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Invalid authentication type or format. Use "Bearer <token>".' });
    }

    const providedToken = parts[1];

    if (providedToken === SECRET_BEARER_TOKEN) {
        console.log('Bearer token authentication successful.');
        next();
    } else {
        console.warn('Bearer token authentication failed: Invalid token provided.');
        return res.status(401).json({ message: 'Invalid authentication token.' });
    }
};

app.use('/items', bearerTokenMiddleware);
app.use(express.urlencoded());

app.get('/items', async (req, res) => {
    console.log('GET /items request received');
    try {
        const items = await Item.find({});
        res.status(200).json(items);
    } catch(error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ message: 'Error fetching items from database', error: error.message });
    }
});





app.get('/items/:id', async (req, res) => {
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




app.post('/items', async (req, res) => {
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



app.put('/items/:id', async (req, res) => {
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




app.delete('/items/:id', async (req, res) => {
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