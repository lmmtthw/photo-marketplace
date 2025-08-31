function ensureAuthed(req, res, next) {
if (req.session && req.session.user) return next();
return res.status(401).json({ error: 'Not logged in' });
}


function ensurePhotographer(req, res, next) {
if (req.session?.user?.role === 'photographer') return next();
return res.status(403).json({ error: 'Photographer only' });
}


module.exports = { ensureAuthed, ensurePhotographer };