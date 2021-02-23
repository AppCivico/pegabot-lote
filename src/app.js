import pegabotApi from './pegabotApi.js';
import directus from './directus.js';
import csv from 'csv-parser';
import slugify from 'slugify';
import fs from 'fs';

import pkg from 'csv-writer';
import { countReset } from 'console';
const {createObjectCsvWriter} = pkg;

const counters = {
    rows_processed: 0,
    end_event: 0
};

async function processPendingRequest (directusUploadFolder, dbConnection, pendingUserRequest) {
	const fileRow  = await directus.getDirectusFileRow(dbConnection, pendingUserRequest.input_file);
    const fileName = await directus.getDirectusFileName(fileRow, directusUploadFolder);

	const resultCSV = await openResultCSV(fileRow, directusUploadFolder);

    await directus.updateRequestStatus(dbConnection, pendingUserRequest, 'analysing');
    await directus.logProcessProgress (dbConnection, pendingUserRequest, 'Processamento iniciado');

    const readStream = fs.createReadStream(fileName, {encoding: 'utf-8'}).pipe(csv());

    return new Promise((resolve, reject) => {

        readStream.on('data', async (row) => {
            // A execução da request pode demorar
            // Manipulação do "flow" do stream para garantir
            // a execução dessa func até o final, antes da execução do evento de "end"
            readStream.pause();

            const handle = row.perfil || row.Perfil;
            console.info('Buscando handle ' + handle);

            
            const result        = await pegabotApi.getResult(handle);
            const formattedData = await buildCSVResultRow(result);
            
            await resultCSV.writeRecords( [formattedData] );

            counters.rows_processed++;
            if (counters.rows_processed % 50 === 0) await directus.logProcessProgress (dbConnection, pendingUserRequest, 'linhas processadas: ' + counters.rows_processed);

            readStream.resume();
        });

        readStream.on('error', (error) => {
            console.error(error)
            reject(error);
        });

        readStream.on('end', async () => {
            console.info('Salvando arquivo de resultados no banco');
            const outputFile = await directus.saveResultCSV(dbConnection, resultCSV);
    
            console.info('Atualizando status do user_request para "complete"');
            await directus.setUserRequestCompleted(dbConnection, pendingUserRequest, outputFile.insertId);
        
            await directus.logProcessProgress (dbConnection, pendingUserRequest, 'Processamento finalizado');
    
            console.info('Fechando conexão com o banco');
            await dbConnection.awaitEnd();
    
            resolve('completed');
        });
    });
    
}

async function openResultCSV (fileRow, directusUploadFolder) {
    console.log('Abrindo CSV de resultados');
    const fileName = slugify(fileRow.title) + '-resultados.csv';
    const filePath = directusUploadFolder + fileName;

	const writer = createObjectCsvWriter({
		path: filePath,
		header: [
			{ id: 'handle',          title: 'Perfil Twitter' },
			{ id: 'err',             title: 'Mensagem de Erro' },
			{ id: 'bot_probability', title: 'Análise Total' },
			{ id: 'user_index',      title: 'Análise Usuário' },
			{ id: 'friend_index',    title: 'Análise Amigos' },
			{ id: 'temporal_index',  title: 'Análise Temporal' },
			{ id: 'network_index',   title: 'Análise Rede' },
			{ id: 'sentiment_index', title: 'Análise Sentimento' },
			{ id: 'url',             title: 'URL do Perfil' },
			{ id: 'avatar',          title: 'Avatar do Perfil' },
			{ id: 'user_id',         title: 'ID do Usuário' },
			{ id: 'user_name',       title: 'Nome do Usuário' },
			{ id: 'following',       title: 'Seguindo' },
			{ id: 'followers',       title: 'Seguidores' },
			{ id: 'tweet_count',     title: 'Número de Tweets' },
			{ id: 'hashtags',        title: 'Hashtags Recentes' },
			{ id: 'mentions',        title: 'Menções Recentes' },
			{ id: 'cached',          title: 'Usou Cache' }
		]
	});

    writer.fileName = fileName;
    writer.filePath = filePath;

	return writer
}

async function buildCSVResultRow (response) {
    const row = {};

    if (response.error) {
        row.handle = response.searchParams.profile;
        row.err = response.msg;
    }
    else {
        const profile = response.profiles[0];

        row.handle          = profile.username,
        row.bot_probability = profile.bot_probability.all,
        row.user_index      = profile.language_independent.user,
        row.friend_index    = profile.language_independent.friend,
        row.temporal_index  = profile.language_independent.temporal,
        row.network_index   = profile.language_independent.network,
        row.sentiment_index = profile.language_dependent.sentiment.value,
        row.url             = profile.url,
        row.avatar          = profile.avatar,
    
        row.following   = response.twitter_data.following,
        row.followers   = response.twitter_data.followers,
        row.tweet_count = response.twitter_data.number_tweets,
        row.hashtags    = response.twitter_data.hashtags,
        row.mentions    = response.twitter_data.mentions,
        row.cached      = response.twitter_data.usedCache ? 'sim' : 'não'
    }

	return row;
}

function sleep(millis) {
    return new Promise(resolve => setTimeout(resolve, millis));
}

export default {
    processPendingRequest,
    sleep
}