const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db.js');
const secretKey = require('../secretkey/secretkey.js');
const authenticateToken = require('../authenticator/authentication.js');

router.post('/user/register', async (req, res) => {
    try{
            
        const {name, username, role_id, password} = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const checkUserQuery = 'SELECT * FROM users WHERE username = ?';
        const [existingUser ] = await db.promise().execute(checkUserQuery, [username]);

        if (existingUser .length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const insertUserQuery = 'INSERT INTO users (name, username, role_id, password, ucreation_date) VALUES (?, ?, ?, ?, DATE_FORMAT(NOW(), "%m-%d-%Y %h:%i %p"))';
        await db.promise().execute(insertUserQuery, [name, username, role_id, hashedPassword]);

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/user/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const getUserQuery = `
            SELECT u.*, r.rolename
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.username = ?
        `;
        const [rows] = await db.promise().execute(getUserQuery, [username]);

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const user = rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                name: user.name,
                role_id: user.role_id,
                rolename: user.rolename
            },
            secretKey,
            { expiresIn: '10h' }
        );
        res.status(200).json({ token, role: user.rolename });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/users', authenticateToken, async (req, res) => {
    try {

        db.query('SELECT user_id, role_id, name, username, ucreation_date FROM users ORDER BY ucreation_date DESC', (err, result) => {

            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });

    } catch (error) {

        console.error('Error loading users:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/user/:id', authenticateToken, async (req, res) => {
    
    let user_id = req.params.id;

    if (!user_id) {
        return req.status(400).send({ error: true, message: 'Please provide user_id' });  
    }

    try {

        db.query('SELECT user_id, role_id, name, username, password, ucreation_date FROM users WHERE user_id = ?', user_id, (err, result) => {

            if (err) {
                console.error('Error fetching items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });

    } catch (error) {

        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/user/:id', authenticateToken, async (req, res) => {

    let user_id = req.params.id;

    const {name, username, role_id, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    if (!user_id || !name || !username || !role_id || !password) {
        return req.status(400).send({ error: user, message: 'Please provide name, username, role_id and password' });  
    }

    try {

        const checkUserQuery = 'SELECT * FROM users WHERE username = ? AND user_id != ?';
        const [existingUser ] = await db.promise().execute(checkUserQuery, [username, user_id]);

        if (existingUser .length > 0) {
            return res.status(409).json({ message: 'Username already exists' });
        }

        const updateUserQuery = 'UPDATE users SET name = ?, username = ?, password = ?, role_id =?, ucreation_date = DATE_FORMAT(NOW(), "%m-%d-%Y %h:%i %p") WHERE user_id = ?';
        await db.promise().execute(updateUserQuery, [name, username, hashedPassword, role_id, user_id]);

        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }   
});

router.delete('/user/:id', authenticateToken, async (req, res) => {
    
    let user_id = req.params.id;

    if (!user_id) {
        return res.status(400).send({ error: true, message: 'Please provide user_id' });  
    }

    try {

        db.query('DELETE FROM users WHERE user_id = ?', user_id, (err, result, fields) => {

            if (err) {
                console.error('Error deleting items:', err);
                res.status(500).json({ message: 'Internal Server Error' });
            } else {
                res.status(200).json(result);
            }
        });

    } catch (error) {

        console.error('Error loading user:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
