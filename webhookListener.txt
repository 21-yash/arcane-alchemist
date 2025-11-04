const express = require('express');
const { handleVoteReward } = require('./utils/voteHandler');

const app = express();
const PORT = process.env.PORT || 3000;
const topggAuthToken = process.env.TOP_GG_AUTH_TOKEN;

app.use(express.json());

function setupRoutes(client) {
    app.post('/dblwebhook', (req, res) => {
        if (req.header('Authorization') !== topggAuthToken) {
            console.warn('[Webhook] Received an unauthorized vote attempt.');
            return res.status(401).send('Unauthorized');
        }

        try {
            const { user } = req.body;

            if (!user) {
                console.warn('[Webhook] Received a vote payload without a user ID.');
                return res.status(400).send('Bad Request: Missing user data.');
            }

            console.log(`[Webhook] Received a valid vote for user: ${user}`);
            handleVoteReward(user, client);

            res.status(200).send('OK');

        } catch (error) {
            console.error('[Webhook] Error processing vote:', error);
            res.status(500).send('Internal Server Error');
        }
    });
}

function startWebhookListener(client) { 
    setupRoutes(client);
    app.listen(PORT, () => {
        console.log(`[Webhook] Vote listener is now active on port ${PORT}.`);
    });
}

module.exports = { startWebhookListener };