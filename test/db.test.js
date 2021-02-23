import db from '../src/db.js';

const host = process.env.MYSQL_HOST
const port = process.env.MYSQL_PORT
const user = process.env.MYSQL_USER
const password = process.env.MYSQL_PASSWORD
const database = process.env.MYSQL_DATABASE

test('Get db wrapper', async () => {

    expect(await db.makeDB(host, port, user, password, database)).toBeDefined();

    const dbConnection = await db.makeDB(host, port, user, password, database);

    expect(dbConnection).toHaveProperty('query');
    expect(dbConnection).toHaveProperty('close');

    expect(await dbConnection.close());
    // expect(client).toHaveProperty('authOptions.storage');
});

test('Directus query', async () => {
    // jest.mock('axios');

    const dbConnection = await db.makeDB(host, port, user, password, database);

    // const client = await directus.getClient(directusUrl, directusProject, directusEmail, directusPass);
    const files = await directus.getPendingFiles(dbConnection);
    console.log(files);

    // console.log(files);

    // expect(client).toHaveProperty('authOptions.storage');
});