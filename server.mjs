import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import multer from "multer";
import { fileURLToPath } from "url";
import session from "express-session";
import cookieParser from "cookie-parser";
import { OAuth2Client } from "google-auth-library";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Detect environment
const isElectron = !!process.versions.electron;
let userDataPath = __dirname;

if (isElectron) {
  try {
    const { app: electronApp } = await import('electron');
    userDataPath = electronApp.getPath('userData');
  } catch (e) {
    console.error("Failed to load electron app:", e);
  }
}

const isDev = process.env.NODE_ENV !== 'production';

const dbPath = path.join(userDataPath, 'prompts.db');
const uploadsDir = path.join(userDataPath, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const db = new Database(dbPath);

// Migrations for existing databases
try {
  db.prepare("ALTER TABLE prompts ADD COLUMN is_favorite INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE prompts ADD COLUMN sort_order INTEGER DEFAULT 0").run();
} catch (e) {}
try {
  db.prepare("ALTER TABLE generations ADD COLUMN thumbnail_path TEXT").run();
} catch (e) {}

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER,
    FOREIGN KEY(parent_id) REFERENCES folders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    variables TEXT, -- JSON array of variable indices or objects
    image_path TEXT,
    bg_color TEXT,
    overlay_text TEXT,
    folder_id INTEGER,
    is_fast_prompt INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY(prompt_id, tag_id),
    FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS generations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER,
    image_path TEXT NOT NULL,
    thumbnail_path TEXT,
    params TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
  );
`);

import sharp from "sharp";

const app = express();
export { app as server };
app.set('trust proxy', 1); // Trust the first proxy (nginx)
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(session({
  secret: 'prompt-vault-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    httpOnly: true 
  }
}));

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Note: GEMINI_API_KEY is no longer used here as we switched to OAuth for generation.

const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  `${APP_URL}/auth/callback`
);

// Auth Routes
app.get('/api/auth/google/url', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: 'Google Client ID не настроен в .env' });
  }
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/generative-language.retrieval'
    ],
  });
  res.json({ url });
});

app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    // В реальном приложении токены сохраняются в сессии или БД
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Авторизация успешна. Это окно закроется автоматически.</p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Ошибка авторизации');
  }
});

// Storage for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(uploadsDir));

// API Routes
app.get("/api/folders", (req, res) => {
  const folders = db.prepare("SELECT * FROM folders").all();
  res.json(folders);
});

app.post("/api/folders", (req, res) => {
  const { name, parent_id } = req.body;
  const info = db.prepare("INSERT INTO folders (name, parent_id) VALUES (?, ?)").run(name, parent_id || null);
  res.json({ id: info.lastInsertRowid, name, parent_id });
});

app.delete("/api/folders/:id", (req, res) => {
  db.prepare("DELETE FROM folders WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/prompts", (req, res) => {
  const prompts = db.prepare(`
    SELECT p.*, GROUP_CONCAT(t.name) as tags
    FROM prompts p
    LEFT JOIN prompt_tags pt ON p.id = pt.prompt_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    GROUP BY p.id
    ORDER BY p.sort_order ASC, p.created_at DESC
  `).all();
  
  res.json(prompts.map(p => ({
    ...p,
    variables: JSON.parse(p.variables || '[]'),
    tags: p.tags ? p.tags.split(',') : [],
    is_fast_prompt: !!p.is_fast_prompt,
    is_favorite: !!p.is_favorite
  })));
});

app.post("/api/prompts", upload.single('image'), (req, res) => {
  try {
    const { title, text, variables, bg_color, overlay_text, folder_id, is_fast_prompt, tags } = req.body;
    
    if (!title || !text) {
      return res.status(400).json({ error: 'Заголовок и текст обязательны' });
    }

    const image_path = req.file ? `/uploads/${req.file.filename}` : null;
    
    // Get max sort order
    const maxSort = db.prepare("SELECT MAX(sort_order) as max_sort FROM prompts").get();
    const sort_order = (maxSort.max_sort || 0) + 1;

    const insert = db.prepare(`
      INSERT INTO prompts (title, text, variables, image_path, bg_color, overlay_text, folder_id, is_fast_prompt, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const parsedFolderId = (folder_id && folder_id !== 'null' && folder_id !== 'undefined' && folder_id !== '') 
      ? parseInt(folder_id) 
      : null;

    const info = insert.run(
      title, 
      text, 
      variables || '[]', 
      image_path, 
      bg_color || '#18181b', 
      overlay_text || '', 
      parsedFolderId, 
      is_fast_prompt === 'true' ? 1 : 0,
      sort_order
    );
    
    const promptId = info.lastInsertRowid;
    
    if (tags) {
      try {
        const tagList = JSON.parse(tags);
        if (Array.isArray(tagList)) {
          tagList.forEach((tagName) => {
            let tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
            if (!tag) {
              const tagInfo = db.prepare("INSERT INTO tags (name) VALUES (?)").run(tagName);
              tag = { id: tagInfo.lastInsertRowid };
            }
            db.prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)").run(promptId, tag.id);
          });
        }
      } catch (e) {
        console.error('Error parsing tags:', e);
      }
    }
    
    res.json({ id: promptId });
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера при сохранении промта' });
  }
});

app.put("/api/prompts/reorder", (req, res) => {
  const { promptIds } = req.body;
  const update = db.prepare("UPDATE prompts SET sort_order = ? WHERE id = ?");
  const transaction = db.transaction((ids) => {
    ids.forEach((id, index) => {
      update.run(index, id);
    });
  });
  transaction(promptIds);
  res.json({ success: true });
});

app.post("/api/prompts/:id/favorite", (req, res) => {
  const { is_favorite } = req.body;
  db.prepare("UPDATE prompts SET is_favorite = ? WHERE id = ?").run(is_favorite ? 1 : 0, req.params.id);
  res.json({ success: true });
});

app.put("/api/prompts/:id", upload.single('image'), (req, res) => {
  try {
    const { title, text, variables, bg_color, overlay_text, folder_id, is_fast_prompt, tags } = req.body;
    const promptId = req.params.id;

    let updateQuery = "UPDATE prompts SET title = ?, text = ?, variables = ?, bg_color = ?, overlay_text = ?, folder_id = ?, is_fast_prompt = ?";
    const params = [
      title, 
      text, 
      variables || '[]', 
      bg_color || '#18181b', 
      overlay_text || '', 
      (folder_id && folder_id !== 'null') ? parseInt(folder_id) : null, 
      is_fast_prompt === 'true' ? 1 : 0
    ];

    if (req.file) {
      updateQuery += ", image_path = ?";
      params.push(`/uploads/${req.file.filename}`);
    }

    updateQuery += " WHERE id = ?";
    params.push(promptId);

    db.prepare(updateQuery).run(...params);

    if (tags) {
      const tagList = JSON.parse(tags);
      db.prepare("DELETE FROM prompt_tags WHERE prompt_id = ?").run(promptId);
      if (Array.isArray(tagList)) {
        tagList.forEach((tagName) => {
          let tag = db.prepare("SELECT id FROM tags WHERE name = ?").get(tagName);
          if (!tag) {
            const tagInfo = db.prepare("INSERT INTO tags (name) VALUES (?)").run(tagName);
            tag = { id: tagInfo.lastInsertRowid };
          }
          db.prepare("INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)").run(promptId, tag.id);
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Ошибка при обновлении промта' });
  }
});

app.delete("/api/prompts/:id", (req, res) => {
  db.prepare("DELETE FROM prompts WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

app.get("/api/generations", (req, res) => {
  const gens = db.prepare("SELECT * FROM generations ORDER BY created_at DESC").all();
  res.json(gens.map(g => ({ ...g, params: JSON.parse(g.params || '{}') })));
});

app.post("/api/generations", async (req, res) => {
  try {
    const { prompt_id, image_data, params } = req.body;
    
    if (!image_data) {
      return res.status(400).json({ error: 'Данные изображения отсутствуют' });
    }

    // Save base64 image
    // More robust regex to handle different mime types
    const matches = image_data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Неверный формат данных изображения' });
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const extension = mimeType.split('/')[1] || 'png';
    const filename = `gen-${Date.now()}.${extension}`;
    const filepath = path.join(uploadsDir, filename);
    
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    // Create thumbnail
    const thumbFilename = `thumb-${Date.now()}.webp`;
    const thumbFilepath = path.join(uploadsDir, thumbFilename);
    await sharp(buffer)
      .resize(400, 400, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(thumbFilepath);

    const image_path = `/uploads/${filename}`;
    const thumbnail_path = `/uploads/${thumbFilename}`;
    const info = db.prepare("INSERT INTO generations (prompt_id, image_path, thumbnail_path, params) VALUES (?, ?, ?, ?)")
      .run(prompt_id, image_path, thumbnail_path, JSON.stringify(params));
      
    res.json({ id: info.lastInsertRowid, image_path, thumbnail_path });
  } catch (error) {
    console.error('Error saving generation:', error);
    res.status(500).json({ error: 'Ошибка при сохранении сгенерированного изображения' });
  }
});

app.delete("/api/generations/:id", (req, res) => {
  try {
    const gen = db.prepare("SELECT image_path FROM generations WHERE id = ?").get(req.params.id);
    if (gen) {
      const filename = path.basename(gen.image_path);
      const fullPath = path.join(uploadsDir, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    db.prepare("DELETE FROM generations WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation:', error);
    res.status(500).json({ error: 'Ошибка при удалении генерации' });
  }
});

// Global API error handler
app.use('/api', (err, req, res, next) => {
  console.error('API Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Внутренняя ошибка сервера',
    details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

// Vite middleware for development
if (isDev) {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, '..', 'dist')));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, '..', 'dist', 'index.html'));
    });
  }
}

if (isDev) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
