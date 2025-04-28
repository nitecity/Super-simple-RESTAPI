const express = require('express');
const bodyParser = require('body-parser');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

let items = [
    {id: 1, name: 'Example Item 1'},
    {id: 2, name: 'Example Item 2'},
];

let nextId = 3;

app.get('/items/', (req, res) => {
    console.log('GET /items request received');
    res.status(200).json(items);
});

app.get('/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    console.log(`GET /items/${itemId} request received`);

    const item = items.find(i => i.id === itemId);

    if (item) {
        res.status(200).json(item);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.post('/items', (req, res) => {
    console.log('POST /items request received with body:', req.body);
    const newItemName = req.body.name;

    if(!newItemName) {
        return res.status(400).json({ messgae: 'Item name is required' });
    }

    const newItem = {
        id: nextId++,
        name: newItemName
    };

    items.push(newItem);
    res.status(201).json(newItem);
});

app.put('/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    console.log(`PUT /items/${itemId} request received with body:`, req.body);
    const updatedName = req.body.name;

    if (!updatedName) {
        return res.status(400).json({ message: 'Item name is required for update' });
    }

    const itemIndex = items.findIndex(i => i.id === itemId);

    if(itemIndex !== -1) {
        items[itemIndex].name = updatedName;
        res.status(200).json(items[itemIndex]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.delete('/items/:id', (req, res) => {
    const itemId = parseInt(req.params.id, 10);
    console.log(`DELETE /items/${itemId} request received`);

    const itemIndex = items.findIndex(i => i.id === itemId);

    if(itemIndex !== -1) {
        const deletedItem = items.splice(itemIndex, 1);
        res.status(200).json({ message: `Item with ID ${itemId} deleted successfully`, deletedItem: deletedItem[0] });
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});