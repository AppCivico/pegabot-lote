import dotenv from 'dotenv';
dotenv.config();

import db from './db.js';
import app from './app.js';

// mysql envs
const MYSQL_HOST     = process.env.MYSQL_HOST;
const MYSQL_PORT     = process.env.MYSQL_PORT;
const MYSQL_USER     = process.env.MYSQL_USER;
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD;
const MYSQL_DATABASE = process.env.MYSQL_DATABASE;

// Directus envs
const DIRECTUS_UPLOAD_FOLDER = process.env.DIRECTUS_UPLOAD_FOLDER;

async function processQueue () {
    const dbConnection          = db.makeDB(MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE);
    const processingUserRequest = await dbConnection.awaitQuery( "SELECT * FROM user_requests WHERE status = 'analysing' ORDER BY created_on ASC LIMIT 1" );
    const pendingUserRequest    = await dbConnection.awaitQuery( "SELECT * FROM user_requests WHERE status = 'waiting' ORDER BY created_on DESC LIMIT 1" );

    if (processingUserRequest[0]) {
        console.info(`Já havia um user_request sendo processado id=${processingUserRequest[0].id}, continuando...`);
        await app.processPendingRequest(DIRECTUS_UPLOAD_FOLDER, dbConnection, processingUserRequest[0]);
        await processQueue();
    }
    else if (pendingUserRequest[0]) {
        console.info(`Iniciando processamento de um user_request, id=${pendingUserRequest[0].id}`);
        await app.processPendingRequest(DIRECTUS_UPLOAD_FOLDER, dbConnection, pendingUserRequest[0]);
        await processQueue();
    }
    else {
        console.info('Sem arquivos com status "waiting" na fila, dormindo por 10000ms');

        await dbConnection.awaitEnd();
        await app.sleep(10000); // Custom sleep function, cuz that's JS for you...
        await processQueue();
    }
}

processQueue();
