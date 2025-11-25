const express = require('express');
const router = express.Router();
const { 
  getAllTickets, 
  getTicketMessages, 
  updateTicketStatus 
} = require('../services/ticketService');

/**
 * GET /api/tickets
 * Get all tickets with message counts
 */
router.get('/', async (req, res) => {
  try {
    const tickets = await getAllTickets();
    res.json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tickets/:id/messages
 * Get all messages for a specific ticket
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const messages = await getTicketMessages(id);
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/tickets/:id
 * Update ticket status and is_fixed flag
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, is_fixed } = req.body;
    
    if (!status && is_fixed === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Must provide status or is_fixed' 
      });
    }

    const currentTicket = await updateTicketStatus(
      id, 
      status || 'open', 
      is_fixed !== undefined ? is_fixed : false
    );
    
    res.json({ success: true, data: currentTicket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
