const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Path to heroes data file
const HEROES_FILE = path.join(__dirname, '../src/data/superheroes.json');

// Helper: Read heroes from file
function readHeroes() {
  const data = fs.readFileSync(HEROES_FILE, 'utf-8');
  return JSON.parse(data);
}

// Helper: Write heroes to file
function writeHeroes(heroes) {
  fs.writeFileSync(HEROES_FILE, JSON.stringify(heroes, null, 2));
}

// GET /api/heroes - Get all heroes
app.get('/api/heroes', (req, res) => {
  try {
    const heroes = readHeroes();
    res.json(heroes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read heroes' });
  }
});

// GET /api/heroes/:id - Get single hero
app.get('/api/heroes/:id', (req, res) => {
  try {
    const heroes = readHeroes();
    const hero = heroes.find(h => h.id === parseInt(req.params.id));
    if (!hero) {
      return res.status(404).json({ error: 'Hero not found' });
    }
    res.json(hero);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read hero' });
  }
});

// PUT /api/heroes/:id - Update hero
app.put('/api/heroes/:id', (req, res) => {
  try {
    const heroes = readHeroes();
    const index = heroes.findIndex(h => h.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Hero not found' });
    }

    // Merge existing hero with updates
    heroes[index] = { ...heroes[index], ...req.body, id: heroes[index].id };
    writeHeroes(heroes);

    res.json(heroes[index]);
  } catch (error) {
    console.error('Error updating hero:', error);
    res.status(500).json({ error: 'Failed to update hero' });
  }
});

// POST /api/heroes - Create new hero
app.post('/api/heroes', (req, res) => {
  try {
    const heroes = readHeroes();
    const newId = Math.max(...heroes.map(h => h.id)) + 1;
    const newHero = { ...req.body, id: newId };
    heroes.push(newHero);
    writeHeroes(heroes);

    res.status(201).json(newHero);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hero' });
  }
});

// DELETE /api/heroes/:id - Delete hero
app.delete('/api/heroes/:id', (req, res) => {
  try {
    let heroes = readHeroes();
    const index = heroes.findIndex(h => h.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: 'Hero not found' });
    }

    heroes.splice(index, 1);
    writeHeroes(heroes);

    res.json({ message: 'Hero deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete hero' });
  }
});

// POST /api/heroes/bulk - Bulk update heroes
app.post('/api/heroes/bulk', (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, ...changes }
    let heroes = readHeroes();

    updates.forEach(update => {
      const index = heroes.findIndex(h => h.id === update.id);
      if (index !== -1) {
        heroes[index] = { ...heroes[index], ...update };
      }
    });

    writeHeroes(heroes);
    res.json({ message: `Updated ${updates.length} heroes` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk update heroes' });
  }
});

// GET /api/export - Export all heroes as JSON download
app.get('/api/export', (req, res) => {
  try {
    const heroes = readHeroes();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=superheroes-export.json');
    res.json(heroes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export heroes' });
  }
});

// POST /api/import - Import heroes from JSON
app.post('/api/import', (req, res) => {
  try {
    const { heroes } = req.body;
    if (!Array.isArray(heroes)) {
      return res.status(400).json({ error: 'Invalid data format' });
    }
    writeHeroes(heroes);
    res.json({ message: `Imported ${heroes.length} heroes` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to import heroes' });
  }
});

// GET /api/stats - Get statistics
app.get('/api/stats', (req, res) => {
  try {
    const heroes = readHeroes();
    const stats = {
      total: heroes.length,
      byUniverse: {
        Marvel: heroes.filter(h => h.universe === 'Marvel').length,
        DC: heroes.filter(h => h.universe === 'DC').length
      },
      byTier: {
        Cosmic: heroes.filter(h => h.tier === 'Cosmic').length,
        S: heroes.filter(h => h.tier === 'S').length,
        A: heroes.filter(h => h.tier === 'A').length,
        B: heroes.filter(h => h.tier === 'B').length,
        C: heroes.filter(h => h.tier === 'C').length,
        D: heroes.filter(h => h.tier === 'D').length
      }
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.listen(PORT, () => {
  console.log(`HeroRank API Server running on http://localhost:${PORT}`);
  console.log(`Heroes file: ${HEROES_FILE}`);
});
