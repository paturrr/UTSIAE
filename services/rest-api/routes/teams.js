const express = require('express');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory team database (aligned with data in auth.js)
let teams = [
  { id: 't1', name: 'Alpha Team', members: ['1', '2'] }, // '1' and '2' match IDs in global.users
];

// GET /api/teams - Retrieve all teams
router.get('/', (req, res) => {
  // Later this endpoint can be protected by the Gateway.
  // Example: filter teams by user ID from the token
  // const userId = req.headers['x-user-id']; 
  
  // For now return every team
  res.json(teams);
});

// POST /api/teams - Create a new team
router.post('/', (req, res) => {
  const { name } = req.body;
  // Later we can grab the creator ID from headers:
  // const userId = req.headers['x-user-id']; 

  if (!name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const newTeam = {
    id: uuidv4(),
    name,
    members: [/* userId */] // Otomatis tambahkan pembuatnya nanti
  };

  teams.push(newTeam);
  res.status(201).json(newTeam);
});

// Additional endpoints can be added later:
// GET /api/teams/:id - Get a single team
// POST /api/teams/:id/members - Add a member

module.exports = router;
