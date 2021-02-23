import mysql from 'mysql-await';

function makeDB( host, port, user, password, database ) {
    const connection = mysql.createConnection({
        host     : host,
        port     : port,
        user     : user,
        password : password,
        database : database
    });

    return connection
}

export default {
    makeDB
}