import express from 'express';
import axios from 'axios';
import cors from 'cors';
import fetch from 'node-fetch';
import cookieParser from 'cookie-parser';
import config from "./config.json" assert { type: "json" };
const { token, clientID, clientSecret, redirectURI } = config;

const app = express();
app.use(cookieParser());
app.use(cors());

app.get('/login', (req, res) => {
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=identify%20email%20guilds`;
    res.redirect(discordAuthUrl);
});

app.get('/user/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const response = await axios.get(`https://discord.com/api/v10/users/${userId}`, {
            headers: {
                Authorization: `Bot ${token}`
            }
        });

        const user = response.data;
        res.json({
            avatarUrl: user.avatar ? `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png` : null,
            bannerUrl: user.banner ? `https://cdn.discordapp.com/banners/${userId}/${user.banner}.png` : null,
            nickname: user.username
        });
    } catch (error) {
        console.error('Erro ao pegar o avatar:', error);
        res.status(500).json({ message: 'Erro ao pegar o avatar.' });
    }
});


app.get('/get-guilds', (req, res) => {
    const accessToken = req.query.token;

    fetch('https://discord.com/api/users/@me/guilds', {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
    .then(response => response.json())
    .then(data => res.json(data))
    .catch(error => {
        console.error('Erro ao buscar servidores:', error);
        res.status(500).send('Erro ao buscar servidores');
    });
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) {
        return res.status(400).send('Error: No code provided');
    }

    try {
        const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
            client_id: clientID,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectURI,
        }).toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const { access_token } = tokenResponse.data;

        const userResponse = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResponse.data;

        res.cookie('user', JSON.stringify(user), { maxAge: 900000, httpOnly: true });
        res.redirect(`http://localhost:3000/login?user=${encodeURIComponent(JSON.stringify(user))}`);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).send('Error fetching user data');
    }
});

app.listen(3001);
console.log("API ligado")
