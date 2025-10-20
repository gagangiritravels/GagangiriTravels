const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 5000;
const INVOICES_FILE = path.join(__dirname, 'invoices.json');

// Middleware
app.use(cors()); // Frontend se call karne ki anumati deta hai
app.use(bodyParser.json());

// --- Helper Functions for File Operations ---

// JSON फ़ाइल से सभी इनवॉइस पढ़ें
function getInvoicesFromFile() {
    try {
        if (!fs.existsSync(INVOICES_FILE)) {
            return [];
        }
        const data = fs.readFileSync(INVOICES_FILE, 'utf8');
        // Handle empty file case
        return data.trim() ? JSON.parse(data) : [];
    } catch (error) {
        console.error("Error reading invoice file. Returning empty array.", error.message);
        return [];
    }
}

// JSON फ़ाइल में इनवॉइस लिखें
function saveInvoicesToFile(invoices) {
    try {
        fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 4), 'utf8');
        return true;
    } catch (error) {
        console.error("Error writing invoice file:", error);
        return false;
    }
}

// --- API Endpoints ---

// 1. Save/Update Invoice (POST /api/save-invoice)
app.post('/api/save-invoice', (req, res) => {
    const newInvoice = req.body;
    
    if (!newInvoice || !newInvoice.invoiceNo || !newInvoice.clientName) {
        return res.status(400).json({ success: false, message: 'Invalid invoice data provided.' });
    }

    const invoices = getInvoicesFromFile();
    
    // Server-side ID generation and handling existing invoices
    let existingIndex = invoices.findIndex(inv => inv.invoiceNo === newInvoice.invoiceNo);

    if (existingIndex !== -1) {
        // Update existing record
        invoices[existingIndex] = { ...invoices[existingIndex], ...newInvoice };
        console.log(`Updated Invoice: ${newInvoice.invoiceNo}`);
    } else {
        // New record - assign a unique ID
        const maxId = invoices.reduce((max, inv) => Math.max(max, inv.id || 0), 0);
        newInvoice.id = maxId + 1; 
        invoices.push(newInvoice);
        console.log(`Saved New Invoice: ${newInvoice.invoiceNo}`);
    }

    if (saveInvoicesToFile(invoices)) {
        // Send back the invoice with the assigned/existing ID
        res.status(200).json({ success: true, message: 'Invoice saved successfully!', invoice: newInvoice });
    } else {
        res.status(500).json({ success: false, message: 'Failed to save invoice to file.' });
    }
});

// 2. Fetch All Saved Invoices (GET /api/invoices)
app.get('/api/invoices', (req, res) => {
    const invoices = getInvoicesFromFile();
    res.status(200).json(invoices.map(inv => ({ 
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        date: inv.date,
        clientName: inv.clientName,
        itemsCount: inv.items ? inv.items.length : 0,
        grandTotal: inv.totals ? inv.totals.grandTotal : 0,
        // Optional: Extract specific details for the records table
        services: inv.items ? inv.items.map(item => item.description.split(' ')[0]).filter((v, i, a) => a.indexOf(v) === i).join(', ') : 'N/A',
        allTickets: inv.items ? inv.items.filter(item => item.ticketData).map(item => item.ticketData.ticketNo || 'N/A').filter(Boolean).join(', ') : 'N/A',
        allPnrs: inv.items ? inv.items.filter(item => item.ticketData).map(item => item.ticketData.pnr || 'N/A').filter(Boolean).join(', ') : 'N/A',
        allPassengers: inv.items ? inv.items.filter(item => item.ticketData).flatMap(item => item.ticketData.passengers.map(p => p.name)).filter(Boolean).join(', ') : inv.clientName || 'N/A',
    })));
});

// 3. Fetch Single Invoice (GET /api/invoice/:invoiceNo)
app.get('/api/invoice/:invoiceNo', (req, res) => {
    const invoiceNo = req.params.invoiceNo;
    const invoices = getInvoicesFromFile();
    const invoice = invoices.find(inv => inv.invoiceNo === invoiceNo);

    if (invoice) {
        res.status(200).json(invoice);
    } else {
        res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('API Endpoints: /api/save-invoice, /api/invoices, /api/invoice/:invoiceNo');
});