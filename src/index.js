import dotenv from 'dotenv';
dotenv.config();

import db from './db.js';
import app from './app.js';
import mailer from './mailer.js';

// mysql envs
const MYSQL_HOST     = process.env.MYSQL_HOST;
const MYSQL_PORT     = process.env.MYSQL_PORT;
const MYSQL_USER     = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

// Directus envs
const DIRECTUS_UPLOAD_FOLDER = process.env.DIRECTUS_UPLOAD_FOLDER;

// Mailer envs
const EMAIL_USER    = process.env.EMAIL_USER;
const EMAIL_PASS    = process.env.EMAIL_PASS;
const EMAIL_HOST    = process.env.EMAIL_HOST;
const EMAIL_PORT    = process.env.EMAIL_PORT;
const EMAIL_SERVICE = process.env.EMAIL_SERVICE;
const EMAIL_FROM    = process.env.EMAIL_FROM;

async function processQueue () {
    const dbConnection          = db.makeDB(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE);
    const processingUserRequest = await dbConnection.awaitQuery( "SELECT * FROM user_requests WHERE status = 'analysing' ORDER BY created_on ASC LIMIT 1" );
    const pendingUserRequest    = await dbConnection.awaitQuery( "SELECT * FROM user_requests WHERE status = 'waiting' ORDER BY created_on ASC LIMIT 1" );

    const emailTransporter = await mailer.getTransporter(EMAIL_SERVICE, EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS);

    if (processingUserRequest[0] || pendingUserRequest[0]) {

        // Se já existia uma planilha processando, ela toma precedência.
        const userRequest = processingUserRequest[0] || pendingUserRequest[0];

        await app.processPendingRequest(DIRECTUS_UPLOAD_FOLDER, dbConnection, userRequest, emailTransporter, EMAIL_FROM);
        await processQueue();
    }
    else {
        console.info('Sem planilhas para processar, dormindo por 30s');

        await dbConnection.awaitEnd();
        await app.sleep(30000); // Custom sleep function, cuz that's JS for you...
        await processQueue();
    }
}

processQueue();
